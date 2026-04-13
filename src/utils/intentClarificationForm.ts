import { askAssistant } from '../services/ai'
import type { ClarifiedIntent } from '../agents/outline/schema'

/** 与图二维度对齐，便于映射到 ClarifiedIntent */
export type IntentQuestionMapsTo =
  | 'presentationGoal'
  | 'usageScenario'
  | 'targetAudience'
  | 'pageCountHint'
  | 'tone'
  | 'mustCover'
  | 'mustAvoid'
  | 'narrativeStructure'
  | 'publicInfoRule'
  | 'detailLevel'
  | 'other'

export type IntentQuestionType = 'single' | 'multi' | 'text'

export type IntentQuestionOption = {
  id: string
  label: string
  hint?: string
}

export type IntentQuestion = {
  id: string
  title: string
  /** 题目说明 + 推荐选项的理由（对应图一描述区） */
  description: string
  type: IntentQuestionType
  options: IntentQuestionOption[]
  /** 单选推荐 */
  recommendedId?: string
  /** 多选推荐 */
  recommendedIds?: string[]
  /** 文本题默认值 */
  defaultText?: string
  /** 映射到后端 ClarifiedIntent 字段（可多题 other） */
  mapsToField?: IntentQuestionMapsTo
  allowAddOption?: boolean
  /** 多选时展示「全选」 */
  showSelectAll?: boolean
}

export type IntentClarificationFormPayload = {
  /** 卡片主标题，如图三 */
  formTitle?: string
  subtitle: string
  questions: IntentQuestion[]
}

const MAX_DOC_CHARS = 12_000

function extractJsonObject(text: string): unknown {
  const m = text.match(/\{[\s\S]*\}/)
  return JSON.parse(m ? m[0] : text)
}

function asStr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function normalizeOptions(raw: unknown): IntentQuestionOption[] {
  if (!Array.isArray(raw)) return []
  const out: IntentQuestionOption[] = []
  for (let i = 0; i < raw.length; i++) {
    const x = raw[i]
    if (!x || typeof x !== 'object') continue
    const o = x as Record<string, unknown>
    const id = asStr(o.id) || `opt_${i + 1}`
    const label = asStr(o.label)
    if (!label) continue
    const hint = asStr(o.hint)
    out.push({ id, label, hint: hint || undefined })
  }
  return out
}

function normalizeQuestion(raw: unknown, idx: number): IntentQuestion | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id = asStr(o.id) || `q${idx + 1}`
  const title = asStr(o.title)
  const description = asStr(o.description)
  const type = asStr(o.type) as IntentQuestionType
  if (!title || !description) return null
  if (type !== 'single' && type !== 'multi' && type !== 'text') return null

  const options = normalizeOptions(o.options)
  const mapsToField = asStr(o.mapsToField) as IntentQuestionMapsTo | ''
  const mf = [
    'presentationGoal',
    'usageScenario',
    'targetAudience',
    'pageCountHint',
    'tone',
    'mustCover',
    'mustAvoid',
    'narrativeStructure',
    'publicInfoRule',
    'detailLevel',
    'other',
  ].includes(mapsToField)
    ? (mapsToField as IntentQuestionMapsTo)
    : undefined

  if (type !== 'text' && options.length < 2) return null

  const q: IntentQuestion = {
    id,
    title,
    description,
    type,
    options,
    mapsToField: mf,
    allowAddOption: o.allowAddOption === true,
    showSelectAll: o.showSelectAll === true,
  }

  if (type === 'single') {
    const rid = asStr(o.recommendedId)
    q.recommendedId = rid && options.some((x) => x.id === rid) ? rid : options[0]!.id
  } else if (type === 'multi') {
    const rids = o.recommendedIds
    const arr = Array.isArray(rids)
      ? rids.map((x) => asStr(x)).filter((id) => options.some((op) => op.id === id))
      : []
    q.recommendedIds = arr.length ? arr : [options[0]!.id]
  } else {
    q.defaultText = asStr(o.defaultText)
  }

  return q
}

function normalizePayload(data: unknown): IntentClarificationFormPayload | null {
  if (!data || typeof data !== 'object') return null
  const o = data as Record<string, unknown>
  const subtitle = asStr(o.subtitle)
  const qs = o.questions
  if (!subtitle || !Array.isArray(qs) || qs.length < 3) return null

  const questions: IntentQuestion[] = []
  for (let i = 0; i < qs.length; i++) {
    const nq = normalizeQuestion(qs[i], i)
    if (nq) questions.push(nq)
  }
  if (questions.length < 3) return null

  return {
    formTitle: asStr(o.formTitle) || undefined,
    subtitle,
    questions,
  }
}

