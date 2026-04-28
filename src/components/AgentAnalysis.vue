<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue'
import type { UploadedFile } from '../types/uploadedFile'
import type { DocumentParseAgentStep } from '../types/documentParseAgentStep'
import type { PipelineReactStep } from '../types/pipelineReactStep'
import AnalysisAttachmentFiles from './AnalysisAttachmentFiles.vue'
import IntentClarificationForm from './IntentClarificationForm.vue'
import DocumentParseTrace from './DocumentParseTrace.vue'
import PipelineGraphModal from './PipelineGraphModal.vue'
import MarkdownBody from './MarkdownBody.vue'
import { renderMarkdown } from '../utils/markdownRender'
import { runPptOutlinePipeline, type PptOutlineProgressEvent } from '../agents'
import { buildSkippedClarifiedIntent } from '../utils/clarifiedIntent'
import { buildStageMarkdownForNode, markdownForOutlineTab } from '../utils/pipelineStageMarkdown'
import {
  fetchIntentClarificationForm,
  getFallbackIntentClarificationForm,
  initAnswersFromForm,
  buildClarifiedIntentFromClarificationForm,
  type IntentClarificationFormPayload,
} from '../utils/intentClarificationForm'

const emit = defineEmits(['back'])

const props = defineProps<{
  topic: string
  files: UploadedFile[]
}>()

const messages = ref<any[]>([])
const agentSteps = ref<DocumentParseAgentStep[]>([])
const scrollContainer = ref<HTMLElement | null>(null)

const pipelineResult = ref<Record<string, string> | null>(null)
const pipelineRunning = ref(false)
const showGraphModal = ref(false)
const pipelineError = ref<string | null>(null)
const pipelineSectionTab = ref<'storyline' | 'recall' | 'outline' | 'quality'>('outline')


const PIPELINE_NODE_META = [
  {
    node: 'material_gate' as const,
    title: '素材与意图门槛',
    thought: '先确认合并后的私域文本是否达到可靠编排长度，并校验意图澄清 JSON 可被后端消费。',
    actionPill: 'gate_check · 字数门槛 + clarifiedIntent',
  },
  {
    node: 'build_storyline' as const,
    title: '故事线骨架',
    thought: '在「用户主题 + 澄清意图 + 素材摘录」约束下构造章节化叙事骨架，不臆造素材外事实。',
    actionPill: 'askAssistant · storyline_skeleton',
  },
  {
    node: 'evaluate_storyline' as const,
    title: '故事线评估与检索查询',
    thought: '评审故事线是否与意图一致，并产出用于私域召回的短查询列表。',
    actionPill: 'askAssistant · evaluate + ragQueries[]',
  },
  {
    node: 'retrieve_private_rag' as const,
    title: '私域召回（占位）',
    thought: '按查询从合并长文中取相关片段，拼成「召回文档」供页级大纲引用（当前为占位实现）。',
    actionPill: 'retrieve_private_rag · placeholder',
  },
  {
    node: 'generate_deck_pages' as const,
    title: '页级大纲（JSON）',
    thought: '对齐故事线与召回片段，输出逐页 JSON：page_type / title / content_description（不含版式字段）。',
    actionPill: 'askAssistant · deck_pages[]',
  },
  {
    node: 'enrich_design_styles' as const,
    title: '版式说明补充',
    thought: '在固定页级结构上为每页生成 design_style（版面、层级、阅读顺序），再包装为终稿 Markdown。',
    actionPill: 'askAssistant · design_style',
  },
  {
    node: 'quality_check' as const,
    title: '一致性质检',
    thought: '抽查大纲与意图、故事线、素材支撑是否明显冲突，输出短评注。',
    actionPill: 'askAssistant · quality_notes',
  },
] as const

const pipelineReactSteps = ref<PipelineReactStep[]>([])
const pipelineSteps = ref<DocumentParseAgentStep[]>([])
const isPipelineTraceCollapsed = ref(false)

