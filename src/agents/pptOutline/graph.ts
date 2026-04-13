import { END, START, StateGraph } from '@langchain/langgraph'
import {
  clarifiedIntentSchema,
  type ClarifiedIntent,
} from '../outline/schema'
import { askAssistant } from '../../services/ai'
import {
  type DeckPageBase,
  type DeckPageFull,
  formatFinalDeckMarkdown,
  parseDeckPagesJson,
} from '../outline/deckOutline'
import { buildPlaceholderRecallDocument } from './ragPlaceholder'
import { PptOutlineState } from './state'

const MIN_COMBINED_CHARS = 120

function formatIntentBlock(json: string): string {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return '【意图解析失败：JSON 无效】'
  }
  const parsed = clarifiedIntentSchema.safeParse(data)
  if (!parsed.success) return '【意图解析失败】'
  const c = parsed.data
  const lines = [
    `演示目标：${c.presentationGoal}`,
    `受众：${c.targetAudience}`,
    c.durationMinutes != null ? `时长：约 ${c.durationMinutes} 分钟` : null,
    c.pageCountHint ? `页数期望：${c.pageCountHint}` : null,
    c.tone ? `风格：${c.tone}` : null,
    c.mustCover?.length ? `必须覆盖：${c.mustCover.join('；')}` : null,
    c.mustAvoid?.length ? `需要避免：${c.mustAvoid.join('；')}` : null,
    c.additionalInfo ? `补充：${c.additionalInfo}` : null,
  ].filter(Boolean) as string[]
  return lines.join('\n')
}

function materialGateNode(state: typeof PptOutlineState.State) {
  const len = state.combinedDocuments.trim().length
  if (len < MIN_COMBINED_CHARS) {
    return {
      pipeline: 'stop' as const,
      finalOutlineMarkdown:
        '【素材不足】私域文本过短，无法基于真实素材生成可靠故事线与大纲。请补充文档后再试。',
      qualityNotes: '已在门槛处终止。',
    }
  }
  try {
    clarifiedIntentSchema.parse(JSON.parse(state.clarifiedIntentJson))
  } catch {
    return {
      pipeline: 'stop' as const,
      finalOutlineMarkdown: '【参数错误】意图澄清数据无效，请检查表单提交。',
      qualityNotes: 'clarifiedIntentJson 校验失败',
    }
  }
  return { pipeline: 'continue' as const }
}

async function buildStorylineNode(state: typeof PptOutlineState.State) {
  const intentBlock = formatIntentBlock(state.clarifiedIntentJson)
  const docPreview = state.combinedDocuments.slice(0, 14_000)

  const system = [
    '你是演示叙事设计顾问，只输出「故事线 / 大纲骨架」。',
    '要求：用 Markdown，按「幕 / 章 / 节」组织，每节给标题 + 一两句叙事目的。',
    '不要包含图片、表格、图表占位；不要编造素材中不存在的事实。',
  ].join('\n')

  const user = [
    '【用户原始说明】',
    state.userIntent,
    '',
    '【已澄清的演示意图】',
    intentBlock,
    '',
    '【私域文档摘录（用于理解素材范围，可能不完整）】',
    docPreview,
    state.combinedDocuments.length > 14_000 ? '\n\n_…（正文更长部分将在后续 RAG 中按需召回）_' : '',
    '',
    '请生成故事线骨架（Markdown）。',
  ].join('\n')

  const storyline = await askAssistant(user, { system, temperature: 0.35, max_tokens: 3072 })
  return { storylineMarkdown: storyline }
}

async function evaluateStorylineNode(state: typeof PptOutlineState.State) {
  const system = [
    '你要评估并微调「故事线骨架」，使其与演示意图一致、逻辑完整。',
    '同时产出若干「检索查询」用于后续从私域长文中召回段落：每个重要小节 1 条短查询（中文关键词短语即可）。',
    '输出严格使用 JSON（不要 Markdown 围栏），格式：',
    '{"evaluatedStoryline":"...(Markdown 故事线定稿)...","evaluationNotes":"...","ragQueries":["查询1","查询2",...]}',
  ].join('\n')

  const user = [
    formatIntentBlock(state.clarifiedIntentJson),
    '',
    '【当前故事线骨架】',
    state.storylineMarkdown,
  ].join('\n')

  const raw = await askAssistant(
    `${user}\n\n请先评估故事线，再输出上述 JSON。`,
    { system, temperature: 0.25, max_tokens: 4096 },
  )

  let evaluatedStoryline = state.storylineMarkdown
  let evaluationNotes = ''
  let ragQueries: string[] = []

  try {
    const m = raw.match(/\{[\s\S]*\}/)
    const json = JSON.parse(m ? m[0] : raw)
    if (typeof json.evaluatedStoryline === 'string') evaluatedStoryline = json.evaluatedStoryline
    if (typeof json.evaluationNotes === 'string') evaluationNotes = json.evaluationNotes
    if (Array.isArray(json.ragQueries)) {
      ragQueries = json.ragQueries.filter((x: unknown) => typeof x === 'string') as string[]
    }
  } catch {
    evaluationNotes = '未能解析评估 JSON，已沿用原故事线并降级检索。'
    ragQueries = [state.userIntent.slice(0, 120)]
  }

  return {
    evaluatedStorylineMarkdown: evaluatedStoryline,
    storylineEvaluationNotes: evaluationNotes,
    ragQueriesJson: JSON.stringify(ragQueries),
  }
}