export function initAnswersFromForm(form: IntentClarificationFormPayload): Record<string, string | string[]> {
  const acc: Record<string, string | string[]> = {}
  for (const q of form.questions) {
    if (q.type === 'single') {
      acc[q.id] = q.recommendedId ?? q.options[0]?.id ?? ''
    } else if (q.type === 'multi') {
      acc[q.id] = [...(q.recommendedIds?.length ? q.recommendedIds : [q.options[0]!.id])]
    } else {
      acc[q.id] = q.defaultText ?? ''
    }
  }
  return acc
}

function labelOf(q: IntentQuestion, oid: string): string {
  return q.options.find((o) => o.id === oid)?.label ?? oid
}

/**
 * 将动态澄清结果写入 ClarifiedIntent，便于图内 formatIntentBlock 使用。
 */
export function buildClarifiedIntentFromClarificationForm(
  questions: IntentQuestion[],
  answers: Record<string, string | string[]>,
  userNotes: string,
): ClarifiedIntent {
  let presentationGoal = ''
  let targetAudience = ''
  let pageCountHint: string | undefined
  let tone: string | undefined
  let mustCover: string[] | undefined
  let mustAvoid: string[] | undefined
  const narrativeParts: string[] = []

  for (const q of questions) {
    const raw = answers[q.id]
    const field = q.mapsToField ?? 'other'

    if (q.type === 'text') {
      const t = typeof raw === 'string' ? raw.trim() : ''
      if (!t) continue
      if (field === 'narrativeStructure') narrativeParts.push(t)
      else if (field === 'presentationGoal' && !presentationGoal) presentationGoal = t
      else if (field === 'other') narrativeParts.push(`${q.title}：${t}`)
      continue
    }

    if (q.type === 'single' && typeof raw === 'string') {
      const lab = labelOf(q, raw)
      if (field === 'presentationGoal') presentationGoal = presentationGoal ? `${presentationGoal}；${lab}` : lab
      else if (field === 'usageScenario') presentationGoal = presentationGoal ? `${presentationGoal}（场景：${lab}）` : lab
      else if (field === 'targetAudience') targetAudience = lab
      else if (field === 'pageCountHint') pageCountHint = lab
      else if (field === 'tone') tone = lab
      else if (field === 'publicInfoRule') narrativeParts.push(`公域补充：${lab}`)
      else if (field === 'detailLevel') narrativeParts.push(`详实度：${lab}`)
      else narrativeParts.push(`${q.title}：${lab}`)
      continue
    }

    if (q.type === 'multi' && Array.isArray(raw)) {
      const labels = raw.map((id) => labelOf(q, String(id))).filter(Boolean)
      if (field === 'mustCover') mustCover = labels
      else if (field === 'mustAvoid') mustAvoid = labels
      else narrativeParts.push(`${q.title}：${labels.join('、')}`)
    }
  }

  if (!presentationGoal) {
    const t = questions.find((q) => q.mapsToField === 'presentationGoal' || q.mapsToField === 'usageScenario')
    if (t?.type === 'single' && typeof answers[t.id] === 'string') {
      presentationGoal = labelOf(t, answers[t.id] as string)
    }
  }
  if (!targetAudience) {
    const t = questions.find((q) => q.mapsToField === 'targetAudience')
    if (t?.type === 'single' && typeof answers[t.id] === 'string') {
      targetAudience = labelOf(t, answers[t.id] as string)
    }
  }

  const clarificationJson = JSON.stringify(
    questions.map((q) => ({
      id: q.id,
      title: q.title,
      value: answers[q.id],
    })),
  )

  const additionalInfo = [
    userNotes.trim(),
    narrativeParts.length ? `【叙事与补充】${narrativeParts.join('；')}` : '',
    `【澄清作答JSON】${clarificationJson}`,
  ]
    .filter(Boolean)
    .join('\n\n')

  return {
    presentationGoal: presentationGoal || '（未指定演示目标）',
    targetAudience: targetAudience || '（未指定受众）',
    pageCountHint,
    tone,
    mustCover,
    mustAvoid,
    additionalInfo: additionalInfo || undefined,
  }
}

