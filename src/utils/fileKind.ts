import type { UploadedFileKind } from '../types/uploadedFile'

/** 与角标字母一致：同一大类使用同一字母，便于列表与对话区样式统一 */
export function fileKindLetter(kind: UploadedFileKind): string {
  switch (kind) {
    case 'pdf':
      return 'P'
    case 'word':
      return 'W'
    case 'markdown':
      return 'M'
    case 'presentation':
      return 'S'
    case 'spreadsheet':
      return 'E'
    case 'wps_smart':
      return 'O'
    default:
      return 'T'
  }
}

/**
 * 按扩展名归类（与 accept、解析器支持的格式对齐）
 */
export function inferUploadedFileKind(fileName: string): UploadedFileKind {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''

  if (ext === 'pdf') return 'pdf'
  if (ext === 'doc' || ext === 'docx') return 'word'
  if (ext === 'md' || ext === 'markdown') return 'markdown'
  if (ext === 'ppt' || ext === 'pptx' || ext === 'pptm' || ext === 'pps' || ext === 'ppsx') {
    return 'presentation'
  }
  if (
    ext === 'xls' ||
    ext === 'xlsx' ||
    ext === 'xlsm' ||
    ext === 'csv' ||
    ext === 'et' ||
    ext === 'ett' ||
    ext === 'ods'
  ) {
    return 'spreadsheet'
  }
  if (ext === 'otl') return 'wps_smart'

  return 'text'
}
