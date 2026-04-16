/** 文档解析 / 意图分析时间线步骤（见 AgentAnalysis agentSteps） */
export type DocumentParseAgentStep = {
  id: number
  title: string
  status: string
  isExpanded: boolean
  description?: string
  thought_title?: string
  showThought?: boolean
  action?: { icon: string; label: string; content: string }
  actions?: { 
    icon: string; 
    label: string; 
    content: string; 
    tags?: { type: 'word' | 'pdf' | 'text' | 'presentation' | 'spreadsheet' | 'wps_smart' | 'markdown' | 'web', text: string }[] 
  }[]
  result?: string
  startTimeMs?: number
  elapsedMs?: number
}