export function getFallbackIntentClarificationForm(topic: string): IntentClarificationFormPayload {
  const short = topic.trim()
  return {
    formTitle: '请确认创作意图',
    subtitle: short
      ? `已结合主题「${short.length > 28 ? `${short.slice(0, 28)}…` : short}」生成默认澄清项；上传文档后编排仍会纳入素材。`
      : '已生成通用澄清项；可在上一页补充主题或上传素材。',
    questions: [
      {
        id: 'q_goal',
        title: '生成目标 / 使用场景',
        description:
          '【P0】决定叙事重心与语气。若文档中有汇报/分享语境，将优先匹配；否则请选最接近的一项。',
        type: 'single',
        mapsToField: 'usageScenario',
        allowAddOption: true,
        options: [
          { id: 'o1', label: '向上汇报 / 述职评审' },
          { id: 'o2', label: '客户或合作方提案' },
          { id: 'o3', label: '内部培训 / 分享' },
          { id: 'o4', label: '学术或课题答辩' },
        ],
        recommendedId: 'o1',
      },
      {
        id: 'q_audience',
        title: '目标受众是谁？',
        description: '【P0】影响术语深度与信息密度。选项为通用画像，可结合主题理解。',
        type: 'single',
        mapsToField: 'targetAudience',
        allowAddOption: true,
        options: [
          { id: 'a1', label: '决策层 / 管理者' },
          { id: 'a2', label: '专业同事 / 技术同行' },
          { id: 'a3', label: '业务方 / 非专业听众' },
          { id: 'a4', label: '学生 / 新手学习者' },
        ],
        recommendedId: 'a2',
      },
      {
        id: 'q_pages',
        title: '页数 / 时长期望',
        description: '【P1】用于控制大纲体量；若不确定可选最后一项。',
        type: 'single',
        mapsToField: 'pageCountHint',
        options: [
          { id: 'p1', label: '约 8–12 页（短讲）' },
          { id: 'p2', label: '约 15–20 页（标准）' },
          { id: 'p3', label: '约 25+ 页（详尽）' },
          { id: 'p4', label: '不确定，由你按素材取舍' },
        ],
        recommendedId: 'p2',
      },
      {
        id: 'q_must',
        title: '必须覆盖的板块（可多选）',
        description: '【P1】勾选你希望大纲中一定要出现的模块；可与素材标题不完全一致。',
        type: 'multi',
        mapsToField: 'mustCover',
        showSelectAll: true,
        allowAddOption: true,
        options: [
          { id: 'm1', label: '背景与问题定义' },
          { id: 'm2', label: '方案 / 方法' },
          { id: 'm3', label: '结果与数据' },
          { id: 'm4', label: '风险与后续计划' },
        ],
        recommendedIds: ['m1', 'm2', 'm3'],
      },
      {
        id: 'q_structure',
        title: '希望的叙事/逻辑结构',
        description: '【P2】用一句话描述即可，例如「问题-原因-对策」；也可交给后续故事线节点细化。',
        type: 'text',
        mapsToField: 'narrativeStructure',
        options: [],
        defaultText: '总览 → 分点论证 → 总结与行动项',
      },
    ],
  }
}

export async function fetchIntentClarificationForm(input: {
  topic: string
  documentMarkdowns: string[]
}): Promise<IntentClarificationFormPayload> {
  const topic = input.topic.trim() || '（用户未填写主题）'
  const combined = input.documentMarkdowns.join('\n\n---\n\n').slice(0, MAX_DOC_CHARS)

  const system = [
    '你是演示策划顾问，负责生成「意图澄清」表单 JSON。',
    '只输出一个 JSON 对象，不要 Markdown 围栏与任何解释文字。',
    '题目与选项必须结合用户主题与文档摘录；文档为空时仅依据主题合理推断，不要编造具体数据。',
    '不要输出与任务无关的固定 Demo（如具体公司产品线、特定技术栈占位）。',
  ].join('\n')

  const user = [
    '【用户主题】',
    topic,
    '',
    '【上传文档合并正文（可截断）】',
    combined || '（无正文，仅依据主题）',
    '',
    '请输出 JSON，字段：',
    '- formTitle: string，卡片主标题，建议为「请确认创作意图」。',
    '- subtitle: string，一句副标题（≤60字），说明本表单如何帮助对齐预期。',
    '- questions: 数组，长度 5～7。每题包含：',
    '  - id: 英文短 id',
    '  - title: 题干（简短）',
    '  - description: 题干说明 + **为何给出下方推荐选项**（可写「结合文档中…」「因主题偏…」）',
    '  - type: "single" | "multi" | "text"',
    '  - options: { id, label, hint? }[]；single/multi 至少 2 项；text 可为 []',
    '  - recommendedId: 单选时推荐 option id；multi 用 recommendedIds: string[]',
    '  - defaultText: 仅 text 题可选',
    '  - mapsToField: 任选其一：presentationGoal | usageScenario | targetAudience | pageCountHint | tone | mustCover | mustAvoid | narrativeStructure | publicInfoRule | detailLevel | other',
    '  - allowAddOption: boolean，选择题建议 true',
    '  - showSelectAll: boolean，多选题可为 true',
    '',
    '【维度参考 — 尽量覆盖，可合并为更少题目】',
    'P0：主题锚点、生成目标/使用场景、目标受众',
    'P1：总页数或时长、主色/品牌（若文档提到）、固定必讲章节',
    'P2：叙事结构偏好、公域补充规则、内容详实度',
    '',
    '至少包含：1 道单选「使用场景」、1 道单选「受众」、1 道多选「必覆盖板块」；其余自选。',
  ].join('\n')

  const raw = await askAssistant(user, {
    system,
    temperature: 0.35,
    max_tokens: 3500,
  })

  let data: unknown
  try {
    data = extractJsonObject(raw)
  } catch {
    return getFallbackIntentClarificationForm(input.topic)
  }

  const normalized = normalizePayload(data)
  return normalized ?? getFallbackIntentClarificationForm(input.topic)
}
