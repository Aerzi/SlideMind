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

const isOptimizing = ref(false)
const isOptimized = ref(false)
const displayedTopic = ref(props.topic?.trim() || '（可在上一页补充主题说明）')

const optimizeTopic = () => {
  if (isOptimizing.value || isOptimized.value) return
  isOptimizing.value = true
  
  const original = props.topic?.trim() || ''
  
  let optimizedText = ''
  if (original.includes('跨境电商行业发展前景')) {
    optimizedText = '帮我生成一份关于"跨境电商行业发展前景"的PPT，包含行业现状、市场规模、竞争格局、未来趋势等内容'
  } else {
    const cleanTopic = original.replace(/^帮我生成一份PPT，内容是关于/g, '').replace(/^["']|["']$/g, '')
    optimizedText = `帮我生成一份关于"${cleanTopic}"的PPT，包含行业现状、市场规模、竞争格局、未来趋势等内容`
  }
  
  let i = 0
  displayedTopic.value = ''
  
  const typeWriter = setInterval(() => {
    if (i < optimizedText.length) {
      displayedTopic.value += optimizedText.charAt(i)
      i++
    } else {
      clearInterval(typeWriter)
      isOptimizing.value = false
      isOptimized.value = true
    }
  }, 30)
}

const discardOptimization = () => {
  isOptimized.value = false
  displayedTopic.value = props.topic?.trim() || '（可在上一页补充主题说明）'
}

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
                <div class="bg-[#f2f3f5] text-[#1a1a1a] px-[20px] py-[14px] rounded-[16px] rounded-tr-[4px] text-[15px] leading-[1.6] w-fit max-w-full group">
                  <span class="whitespace-pre-wrap">{{ displayedTopic }}</span>
                  
                  <!-- 一键优化按钮 -->
                  <div 
                    v-if="!isOptimizing && !isOptimized"
                    @click="optimizeTopic"
                    class="inline-flex items-center gap-1 ml-2 px-2 py-[2px] rounded-md bg-white border border-gray-200 text-[#333333] text-[13px] cursor-pointer hover:bg-gray-50 transition-colors align-middle shadow-sm"
                  >
                    <span class="flex items-center justify-center w-4 h-4" style="line-height: 0;">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <g style="fill:#333333;stroke:#333333;stroke-width:1px;">
                          <path d="M10.3047 6.23047L12.6673 8.59313" stroke-linejoin="round" fill="none" vector-effect="non-scaling-stroke"></path>
                          <path d="M11.829 4.6688L5.02951 11.1047C4.74251 11.3764 4.54241 11.727 4.45449 12.1122L4.00442 14.0842C3.95529 14.2995 4.14768 14.4923 4.36304 14.4436L6.39867 13.9835C6.74729 13.9047 7.06842 13.7339 7.32866 13.489L14.148 7.06928C14.5587 6.68261 14.5685 6.03293 14.1697 5.63405L13.2236 4.68795C12.8406 4.30499 12.2224 4.2965 11.829 4.6688Z" stroke-linecap="round" stroke-linejoin="round" fill="none" vector-effect="non-scaling-stroke"></path>
                        </g>
                        <g style="fill:#333333;stroke:#333333;stroke-width:1px;">
                          <path d="M3.5 3C3.58821 3 3.66236 3.06578 3.68281 3.15159C3.77213 3.52625 3.82562 3.73318 3.9082 3.91602C4.14383 4.43734 4.56176 4.85504 5.08301 5.09082C5.26559 5.17339 5.47246 5.22675 5.84644 5.31595C5.93285 5.33656 6 5.41117 6 5.5C6 5.58824 5.93322 5.66237 5.8474 5.68288C5.47271 5.77241 5.26578 5.82653 5.08301 5.90918C4.56176 6.14496 4.14383 6.56266 3.9082 7.08398C3.82569 7.26666 3.77205 7.47335 3.68284 7.84739C3.66236 7.93322 3.58824 8 3.5 8C3.41117 8 3.33657 7.93284 3.31599 7.84643C3.22711 7.4731 3.17423 7.26647 3.0918 7.08398C2.85617 6.56266 2.43823 6.14496 1.91699 5.90918C1.73407 5.82646 1.52688 5.77249 1.15158 5.68286C1.06578 5.66237 1 5.58821 1 5.5C1 5.4112 1.06616 5.33656 1.15253 5.31597C1.52714 5.22667 1.73425 5.17346 1.91699 5.09082C2.43824 4.85504 2.85617 4.43734 3.0918 3.91602C3.1743 3.73337 3.22703 3.5265 3.31601 3.15254C3.33657 3.06616 3.41121 3 3.5 3Z" stroke="none"></path>
                          <path d="M7.5 0.5C7.57057 0.5 7.62989 0.552627 7.64625 0.62127C7.7177 0.920997 7.76049 1.08654 7.82656 1.23281C8.01506 1.64987 8.34941 1.98403 8.76641 2.17266C8.91247 2.23871 9.07797 2.2814 9.37715 2.35276C9.44628 2.36925 9.5 2.42894 9.5 2.5C9.5 2.5706 9.44658 2.6299 9.37792 2.6463C9.07817 2.71793 8.91262 2.76122 8.76641 2.82734C8.34941 3.01597 8.01506 3.35013 7.82656 3.76719C7.76055 3.91333 7.71764 4.07868 7.64627 4.37791C7.62989 4.44658 7.57059 4.5 7.5 4.5C7.42894 4.5 7.36925 4.44627 7.35279 4.37715C7.28169 4.07848 7.23938 3.91318 7.17344 3.76719C6.98494 3.35013 6.65059 3.01597 6.23359 2.82734C6.08725 2.76116 5.92151 2.71799 5.62126 2.64629C5.55262 2.62989 5.5 2.57057 5.5 2.5C5.5 2.42896 5.55292 2.36925 5.62203 2.35277C5.92171 2.28133 6.0874 2.23877 6.23359 2.17266C6.65059 1.98403 6.98494 1.64987 7.17344 1.23281C7.23944 1.0867 7.28162 0.921202 7.35281 0.622035C7.36925 0.552929 7.42896 0.5 7.5 0.5Z" stroke="none"></path>
                        </g>
                      </svg>
                    </span>
                    <span>一键优化</span>
                  </div>

                  <!-- 优化中 loading -->
                  <div 
                    v-if="isOptimizing"
                    class="inline-flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-md bg-white border border-gray-200 text-blue-500 text-[13px] align-middle shadow-sm"
                  >
                    <svg class="animate-spin w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>优化中...</span>
                  </div>

                  <!-- 弃用按钮 -->
                  <div 
                    v-if="isOptimized"
                    @click="discardOptimization"
                    class="inline-flex items-center gap-1 ml-2 px-2 py-[2px] rounded-md bg-white border border-gray-200 text-gray-500 text-[13px] cursor-pointer hover:bg-gray-50 hover:text-red-500 transition-colors align-middle shadow-sm"
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <g style="fill:#6b7280;stroke:#6b7280;stroke-width:1px;">
                        <path d="M10.3047 6.23047L12.6673 8.59313" stroke-linejoin="round" fill="none" vector-effect="non-scaling-stroke"></path>
                        <path d="M11.829 4.6688L5.02951 11.1047C4.74251 11.3764 4.54241 11.727 4.45449 12.1122L4.00442 14.0842C3.95529 14.2995 4.14768 14.4923 4.36304 14.4436L6.39867 13.9835C6.74729 13.9047 7.06842 13.7339 7.32866 13.489L14.148 7.06928C14.5587 6.68261 14.5685 6.03293 14.1697 5.63405L13.2236 4.68795C12.8406 4.30499 12.2224 4.2965 11.829 4.6688Z" stroke-linecap="round" stroke-linejoin="round" fill="none" vector-effect="non-scaling-stroke"></path>
                      </g>
                    </svg>
                    <span>弃用</span>
                  </div>
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