function formatPipelineObservation(node: string, state: Record<string, unknown>): string {
  const combined = String(state.combinedDocuments ?? '').trim()
  const pipeline = state.pipeline as string | undefined
  switch (node) {
    case 'material_gate':
      if (pipeline === 'stop') {
        return `观察：合并素材约 ${combined.length} 字，未满足继续条件或意图无效，流程在此终止。`
      }
      return `观察：素材与意图校验通过（合并约 ${combined.length} 字），进入故事线阶段。`
    case 'build_storyline': {
      const n = String(state.storylineMarkdown ?? '').length
      return `观察：已生成故事线骨架（${n.toLocaleString()} 字）。`
    }
    case 'evaluate_storyline': {
      let n = 0
      try {
        const arr = JSON.parse(String(state.ragQueriesJson ?? '[]')) as unknown
        if (Array.isArray(arr)) n = arr.filter((x) => typeof x === 'string').length
      } catch {
        n = 0
      }
      const notes = String(state.storylineEvaluationNotes ?? '').trim()
      return `观察：评估完成；产出 ${n} 条检索查询${notes ? '；已附简短评估备注。' : '。'}`
    }
    case 'retrieve_private_rag': {
      const n = String(state.recallDocument ?? '').length
      return `观察：已汇编召回文档（${n.toLocaleString()} 字，含占位说明）。`
    }
    case 'generate_deck_pages': {
      const n = String(state.deckPagesJson ?? '').length
      return `观察：页级大纲 JSON 已生成（${n.toLocaleString()} 字）。`
    }
    case 'enrich_design_styles': {
      const n = String(state.finalOutlineMarkdown ?? '').length
      return `观察：终稿 Markdown（含每页 design_style）已生成（${n.toLocaleString()} 字）。`
    }
    case 'quality_check': {
      const n = String(state.qualityNotes ?? '').length
      return `观察：质检备注已输出（${n.toLocaleString()} 字）。`
    }
    default:
      return '观察：步骤已完成。'
  }
}

function initPipelineReactSteps() {
  pipelineReactSteps.value = PIPELINE_NODE_META.map((meta, i) => ({
    id: 300 + i,
    node: meta.node,
    title: meta.title,
    thought: meta.thought,
    actionPill: meta.actionPill,
    status: i === 0 ? 'running' : 'pending',
    observation: '',
    isExpanded: i === 0,
    stageDetailOpen: i === 0,
    stageMarkdown: '',
  }))
}

function applyPipelineProgress({ node, state }: PptOutlineProgressEvent) {
  const idx = PIPELINE_NODE_META.findIndex((m) => m.node === node)
  if (idx < 0) return
  const steps = pipelineReactSteps.value
  if (steps.length !== PIPELINE_NODE_META.length) return

  for (let i = 0; i < idx; i++) {
    const s = steps[i]
    if (s.status !== 'skipped') {
      s.status = 'completed'
      if (!s.observation) s.observation = '—'
    }
    s.stageDetailOpen = false
  }

  const cur = steps[idx]
  cur.status = 'completed'
  cur.observation = formatPipelineObservation(node, state)
  cur.stageMarkdown = buildStageMarkdownForNode(node, state)

  if (node === 'material_gate' && state.pipeline === 'stop') {
    for (let j = idx + 1; j < steps.length; j++) {
      steps[j].status = 'skipped'
      steps[j].observation = '未执行：上游已在门槛处终止。'
      steps[j].stageMarkdown = ''
      steps[j].stageDetailOpen = false
    }
    cur.stageDetailOpen = true
    scrollToBottom()
    return
  }

  if (idx + 1 < steps.length && steps[idx + 1].status !== 'skipped') {
    const next = steps[idx + 1]
    next.status = 'running'
    next.isExpanded = true
    next.stageDetailOpen = true
    next.stageMarkdown = ''
    next.observation = ''
    cur.stageDetailOpen = false
  } else {
    cur.stageDetailOpen = true
  }

  // Update pipelineSteps for continuous trace UI
  const pSteps = pipelineSteps.value
  const tNow = Date.now()
  if (pSteps.length === 4) {
    if (node === 'retrieve_private_rag') {
      if (pSteps[0].status !== 'completed') {
        pSteps[0].status = 'completed'
        pSteps[0].elapsedMs = tNow - (pSteps[0].startTimeMs || tNow)
        pSteps[0].isExpanded = false
        pSteps[1].status = 'running'
        pSteps[1].startTimeMs = tNow
        pSteps[1].isExpanded = true
      }
    } else if (node === 'generate_deck_pages') {
      if (pSteps[1].status !== 'completed') {
        pSteps[1].status = 'completed'
        pSteps[1].elapsedMs = tNow - (pSteps[1].startTimeMs || tNow)
        pSteps[1].isExpanded = false
        pSteps[2].status = 'running'
        pSteps[2].startTimeMs = tNow
        pSteps[2].isExpanded = true
      }
    } else if (node === 'enrich_design_styles' || node === 'quality_check') {
      if (pSteps[2].status !== 'completed') {
        pSteps[2].status = 'completed'
        pSteps[2].elapsedMs = tNow - (pSteps[2].startTimeMs || tNow)
        pSteps[2].isExpanded = false
        pSteps[3].status = 'running'
        pSteps[3].startTimeMs = tNow
        pSteps[3].isExpanded = true
      }
    }
  }

  scrollToBottom()
}

