import JSZip from 'jszip'
import * as XLSX from 'xlsx'
import mammoth from 'mammoth'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

/** mammoth 运行时含 convertToMarkdown，官方 .d.ts 未导出 */
type MammothConvert = (input: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>
const convertDocxToMarkdown = (mammoth as unknown as { convertToMarkdown: MammothConvert }).convertToMarkdown

const MAX_MARKDOWN_CHARS = 500_000

let workerConfigured = false

function ensurePdfWorker() {
  if (!workerConfigured) {
    GlobalWorkerOptions.workerSrc = pdfWorkerUrl
    workerConfigured = true
  }
}

function stripExtension(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, '') || fileName
}

/** Plain text / loose lines → readable Markdown body */
function plainTextToMarkdownBody(text: string, title: string) {
  const t = text.replace(/\r\n/g, '\n').trim()
  if (!t) return `_（无文本内容）_`
  const head = `# ${stripExtension(title)}\n\n`
  if (t.startsWith('#')) return t
  return head + t
}

async function pdfArrayBufferToMarkdown(data: ArrayBuffer, fileName: string, onProgress?: (progress: number) => void) {
  ensurePdfWorker()
  const pdf = await getDocument({ data: new Uint8Array(data) }).promise
  const lines: string[] = [`# ${stripExtension(fileName)}`, '']
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join('')
      .replace(/\s+/g, ' ')
      .trim()
    if (pdf.numPages > 1) {
      lines.push(`## 第 ${i} 页`, '', pageText || '_（本页无提取到文本）_', '')
    } else {
      lines.push(pageText || '_（无文本内容）_', '')
    }
    if (onProgress) {
      onProgress(Math.round((i / pdf.numPages) * 100))
    }
  }
  return lines.join('\n').trim()
}

/** OOXML 演示文稿（pptx / ppsx / pptm） */
async function pptxLikeToMarkdown(buf: ArrayBuffer, fileName: string) {
  const zip = await JSZip.loadAsync(buf)
  const slidePaths = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/i.test(n))
    .sort((a, b) => {
      const na = parseInt(a.replace(/[^\d]/g, ''), 10) || 0
      const nb = parseInt(b.replace(/[^\d]/g, ''), 10) || 0
      return na - nb
    })
  if (slidePaths.length === 0) {
    throw new Error('未在演示文稿中找到幻灯片内容（请确认文件完整）')
  }
  const lines: string[] = [`# ${stripExtension(fileName)}`, '']
  for (let i = 0; i < slidePaths.length; i++) {
    const xml = await zip.file(slidePaths[i])!.async('string')
    const text = extractOfficeDrawingText(xml)
    if (slidePaths.length > 1) {
      lines.push(`## 第 ${i + 1} 张幻灯片`, '', text || '_（本页未提取到文本）_', '')
    } else {
      lines.push(text || '_（未提取到文本）_', '')
    }
  }
  return lines.join('\n').trim()
}

function extractOfficeDrawingText(xml: string): string {
  const parts: string[] = []
  const re = /<(?:a|p|w|m|c):t[^>]*>([^<]*)<\/(?:a|p|w|m|c):t>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) !== null) {
    if (m[1]?.trim()) parts.push(m[1])
  }
  if (parts.length === 0) {
    return xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

function rowsToMarkdownTable(rows: unknown[][]): string {
  if (rows.length === 0) return '_（空）_'
  const maxCols = Math.max(...rows.map((r) => r.length), 0)
  const pad = (r: unknown[], len: number) => {
    const a = [...r]
    while (a.length < len) a.push('')
    return a
  }
  const esc = (s: string) => s.replace(/\|/g, '\\|')
  const normalized = rows.map((r) => pad(r, maxCols).map((c) => esc(String(c ?? ''))))
  const header = normalized[0]
  const sep = header.map(() => '---')
  let md = '| ' + header.join(' | ') + ' |\n'
  md += '| ' + sep.join(' | ') + ' |\n'
  for (let i = 1; i < normalized.length; i++) {
    md += '| ' + normalized[i].join(' | ') + ' |\n'
  }
  return md
}

async function spreadsheetBufferToMarkdown(buf: ArrayBuffer, fileName: string) {
  const wb = XLSX.read(buf, { type: 'array', cellDates: true })
  if (!wb.SheetNames.length) {
    return `# ${stripExtension(fileName)}\n\n_（工作簿无工作表）_`
  }
  let out = `# ${stripExtension(fileName)}\n\n`
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name]
    const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: '',
      raw: false,
    }) as unknown[][]
    const nonEmpty = data.filter((row) =>
      row.some((c) => String(c ?? '').trim() !== ''),
    )
    out += `## ${name}\n\n`
    if (nonEmpty.length === 0) {
      out += '_（空表）_\n\n'
    } else if (nonEmpty.length === 1) {
      out += nonEmpty[0].map((c) => String(c ?? '')).join('\t') + '\n\n'
    } else {
      out += rowsToMarkdownTable(nonEmpty as unknown[][]) + '\n\n'
    }
  }
  return out.trim()
}