function retrievePrivateRagNode(state: typeof PptOutlineState.State) {
  let queries: string[] = []
  try {
    queries = JSON.parse(state.ragQueriesJson || '[]') as string[]
  } catch {
    queries = []
  }
  const { recallDocument, chunkCount } = buildPlaceholderRecallDocument({
    combinedDocuments: state.combinedDocuments,
    ragQueries: queries,
  })
  return {
    recallDocument:
      recallDocument +
      `\n\n---\n\n_（占位 RAG：共 ${chunkCount} 组片段；上线后替换为 AIDOCX 向量召回 + 重排）_`,
  }
}

/**
 * 第一步：生成「页级大纲」JSON（不含 design_style）。
 * 产品形态：与故事线对齐的逐页结构，后续再补充版式说明字段。
 */
async function generateDeckPagesNode(state: typeof PptOutlineState.State) {
  const system = [
    '你是 PPT 页级大纲作者。只输出一个 JSON 数组的纯文本，不要用 Markdown 代码围栏，不要任何解释。',
    '数组每一项必须是对象，且只包含三个键：page_type, title, content_description。',
    'page_type 取值仅限：pt_title | pt_contents | pt_section_title | pt_text | pt_end。',
    'content_description 为该页正文级内容，可使用 Markdown（标题、列表、表格语法表达信息结构），不要描述配图或插入图片占位。',
    '必须依据「故事线」组织页序；正文要点优先依据「召回文档」与私域素材，不得编造未在素材中出现的具体数字与事实。',
  ].join('\n')

  const user = [
    '【用户说明】',
    state.userIntent,
    '',
    '【澄清意图】',
    formatIntentBlock(state.clarifiedIntentJson),
    '',
    '【故事线定稿】',
    state.evaluatedStorylineMarkdown,
    '',
    '【故事线评估备注】',
    state.storylineEvaluationNotes || '（无）',
    '',
    '【召回文档（片段汇编）】',
    state.recallDocument,
    '',
    '请输出 JSON 数组，示例形状（内容请替换为真实生成）：',
    '[',
    '{"page_type":"pt_title","title":"…","content_description":"…"},',
    '{"page_type":"pt_contents","title":"目录","content_description":"…"},',
    '{"page_type":"pt_section_title","title":"…","content_description":"…"},',
    '{"page_type":"pt_text","title":"…","content_description":"…"},',
    '{"page_type":"pt_end","title":"感谢聆听","content_description":"…"}',
    ']',
  ].join('\n')

  const raw = await askAssistant(`${user}\n\n请生成完整 JSON 数组。`, {
    system,
    temperature: 0.3,
    max_tokens: 8192,
  })

  const m = raw.match(/\[[\s\S]*\]/)
  const jsonStr = m ? m[0] : raw.trim()
  const parsed = parseDeckPagesJson(jsonStr)
  if (!parsed?.length) {
    return {
      deckPagesJson: '[]',
      finalOutlineMarkdown:
        '【页级大纲解析失败】模型未返回合法 JSON 数组。请重试或缩短素材后再试。\n\n原始输出片段：\n' +
        raw.slice(0, 1200),
    }
  }
  return { deckPagesJson: jsonStr }
}

/**
 * 第二步：在固定页级大纲上，为每一页补充 design_style（版式与阅读路径说明）。
 */
async function enrichDesignStylesNode(state: typeof PptOutlineState.State) {
  const base = parseDeckPagesJson(state.deckPagesJson)
  if (!base?.length) {
    return {
      finalOutlineMarkdown:
        state.finalOutlineMarkdown ||
        '【无页级大纲】跳过了版式补充。',
    }
  }

  const system = [
    '你是演示视觉与版式顾问。输入为页级大纲 JSON（不含 design_style）。',
    '请输出**同一个 JSON 数组**，为每一项增加字符串字段 design_style。',
    'design_style 用中文描述：该页推荐版面结构、信息层级、阅读顺序与留白策略；不要出现「配图」「插图」「素材文件名」；不要重复整页正文。',
    '只输出 JSON 数组纯文本，不要用 Markdown 围栏。',
  ].join('\n')

  const user = [
    '【页级大纲 JSON】',
    state.deckPagesJson,
    '',
    '请输出补充了 design_style 后的完整 JSON 数组，键集合为：page_type, title, content_description, design_style。',
  ].join('\n')

  let raw: string
  try {
    raw = await askAssistant(user, { system, temperature: 0.25, max_tokens: 8192 })
  } catch {
    const fallback: DeckPageFull[] = base.map((p) => ({
      ...p,
      design_style: '（版式说明生成失败，已仅保留正文结构。）',
    }))
    return { finalOutlineMarkdown: formatFinalDeckMarkdown(fallback) }
  }

  const m = raw.match(/\[[\s\S]*\]/)
  let enriched: DeckPageFull[]
  try {
    const arr = JSON.parse(m ? m[0] : raw) as unknown
    if (!Array.isArray(arr)) throw new Error('not array')
    enriched = mergeEnrichedPages(base, arr)
  } catch {
    enriched = base.map((p) => ({
      ...p,
      design_style: '（未能解析版式补充结果，已保留页级正文。）',
    }))
  }

  return { finalOutlineMarkdown: formatFinalDeckMarkdown(enriched) }
}