function togglePipelineStepExpand(stepId: number) {
  const step = pipelineSteps.value.find((s) => s.id === stepId)
  if (step) {
    step.isExpanded = !step.isExpanded
  }
}

function togglePipelineStageDetail(stepId: number) {
  const s = pipelineReactSteps.value.find((x) => x.id === stepId)
  if (!s || s.status === 'running') return
  s.stageDetailOpen = !s.stageDetailOpen
}

function renderStepStageHtml(step: PipelineReactStep): string {
  if (step.status === 'running' && !step.stageMarkdown.trim()) {
    return renderMarkdown('> **进行中** 等待节点返回…\n')
  }
  if (step.status === 'skipped') {
    return renderMarkdown('_本阶段未执行。_')
  }
  return renderMarkdown(step.stageMarkdown.trim() || '_（暂无内容）_')
}

function onAddIntentOption(payload: { questionId: string; label: string; type: 'single' | 'multi' }) {
  const q = clarificationForm.value?.questions.find((x) => x.id === payload.questionId)
  if (!q) return
  const id = `custom_${Date.now().toString(36)}`
  q.options = [...q.options, { id, label: payload.label }]
  if (payload.type === 'single') {
    intentAnswers.value = { ...intentAnswers.value, [payload.questionId]: id }
  } else {
    const cur = Array.isArray(intentAnswers.value[payload.questionId])
      ? [...(intentAnswers.value[payload.questionId] as string[])]
      : []
    cur.push(id)
    intentAnswers.value = { ...intentAnswers.value, [payload.questionId]: cur }
  }
}

const ragQueriesList = computed(() => {
  const j = pipelineResult.value?.ragQueriesJson
  if (!j) return []
  try {
    const arr = JSON.parse(j) as unknown
    return Array.isArray(arr) ? (arr as string[]).filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
})

const greetingText = computed(() => {
  const t = props.topic?.trim()
  if (t) {
    const short = t.length > 100 ? t.slice(0, 100) + '…' : t
    return `收到。将结合你的主题与已解析素材，完成文档理解后进行意图澄清与大纲编排：「${short}」`
  }
  return '收到。将基于你已上传的素材与后续意图澄清结果，生成演示故事线与 PPT 大纲。'
})

const topicBubble = computed(() => props.topic?.trim() || '（可在上一页补充主题说明）')


const pipelineTabBody = computed(() => {
  const p = pipelineResult.value
  if (!p) return ''
  switch (pipelineSectionTab.value) {
    case 'storyline': {
      const a = p.storylineMarkdown || ''
      const b = p.evaluatedStorylineMarkdown || ''
      const notes = p.storylineEvaluationNotes || ''
      return [
        '## 初稿故事线\n\n',
        a || '（暂无）',
        '\n\n---\n\n## 评估后故事线\n\n',
        b || '（暂无）',
        notes ? `\n\n---\n\n## 评估备注\n\n${notes}` : '',
      ].join('')
    }
    case 'recall':
      return p.recallDocument || '（暂无召回汇编）'
    case 'outline':
      return markdownForOutlineTab(p.finalOutlineMarkdown || '')
    case 'quality':
      return p.qualityNotes || '（暂无质检备注）'
    default:
      return ''
  }
})

const scrollToBottom = () => {
  nextTick(() => {
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
    }
  })
}

