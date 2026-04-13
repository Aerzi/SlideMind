/**
 * 占位 RAG：接入 AIDOCX 后替换为真实向量召回 + 重排。
 * 当前根据「故事线评估」产出的检索查询，从合并正文中做关键词窗口抽取，生成「召回文档」。
 */
const WINDOW = 900
const MAX_QUERIES = 10

function keywordWindow(text: string, query: string): string {
  const needle = query.trim().slice(0, 120)
  if (!needle) return text.slice(0, WINDOW) + (text.length > WINDOW ? '…' : '')
  const idx = text.toLowerCase().indexOf(needle.toLowerCase())
  if (idx === -1) {
    const head = text.slice(0, WINDOW)
    return head + (text.length > WINDOW ? '…' : '')
  }
  const start = Math.max(0, idx - Math.floor(WINDOW / 3))
  const slice = text.slice(start, start + WINDOW)
  return (start > 0 ? '…' : '') + slice + (start + WINDOW < text.length ? '…' : '')
}

export function buildPlaceholderRecallDocument(params: {
  combinedDocuments: string
  ragQueries: string[]
}): { recallDocument: string; chunkCount: number } {
  const queries = params.ragQueries
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_QUERIES)

  if (queries.length === 0) {
    const fallback = params.combinedDocuments.slice(0, 12_000)
    return {
      recallDocument:
        `【占位召回：未生成有效检索查询，以下为正文前部摘录】\n\n${fallback}${params.combinedDocuments.length > 12_000 ? '\n\n…' : ''}`,
      chunkCount: 1,
    }
  }

  const parts: string[] = []
  queries.forEach((q, i) => {
    const body = keywordWindow(params.combinedDocuments, q)
    if (body.trim()) {
      parts.push(`### 片段 ${i + 1} · 查询「${q.slice(0, 60)}${q.length > 60 ? '…' : ''}」\n\n${body}`)
    }
  })

  const recallDocument = parts.join('\n\n---\n\n')
  return {
    recallDocument:
      recallDocument.trim() ||
      params.combinedDocuments.slice(0, 8000) + '\n\n_（占位：未匹配到关键词窗口）_',
    chunkCount: Math.max(1, parts.length),
  }
}
