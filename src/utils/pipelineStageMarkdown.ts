import {
  deckPageFullSchema,
  parseDeckPagesJson,
  type DeckPageBase,
  type DeckPageFull,
} from '../agents/outline/deckOutline'

const MAX_COMBINED_PREVIEW = 12000

function fenceJson(label: string, raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return `_${label}（空）_\n`
  return `### ${label}\n\n\`\`\`json\n${trimmed}\n\`\`\`\n`
}

function fenceMd(label: string, body: string): string {
  const t = body.trim()
  if (!t) return `### ${label}\n\n_（空）_\n`
  return `### ${label}\n\n${t}\n`
}

/** 从终稿 Markdown 中解析 ```json 代码块为页数组 */
export function parsePagesFromFinalOutlineMarkdown(md: string): DeckPageFull[] | null {
  const m = md.match(/```json\s*([\s\S]*?)```/)
  if (!m) return null
  try {
    const data = JSON.parse(m[1].trim()) as unknown
    if (!Array.isArray(data)) return null
    const out: DeckPageFull[] = []
    for (const item of data) {
      const p = deckPageFullSchema.safeParse(item)
      if (p.success) out.push(p.data)
    }
    return out.length ? out : null
  } catch {
    return null
  }
}

function formatBasePagesMarkdown(pages: DeckPageBase[], title: string): string {
  const lines: string[] = [`# ${title}`, '', '> 本阶段仅含页级正文结构，版式说明在下一步补充。', '']
  pages.forEach((p, i) => {
    lines.push(`## 第 ${i + 1} 页 · ${p.title}`)
    lines.push('')
    lines.push(`**页面类型** \`${p.page_type}\``)
    lines.push('')
    lines.push('### 内容信息')
    lines.push('')
    lines.push(p.content_description.trim() || '_（空）_')
    lines.push('')
    if (i < pages.length - 1) lines.push('---', '')
  })
  return lines.join('\n')
}

export function formatFullPagesMarkdown(pages: DeckPageFull[]): string {
  const lines: string[] = [
    '# 终稿页级大纲',
    '',
    '> 横线以上为页内正文要点，横线以下为版式与阅读路径说明。',
    '',
  ]
  pages.forEach((p, i) => {
    lines.push(`## 第 ${i + 1} 页 · ${p.title}`)
    lines.push('')
    lines.push(`**页面类型** \`${p.page_type}\``)
    lines.push('')
    lines.push('### 内容信息')
    lines.push('')
    lines.push(p.content_description.trim() || '_（空）_')
    lines.push('')
    lines.push('---')
    lines.push('')
    lines.push('### 版式说明')
    lines.push('')
    lines.push(p.design_style.trim() || '_（空）_')
    lines.push('')
    if (i < pages.length - 1) lines.push('---', '')
  })
  return lines.join('\n')
}

/**
 * 将 LangGraph 节点完成时的 state 转为该阶段中间区展示的 Markdown 正文。
 */
export function buildStageMarkdownForNode(node: string, state: Record<string, unknown>): string {
  switch (node) {
    case 'material_gate': {
      const combined = String(state.combinedDocuments ?? '')
      const preview =
        combined.length > MAX_COMBINED_PREVIEW
          ? combined.slice(0, MAX_COMBINED_PREVIEW) +
            `\n\n_…已截断，共 ${combined.length.toLocaleString()} 字_`
          : combined
      const clarified = String(state.clarifiedIntentJson ?? '')
      let pretty = clarified
      try {
        pretty = JSON.stringify(JSON.parse(clarified), null, 2)
      } catch {
        /* keep raw */
      }
      return [
        '# 素材与意图门槛',
        '',
        '## 合并素材（Markdown）',
        '',
        preview.trim() || '_（无合并素材）_',
        '',
        '---',
        '',
        fenceJson('澄清意图（JSON）', pretty),
      ].join('\n')
    }
    case 'build_storyline': {
      const md = String(state.storylineMarkdown ?? '')
      return ['# 故事线骨架', '', fenceMd('故事线（Markdown）', md)].join('\n')
    }
    case 'evaluate_storyline': {
      const evaluated = String(state.evaluatedStorylineMarkdown ?? '')
      const notes = String(state.storylineEvaluationNotes ?? '')
      const rq = String(state.ragQueriesJson ?? '[]')
      let queriesMd = ''
      try {
        const arr = JSON.parse(rq) as unknown
        if (Array.isArray(arr)) {
          queriesMd = arr
            .filter((x): x is string => typeof x === 'string')
            .map((q, i) => `${i + 1}. ${q}`)
            .join('\n')
        }
      } catch {
        queriesMd = rq
      }
      return [
        '# 故事线评估与检索查询',
        '',
        fenceMd('评估后故事线（Markdown）', evaluated),
        '---',
        '',
        fenceMd('评估备注', notes),
        '---',
        '',
        '### 检索查询列表',
        '',
        queriesMd.trim() || '_（空）_',
        '',
      ].join('\n')
    }
    case 'retrieve_private_rag': {
      const recall = String(state.recallDocument ?? '')
      return ['# 私域召回汇编', '', fenceMd('召回文档（Markdown）', recall)].join('\n')
    }
    case 'generate_deck_pages': {
      const raw = String(state.deckPagesJson ?? '')
      const pages = parseDeckPagesJson(raw)
      if (!pages?.length) {
        return [
          '# 页级大纲（JSON）',
          '',
          '_解析失败或为空，以下为原始字符串：_',
          '',
          '```json',
          raw.slice(0, 16000) || '（空）',
          raw.length > 16000 ? '\n…' : '',
          '```',
        ].join('\n')
      }
      return formatBasePagesMarkdown(pages, '页级大纲（未含版式）')
    }
    case 'enrich_design_styles': {
      const finalMd = String(state.finalOutlineMarkdown ?? '')
      const pages = parsePagesFromFinalOutlineMarkdown(finalMd)
      if (pages?.length) return formatFullPagesMarkdown(pages)
      return ['# 版式说明补充', '', fenceMd('终稿（原始 Markdown）', finalMd)].join('\n')
    }
    case 'quality_check': {
      const notes = String(state.qualityNotes ?? '')
      return ['# 一致性质检', '', fenceMd('质检备注（Markdown）', notes)].join('\n')
    }
    default:
      return `# 节点 ${node}\n\n_暂无专用展示模板。_\n`
  }
}

/** 右侧「终稿大纲」标签：优先用横线区分内容与版式；解析失败则回退原始 Markdown */
export function markdownForOutlineTab(finalOutlineMarkdown: string): string {
  const pages = parsePagesFromFinalOutlineMarkdown(finalOutlineMarkdown)
  if (pages?.length) return formatFullPagesMarkdown(pages)
  return finalOutlineMarkdown || '（暂无终稿大纲）'
}