const isTraceCollapsed = ref(false)

function buildDocumentParseCopy(first: UploadedFile | undefined) {
  if (!first) {
    return {
      description:
        '我将根据你输入的主题生成 PPT。若上传文档，我会先将其解析为 Markdown 再进行分析。',
      actionContent: '解析主题与素材（未上传文件）',
      result:
        '未检测到上传文件，将基于你输入的主题与默认行业范例进行意图分析。你也可以返回上一步补充文档。',
    }
  }
  const baseName = first.name.replace(/\.[^/.]+$/, '') || first.name
  if (first.parseStatus === 'error') {
    return {
      description: '尝试解析你上传的文档，用于后续生成 PPT。',
      actionContent: `解析失败：「${first.name}」`,
      result: first.parseError || '文档解析失败。将主要依据你输入的主题继续。',
    }
  }
  const md = first.markdown || ''
  if (first.parseStatus === 'ready' && md.length > 0) {
    const preview = md.slice(0, 400).trim()
    return {
      description: '我将读取已解析的 Markdown 正文，并准备生成 PPT。',
      actionContent: `已将「${baseName}」解析为 Markdown（${md.length.toLocaleString()} 字符）`,
      result: `文档已成功解析为 Markdown。以下为内容片段预览：\n\n${preview}${md.length > 400 ? '…' : ''}\n\n我将基于该 Markdown 与主题进行意图分析。`,
    }
  }
  return {
    description: '处理你上传的文档并准备生成 PPT。',
    actionContent: `处理「${first.name}」`,
    result: '未获取到可用的 Markdown 正文，将主要依据你输入的主题继续。',
  }
}

const startAgentSimulation = async () => {
  const docCopy = buildDocumentParseCopy(props.files[0])
  const steps = [
    {
      title: '文档解析',
      status: 'running',
      isExpanded: true,
      description: docCopy.description,
      action: {
        icon: 'document',
        label: '文档解析',
        content: docCopy.actionContent,
      },
      result: docCopy.result,
    },
    {
      title: '意图分析',
      status: 'pending',
      isExpanded: true,
      description:
        '结合你已输入的主题与解析后的文档摘录，生成本次演示的「目标」与「受众」候选；选项由模型依据素材撰写，而非写死模板。',
      thought_title: '已完成思考',
      showThought: false,
      action: {
        icon: 'idea',
        label: '意图确认',
        content: '确认用户制作 PPT 的关键信息',
      },
    },
  ]

  agentSteps.value = []

  const step1 = { ...steps[0], id: 0, startTimeMs: Date.now() }
  agentSteps.value.push(step1)
  scrollToBottom()

  await new Promise((resolve) => setTimeout(resolve, 600))
  step1.status = 'completed'
  step1.elapsedMs = Date.now() - step1.startTimeMs
  scrollToBottom()

  const step2 = { ...steps[1], id: 1, status: 'running', startTimeMs: Date.now() }
  agentSteps.value.push(step2)
  if (step2.action) {
    step2.action.content = '正在根据主题与已解析 Markdown 生成澄清选项…'
  }
  scrollToBottom()

  const mds = props.files
    .filter((f) => f.parseStatus === 'ready' && f.markdown)
    .map((f) => f.markdown as string)

  try {
    const payload = await fetchIntentClarificationForm({
      topic: props.topic,
      documentMarkdowns: mds,
    })
    clarificationForm.value = payload
    intentAnswers.value = initAnswersFromForm(payload)
  } catch {
    const fb = getFallbackIntentClarificationForm(props.topic)
    clarificationForm.value = fb
    intentAnswers.value = initAnswersFromForm(fb)
  }

  step2.status = 'completed'
  step2.elapsedMs = Date.now() - step2.startTimeMs
  step2.result = `已根据你的主题${mds.length ? '与素材摘录' : '（未检测到可用正文时仅依据主题）'}生成澄清选项，请在下方确认或调整。`
  if (step2.action) {
    step2.action.content = '意图澄清候选已就绪'
  }
  scrollToBottom()

  await new Promise((resolve) => setTimeout(resolve, 400))
  isTraceCollapsed.value = true
  messages.value.push({ type: 'intent_form' })
  showIntentForm.value = true
  formCountdown.value = 59
  formTimer = setInterval(() => {
    formCountdown.value--
    if (formCountdown.value <= 0) {
      if (formTimer) {
        clearInterval(formTimer)
        formTimer = null
      }
      void confirmForm()
    }
  }, 1000)
  scrollToBottom()
}

