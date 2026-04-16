/** 与上传列表、解析流程共用的文件大类（决定角标与解析策略） */
export type UploadedFileKind =
  | 'word'
  | 'pdf'
  | 'text'
  | 'markdown'
  | 'presentation'
  | 'spreadsheet'
  /** WPS 智能文档 .otl 等 */
  | 'wps_smart'

export interface UploadedFile {
  id: string
  name: string
  size: string
  sizeBytes: number
  kind: UploadedFileKind
  /** Parsed Markdown (empty until ready or on error) */
  markdown: string
  parseStatus: 'parsing' | 'ready' | 'error'
  parseError?: string
  progress?: number
}