async function zipOfficeXmlTextFallback(buf: ArrayBuffer, fileName: string, tag: string) {
  const zip = await JSZip.loadAsync(buf)
  const chunks: string[] = []
  for (const path of Object.keys(zip.files).sort()) {
    const f = zip.files[path]
    if (f.dir) continue
    if (!/\.(xml|htm|html)$/i.test(path)) continue
    const raw = await f.async('string')
    const t = raw
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    const plain = t
      .replace(/<[^>]+>/g, '\n')
      .replace(/[ \t\f\v]+/g, ' ')
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .join('\n')
    if (plain.length > 30) {
      chunks.push(`### ${path}\n\n${plain.slice(0, 12000)}${plain.length > 12000 ? '…' : ''}`)
    }
  }
  if (chunks.length === 0) {
    throw new Error(`无法从 ${tag} 中提取可读文本`)
  }
  return `# ${stripExtension(fileName)}\n\n_（${tag}：以下为从文档包内抽取的文本）_\n\n${chunks.join('\n\n---\n\n')}`
}

async function otlToMarkdown(buf: ArrayBuffer, fileName: string) {
  try {
    const result = await convertDocxToMarkdown({ arrayBuffer: buf })
    const v = result.value.trim()
    if (v.length > 20) return v
  } catch {
    /* 非 Word OOXML */
  }
  const u8 = new Uint8Array(buf.slice(0, 2))
  if (u8[0] === 0x50 && u8[1] === 0x4b) {
    return await zipOfficeXmlTextFallback(buf, fileName, 'WPS 智能文档')
  }
  const decoded = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(buf))
  return plainTextToMarkdownBody(decoded, fileName)
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Reads a user file in the browser and returns Markdown suitable for downstream AI / preview.
 */
export async function fileToMarkdown(file: File, onProgress?: (progress: number) => void): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  const buf = await file.arrayBuffer()

  let markdown: string

  switch (ext) {
    case 'md':
    case 'markdown':
      markdown = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(buf))
      break
    case 'txt':
    case 'log':
      markdown = plainTextToMarkdownBody(
        new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(buf)),
        file.name,
      )
      break
    case 'docx':
      {
        const result = await convertDocxToMarkdown({ arrayBuffer: buf })
        markdown = result.value.trim() || '_（文档无文本内容）_'
      }
      break
    case 'doc':
      try {
        const result = await convertDocxToMarkdown({ arrayBuffer: buf })
        markdown = result.value.trim() || '_（文档无文本内容）_'
      } catch {
        throw new Error('无法解析该 .doc 文件，请另存为 .docx 后重试')
      }
      break
    case 'pdf':
      markdown = await pdfArrayBufferToMarkdown(buf, file.name, onProgress)
      break
    case 'ppt':
    case 'pps':
      throw new Error('暂不支持旧版二进制演示文稿（.ppt/.pps），请在 PowerPoint / WPS 中另存为 .pptx 后再上传')
    case 'pptx':
    case 'pptm':
    case 'ppsx':
      markdown = await pptxLikeToMarkdown(buf, file.name)
      break
    case 'xls':
    case 'xlsx':
    case 'xlsm':
    case 'csv':
    case 'ods':
      markdown = await spreadsheetBufferToMarkdown(buf, file.name)
      break
    case 'et':
    case 'ett':
      try {
        markdown = await spreadsheetBufferToMarkdown(buf, file.name)
      } catch {
        markdown = await zipOfficeXmlTextFallback(buf, file.name, 'WPS 表格')
      }
      break
    case 'otl':
      markdown = await otlToMarkdown(buf, file.name)
      break
    default: {
      const text = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(buf))
      const head = text.slice(0, 4096)
      if (/\u0000/.test(head)) {
        throw new Error(
          `不支持的文件类型 .${ext}。请使用：doc、docx、txt、pdf、otl、pptx、xls、xlsx、csv、et 等`,
        )
      }
      markdown = plainTextToMarkdownBody(text, file.name)
      break
    }
  }

  if (markdown.length > MAX_MARKDOWN_CHARS) {
    markdown =
      markdown.slice(0, MAX_MARKDOWN_CHARS) +
      '\n\n_…（内容过长，已截断；可拆分文档后上传）_'
  }

  return markdown
}