const showIntentForm = ref(false)
const isIntentFormSubmitted = ref(false)
const formCountdown = ref(59)
let formTimer: any = null

const intentFormData = ref({
  additionalInfo: '',
})

/** 模型返回的完整澄清表单（题目 / 描述 / 选项 / 推荐） */
const clarificationForm = ref<IntentClarificationFormPayload | null>(null)
/** 各题作答：单选 string，多选 string[]，文本 string */
const intentAnswers = ref<Record<string, string | string[]>>({})

async function runPipeline(mode: 'confirm' | 'skip') {
  if (pipelineRunning.value) return
  pipelineRunning.value = true
  showGraphModal.value = true
  pipelineError.value = null
  
  isPipelineTraceCollapsed.value = false
  pipelineSteps.value = [
    {
      id: 100,
      title: '规划中',
      status: 'running',
      isExpanded: true,
      description: '好的，已收到意图确认结果，接下来将为你处理下一步。',
      thought_title: '已完成思考',
      showThought: false,
      startTimeMs: Date.now(),
    }
  ]
  
  messages.value.push({ type: 'pipeline_trace' })

  // 模拟第一个步骤的完成
  setTimeout(() => {
    const pSteps = pipelineSteps.value
    if (pSteps[0]) {
      pSteps[0].status = 'completed'
      pSteps[0].elapsedMs = Date.now() - (pSteps[0].startTimeMs || Date.now())
      pSteps[0].isExpanded = false
    }

    // 添加并启动第二个步骤：深度检索
    pSteps.push({
      id: 101,
      title: '深度检索',
      status: 'running',
      isExpanded: true,
      startTimeMs: Date.now(),
      description: '现在我将开始搜索小米 SU7 Ultra 最新配置/版本/价格/关键数据与舆情等资料信息，作为补充内容丰富进一步 PPT 内容',
      thought_title: '已完成思考',
      showThought: false,
      actions: []
    })
    scrollToBottom()

    // 步骤二的 Action 1
    setTimeout(() => {
      const pSteps = pipelineSteps.value
      const step101 = pSteps.find(s => s.id === 101)
      if (step101 && step101.actions) {
        step101.actions.push({ 
          icon: 'search', 
          label: '文档检索', 
          content: '正在检索“小米 SU7 Ultra 最新配置与版本信息”',
          tags: [
            { type: 'word', text: '小米 SU7 Ultra 最新配置说明' },
            { type: 'word', text: '小米 SU7 Ultra 白皮书' }
          ]
        })
        scrollToBottom()
      }
    }, 1500)

    // 步骤二的 Action 2
    setTimeout(() => {
      const pSteps = pipelineSteps.value
      const step101 = pSteps.find(s => s.id === 101)
      if (step101 && step101.actions) {
        step101.actions.push({ 
          icon: 'search', 
          label: '文档检索', 
          content: '正在检索“小米 SU7 Ultra 价格汇总报告”',
          tags: [
            { type: 'word', text: '小米 SU7 Ultra 价格汇总报告' },
            { type: 'presentation', text: '2023全年塑料市场分析报告汇总' }
          ]
        })
        scrollToBottom()
      }
    }, 3500)

    // 步骤二的 Action 3
    setTimeout(() => {
      const pSteps = pipelineSteps.value
      const step101 = pSteps.find(s => s.id === 101)
      if (step101 && step101.actions) {
        step101.actions.push({ 
          icon: 'search', 
          label: '联网搜索', 
          content: '正在搜索“小米 SU7 Ultra”',
          tags: [
            { type: 'smzdm', text: 'post.m.smzdm' },
            { type: 'red_star', text: 'finance.stockstar' },
            { type: 'web', text: 'storage.djyanbao' },
            { type: 'red_star', text: 'finance.stockstar' },
            { type: 'yiche', text: 'news.yiche' },
            { type: 'web', text: 'storage.djyanbao' },
            { type: 'smzdm', text: 'post.m.smzdm' },
            { type: 'expand', text: '展开' }
          ]
        })
        scrollToBottom()
      }
    }, 5500)

    // 步骤二结束
    setTimeout(() => {
      const pSteps = pipelineSteps.value
      const step101 = pSteps.find(s => s.id === 101)
      if (step101) {
        step101.status = 'completed'
        step101.elapsedMs = Date.now() - (step101.startTimeMs || Date.now())
        step101.isExpanded = false
        step101.result = '数据搜集完成。现在开始为您生成专业的调研报告PPT，涵盖产品定位、性能参数、市场表现、用户反馈和竞品对比等核心内容。'
        scrollToBottom()
      }
    }, 7500)
    
  }, 1000)

  // 模拟第三个步骤的添加
  setTimeout(() => {
    const pSteps = pipelineSteps.value
    pSteps.push({
      id: 102,
      title: '内容整合',
      status: 'running',
      isExpanded: true,
      startTimeMs: Date.now(),
      description: '我已完成小米 SU7 Ultra 最新配置/版本/价格/关键数据与舆情等资料信息的收集，整理出结构化报告，涵盖产品定位、性能参数、市场表现、用户反馈和竞品对比等核心内容，我将基于收集到的丰富信息，开始生成幻灯片大纲。',
      thought_title: '已完成思考',
      showThought: false,
      actions: []
    })
    scrollToBottom()

    // 步骤三的 Action
    setTimeout(() => {
      const pSteps = pipelineSteps.value
      const step102 = pSteps.find(s => s.id === 102)
      if (step102 && step102.actions) {
        step102.actions.push({ icon: 'document', label: '生成草稿', content: '小米 SU7 Ultra 调研报告_大纲.xml' })
        scrollToBottom()
      }
    }, 1500)
    
    // 步骤三结束
    setTimeout(() => {
      const pSteps = pipelineSteps.value
      const step102 = pSteps.find(s => s.id === 102)
      if (step102) {
        step102.status = 'completed'
        step102.elapsedMs = Date.now() - (step102.startTimeMs || Date.now())
        step102.isExpanded = false
      }
    }, 3000)
  }, 9000)

  // 模拟第四个步骤的添加
  setTimeout(() => {
    const pSteps = pipelineSteps.value
    pSteps.push({
      id: 103,
      title: '大纲生成',
      status: 'running',
      isExpanded: true,
      startTimeMs: Date.now(),
      description: '现在我将进入大纲生成阶段，将文档信息和意图结果传递给 OutlineAgent。',
      thought_title: '已完成思考',
      showThought: false,
      action: { icon: 'document', label: 'PPT 大纲', content: '正在撰写 PPT 大纲...' },
    })
    scrollToBottom()

    // 步骤四结束（也就是所有步骤结束）
    setTimeout(() => {
      const pSteps = pipelineSteps.value
      const step103 = pSteps.find(s => s.id === 103)
      if (step103) {
        step103.status = 'completed'
        step103.elapsedMs = Date.now() - (step103.startTimeMs || Date.now())
        step103.isExpanded = false
        step103.result = '完美！OutlineAgent 已成功生成 PPT 大纲，内容结构清晰完整。大纲已生成完毕，整个 PPT 制作流程顺利完成！您可以基于此大纲进行后续的 PPT 制作工作。'
        scrollToBottom()
      }
    }, 3000)
  }, 12500)

  initPipelineReactSteps()
  try {
    const mds = props.files
      .filter((f) => f.parseStatus === 'ready' && f.markdown)
      .map((f) => f.markdown as string)
    const clarified =
      mode === 'confirm'
        ? buildClarifiedIntentFromClarificationForm(
            clarificationForm.value?.questions ?? [],
            intentAnswers.value,
            intentFormData.value.additionalInfo,
          )
        : buildSkippedClarifiedIntent(intentFormData.value.additionalInfo)

    const res = (await runPptOutlinePipeline(
      {
        userIntent: props.topic.trim() || '（未填写主题）',
        documentMarkdowns: mds,
        clarifiedIntent: clarified,
      },
      applyPipelineProgress,
    )) as Record<string, string>

    pipelineResult.value = res
    pipelineSectionTab.value = 'outline'
    if (res.pipeline === 'stop') {
      messages.value.push({
        type: 'ai_text',
        text:
          '编排已结束：未满足继续条件（例如素材过短）。请返回上传更多文档或补充主题后重试。',
      })
    }
  } catch (e) {
    pipelineError.value = e instanceof Error ? e.message : '请求失败'
    const run = pipelineReactSteps.value.find((s) => s.status === 'running')
    if (run) {
      run.status = 'skipped'
      run.observation = `观察：执行失败 — ${pipelineError.value}`
    }
    messages.value.push({
      type: 'ai_text',
      text: `执行失败：${pipelineError.value}`,
    })
  } finally {
    pipelineRunning.value = false
    scrollToBottom()
  }
}

