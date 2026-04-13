/** 与 LangGraph 节点 id 一致 */
export type PipelineOutlineNodeId =
  | 'material_gate'
  | 'build_storyline'
  | 'evaluate_storyline'
  | 'retrieve_private_rag'
  | 'generate_deck_pages'
  | 'enrich_design_styles'
  | 'quality_check'

/**
 * 与 LangGraph 节点对齐的 ReAct 步骤 UI 状态（见 AgentAnalysis pipelineReactSteps）
 */
export type PipelineReactStep = {
  id: number
  node: PipelineOutlineNodeId
  title: string
  thought: string
  actionPill: string
  status: 'pending' | 'running' | 'completed' | 'skipped'
  observation: string
  isExpanded: boolean
  stageDetailOpen: boolean
  stageMarkdown: string
}