function mergeEnrichedPages(base: DeckPageBase[], modelArr: unknown[]): DeckPageFull[] {
  return base.map((b, i) => {
    const item = modelArr[i]
    let design = '（版式说明缺失，已按默认居中信息页处理。）'
    if (item && typeof item === 'object' && item !== null) {
      const ds = (item as Record<string, unknown>).design_style
      if (typeof ds === 'string' && ds.trim()) design = ds.trim()
    }
    return { ...b, design_style: design }
  })
}

async function qualityCheckNode(state: typeof PptOutlineState.State) {
  const system =
    '用 5～8 条短句检查：大纲是否覆盖澄清意图、是否与故事线一致、是否存在明显无素材支撑的断言。不要重复全文。'

  const notes = await askAssistant(
    `【澄清意图】\n${formatIntentBlock(state.clarifiedIntentJson)}\n\n【故事线】\n${state.evaluatedStorylineMarkdown.slice(0, 4000)}\n\n【最终大纲】\n${state.finalOutlineMarkdown.slice(0, 8000)}\n\n请输出检查要点。`,
    { system, temperature: 0.2, max_tokens: 1024 },
  )
  return { qualityNotes: notes }
}

export function buildPptOutlineGraph() {
  const g = new StateGraph(PptOutlineState)
    .addNode('material_gate', materialGateNode)
    .addNode('build_storyline', buildStorylineNode)
    .addNode('evaluate_storyline', evaluateStorylineNode)
    .addNode('retrieve_private_rag', retrievePrivateRagNode)
    .addNode('generate_deck_pages', generateDeckPagesNode)
    .addNode('enrich_design_styles', enrichDesignStylesNode)
    .addNode('quality_check', qualityCheckNode)
    .addEdge(START, 'material_gate')
    .addConditionalEdges('material_gate', (s) => (s.pipeline === 'stop' ? 'stop' : 'continue'), {
      stop: END,
      continue: 'build_storyline',
    })
    .addEdge('build_storyline', 'evaluate_storyline')
    .addEdge('evaluate_storyline', 'retrieve_private_rag')
    .addEdge('retrieve_private_rag', 'generate_deck_pages')
    .addEdge('generate_deck_pages', 'enrich_design_styles')
    .addEdge('enrich_design_styles', 'quality_check')
    .addEdge('quality_check', END)

  return g.compile()
}

export type RunPptOutlinePipelineInput = {
  userIntent: string
  documentMarkdowns: string[]
  /** 意图确认表单提交后的结构化结果 */
  clarifiedIntent: ClarifiedIntent
}

/** 每完成一个图节点回调一次，便于前端展示 ReAct / 步骤条 */
export type PptOutlineProgressEvent = {
  node: string
  /** 截至当前节点合并后的状态快照 */
  state: Record<string, unknown>
}

export async function runPptOutlinePipeline(
  input: RunPptOutlinePipelineInput,
  onProgress?: (e: PptOutlineProgressEvent) => void,
): Promise<Record<string, unknown>> {
  const graph = buildPptOutlineGraph()
  const combined = input.documentMarkdowns.join('\n\n---\n\n')
  const initial = {
    userIntent: input.userIntent,
    combinedDocuments: combined,
    clarifiedIntentJson: JSON.stringify(input.clarifiedIntent),
    pipeline: 'continue' as const,
    storylineMarkdown: '',
    evaluatedStorylineMarkdown: '',
    storylineEvaluationNotes: '',
    ragQueriesJson: '[]',
    recallDocument: '',
    deckPagesJson: '',
    finalOutlineMarkdown: '',
    qualityNotes: '',
  }

  const stream = await graph.stream(initial, { streamMode: 'updates' })
  let merged: Record<string, unknown> = { ...initial }

  for await (const chunk of stream) {
    if (chunk == null || typeof chunk !== 'object') continue
    for (const [node, update] of Object.entries(chunk as Record<string, Record<string, unknown>>)) {
      merged = { ...merged, ...update }
      onProgress?.({ node, state: { ...merged } })
    }
  }

  return merged
}

/** 兼容旧调用：未带意图表单时使用占位意图（新流程请用 runPptOutlinePipeline） */
export async function runPptOutlineAgent(input: {
  userIntent: string
  documentMarkdowns: string[]
}) {
  return runPptOutlinePipeline({
    userIntent: input.userIntent,
    documentMarkdowns: input.documentMarkdowns,
    clarifiedIntent: {
      presentationGoal: '（未通过意图表单，请前端接入 clarifiedIntent）',
      targetAudience: '（未指定）',
      additionalInfo: 'legacy-call',
    },
  })
}
