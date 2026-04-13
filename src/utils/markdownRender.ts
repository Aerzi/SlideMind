import { marked } from 'marked'

let configured = false

function ensureMarkedOptions() {
  if (configured) return
  marked.setOptions({ gfm: true, breaks: true })
  configured = true
}

/** 与编排页一致的 Markdown → HTML（供 MarkdownBody 等复用） */
export function renderMarkdown(md: string): string {
  ensureMarkedOptions()
  const out = marked.parse(md || '', { async: false })
  return typeof out === 'string' ? out : String(out)
}
