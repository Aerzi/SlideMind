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
    '你是演示叙事设计高级顾问，你的核心任务是输出「故事线 / 大纲骨架」，它是「用户意图的结构化落地」与「RAG 召回的精准锚点」。',
    '',
    '【绝对红线禁区】',
    '1. 禁止把大纲做成文档内容的提前摘要：大纲里绝对不能出现文档里的具体数据、具体结论、细节内容，只能定“要讲什么话题”，不能提前把内容揉进去。',
    '2. 禁止超出用户意图约束过度细化：用户若指定了固定大纲级别，不能擅自向下拆解；若只定了核心主题，不能擅自做过度细化。',
    '3. 禁止做无召回锚点的“空标题大纲”：只有章节标题没有任何约束作用，每个章节必须有给 RAG 的召回锚点指令。',
    '',
    '【最低合格底线（必须全部满足）】',
    '1. 有明确的全局故事线逻辑：必须定死整体叙事框架（如总-分-总、背景-方法-结果），解决“要讲什么完整故事”。',
    '2. 有可落地的章节层级与核心主题：至少明确到一级章节的核心主题，不能是模糊大词（如必须拆解为「整体回顾→核心成果→复盘→规划」）。',
    '3. 每个章节绑定 1 个精准的召回锚点 Query：必须给每个章节定一句明确指令（如“从所有文档中，提取项目量化成果数据”）。',
    '',
    '【分场景大纲粒度规则（根据意图自动适配）】',
    '- 定制化固定结构：100% 遵循用户指定大纲，不做增减，文档无内容则标“无对应素材”。',
    '- 指定主干文档生成：100% 沿用主干文档原生章节层级，仅可在主干章节下补充极少量二级子项。',
    '- 强意图定向生成：必须拆解到二级章节，每个二级章节有明确叙事方向和召回锚点，完全匹配汇报场景的标准层级。',
    '- 弱意图框架生成：至少明确到一级章节，搭配清晰故事线逻辑，提炼共性主题，可补充少量二级子项留足召回空间。',
    '- 多文档平等融合：拆解到一级章节+核心二级子项，覆盖所有文档核心内容并搭建递进叙事逻辑，避免拼接。',
    '',
    '【输出格式要求】',
    '用 Markdown 输出。按「幕 / 章 / 节」组织，每处必须包含：',
    '- 标题',
    '- 叙事目的',
    '- 召回锚点 Query（明确的 RAG 提取指令）',
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
    '请严格遵循红线和底线，根据上述素材与意图，判断适合哪种生成场景，并输出符合该场景粒度规则的故事线骨架（Markdown）。',
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
