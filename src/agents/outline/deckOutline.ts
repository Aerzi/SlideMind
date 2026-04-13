import { z } from 'zod'

/** 与产品约定的页类型（可按需扩展） */
export const deckPageTypeSchema = z.enum([
  'pt_title',
  'pt_contents',
  'pt_section_title',
  'pt_text',
  'pt_end',
])

export const deckPageBaseSchema = z.object({
  page_type: deckPageTypeSchema,
  title: z.string(),
  /** 该页正文级内容（可含 Markdown 列表、表格语法等，不生成图片） */
  content_description: z.string(),
})

export const deckPageFullSchema = deckPageBaseSchema.extend({
  /** 第二步：根据整册大纲与单页内容生成的版式说明 */
  design_style: z.string(),
})

export type DeckPageBase = z.infer<typeof deckPageBaseSchema>
export type DeckPageFull = z.infer<typeof deckPageFullSchema>

export function parseDeckPagesJson(raw: string): DeckPageBase[] | null {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  if (!Array.isArray(data)) return null
  const out: DeckPageBase[] = []
  for (const item of data) {
    const p = deckPageBaseSchema.safeParse(item)
    if (p.success) out.push(p.data)
  }
  return out.length ? out : null
}

/**
 * 终稿 Markdown：外层说明 + JSON 代码块（便于下游解析与人工阅读）
 */
export function formatFinalDeckMarkdown(pages: DeckPageFull[]): string {
  const header = [
    '# 演示页级大纲（终稿）',
    '',
    '以下为按页结构化结果。`content_description` 为页内正文级要点；`design_style` 在「页级大纲」生成后，由版式补充节点依据全册结构与单页内容二次生成。',
    '',
  ].join('\n')

  return `${header}\`\`\`json\n${JSON.stringify(pages, null, 2)}\n\`\`\`\n`
}