const confirmForm = async () => {
  if (isIntentFormSubmitted.value) return
  if (formTimer) {
    clearInterval(formTimer)
    formTimer = null
  }
  isIntentFormSubmitted.value = true
  isTraceCollapsed.value = true
  await runPipeline('confirm')
}

const skipForm = async () => {
  if (isIntentFormSubmitted.value) return
  if (formTimer) {
    clearInterval(formTimer)
    formTimer = null
  }
  isIntentFormSubmitted.value = true
  isTraceCollapsed.value = true
  await runPipeline('skip')
}

const toggleStepExpand = (stepId: number) => {
  const step = agentSteps.value.find((s) => s.id === stepId)
  if (step) {
    step.isExpanded = !step.isExpanded
  }
}

onMounted(() => {
  setTimeout(() => {
    messages.value.push({
      type: 'ai_greeting',
      text: greetingText.value,
      files: props.files,
      topic: props.topic,
    })

    setTimeout(() => {
      messages.value.push({
        type: 'langgraph_trace',
      })
      startAgentSimulation()
    }, 300)
  }, 200)
})

</script>

<template>
  <div class="flex w-full h-[calc(100vh-80px)] mt-4 px-4 gap-6 relative transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]">
    
    <!-- Top Action Bar -->
    <div class="absolute top-[0px] left-[16px] flex items-center z-20">
      <button 
        @click="$emit('back')" 
        class="flex items-center gap-1 text-gray-500 hover:text-gray-900 transition-colors text-[14px]"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        返回修改
      </button>
    </div>

    <!-- Left Pane: Outline Preview (Appears when pipeline finishes) -->
    <div 
      v-if="pipelineResult" 
      class="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200/60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-left-8 duration-700 h-[calc(100vh-120px)] mt-8 p-10 flex flex-col"
    >
      <div class="text-[20px] font-semibold text-gray-800 mb-6 flex items-center justify-between">
        PPT 大纲预览
        <div class="flex gap-2">
           <button class="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-5 py-2.5 rounded-lg text-[14px] font-medium shadow-sm transition-all flex items-center gap-1.5">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10.5 4.5L12 2l1.5 2.5L16 6l-2.5 1.5L12 10l-1.5-2.5L8 6l2.5-1.5zM19 12.5L20 11l1 1.5L22.5 14l-1.5 1.5L20 17l-1-1.5L17.5 14l1.5-1.5zM6 14.5L7 13l1 1.5L9.5 16l-1.5 1.5L7 19l-1-1.5L4.5 16l1.5-1.5z" />
            </svg>
            一键生成 PPT
          </button>
        </div>
      </div>
      <MarkdownBody :rendered-html="pipelineTabBody" class="prose-slate max-w-none text-[15px]" />
    </div>

    <!-- Right/Center Pane: Chat Trace -->
    <div 
      class="flex flex-col relative transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] h-[calc(100vh-100px)] mt-8 rounded-2xl"
      :class="pipelineResult ? 'w-[420px] shrink-0 border-l border-gray-200/60 pl-4' : 'flex-1 max-w-[800px] mx-auto w-full'"
    >
      <div ref="scrollContainer" class="flex-1 overflow-y-auto pb-[160px] pt-[24px] custom-scrollbar relative z-10 flex flex-col scroll-smooth w-full" :class="pipelineResult ? 'px-2' : 'px-8'">
        
        <div class="w-full flex flex-col mx-auto">
          <!-- User Message -->
          <div class="flex flex-col items-end mb-[32px] animate-in fade-in slide-in-from-bottom-4 duration-500 relative w-full">
            <div class="flex items-end gap-3 w-full justify-end">
              <div class="flex flex-col items-end gap-3 w-full relative z-20">
                <AnalysisAttachmentFiles :files="files" />
                <div class="bg-[#f2f3f5] text-[#1a1a1a] px-[20px] py-[14px] rounded-[16px] rounded-tr-[4px] text-[15px] leading-[1.6] w-fit max-w-full">
                  {{ topicBubble }}
                </div>
              </div>
            </div>
          </div>
          
          <div class="relative pl-[24px] border-l-[1.5px] border-[#e5e7eb] ml-[8px] pb-[40px] w-full mt-[16px]">
            <template v-for="(msg, index) in messages" :key="index">
              <!-- AI Greeting -->
              <div v-if="msg.type === 'ai_greeting'" class="mb-[36px] relative animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
                <div class="absolute -left-[33px] top-[2px] bg-[#fafafc]">
                  <div class="w-[18px] h-[18px] rounded-[6px] bg-[#f2f3f5] flex items-center justify-center border border-[#e5e7eb]">
                    <svg class="w-[12px] h-[12px] text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                </div>
                <div v-if="msg.text" class="text-[14.5px] text-[#1a1a1a] leading-[1.6] w-full relative z-20 mt-[2px]">
                  {{ msg.text }}
                </div>
                <div class="mt-[10px] text-[13.5px] text-gray-400 flex items-center gap-[6px] relative z-20 font-medium">
                  任务接收完毕
                </div>
              </div>

              <DocumentParseTrace
                v-if="msg.type === 'langgraph_trace'"
                v-model="isTraceCollapsed"
                :steps="agentSteps"
                @toggle-step="toggleStepExpand"
              />

              <div
                v-if="msg.type === 'intent_form' && showIntentForm && clarificationForm"
                class="mb-[36px] relative animate-in fade-in slide-in-from-bottom-4 duration-500 w-full pl-[4px] pr-[16px]"
              >
                <IntentClarificationForm
                  v-model:answers="intentAnswers"
                  v-model:additionalNotes="intentFormData.additionalInfo"
                  :form="clarificationForm"
                  :countdown="formCountdown"
                  :intent-submitted="isIntentFormSubmitted"
                  :pipeline-running="pipelineRunning"
                  @confirm="confirmForm"
                  @skip="skipForm"
                  @add-option="onAddIntentOption"
                />
              </div>

              <!-- Pipeline Steps Trace -->
              <DocumentParseTrace
                v-if="msg.type === 'pipeline_trace'"
                v-model="isPipelineTraceCollapsed"
                :steps="pipelineSteps"
                @toggle-step="togglePipelineStepExpand"
              />

              <!-- AI Text Message -->
              <div v-if="msg.type === 'ai_text'" class="mb-[36px] relative animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
                <div class="text-[14.5px] text-[#1a1a1a] leading-[1.6] w-full relative z-20 mt-[6px]">
                  {{ msg.text }}
                </div>
              </div>

            </template>
          </div>

        </div>
      </div>
    </div>

    <!-- LangGraph Pipeline Node Modal -->
    <PipelineGraphModal 
      :show="showGraphModal" 
      :steps="pipelineReactSteps" 
      @close="showGraphModal = false" 
    />

  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.08);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.15);
}
</style>