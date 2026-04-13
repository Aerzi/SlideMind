import { Annotation } from '@langchain/langgraph'

/**
 * 流水线（与产品预期）：
 * 意图澄清（入参）→ 素材门槛 → 故事线骨架 → 故事线评估与检索查询 → 私域 RAG（占位）→ 召回文档
 * → 页级大纲 JSON → 版式补充（design_style）→ 终稿 Markdown → 质检
 */
export const PptOutlineState = Annotation.Root({
  /** 用户原始输入（主题/指令） */
  userIntent: Annotation<string>(),
  /** 多篇文档合并 Markdown */
  combinedDocuments: Annotation<string>(),
  /** `ClarifiedIntent` 的 JSON 字符串，由前端意图确认表单传入 */
  clarifiedIntentJson: Annotation<string>(),
  pipeline: Annotation<'continue' | 'stop'>(),

  /** 故事线骨架（Markdown，仅章节结构与叙述逻辑，不含图/表） */
  storylineMarkdown: Annotation<string>(),
  /** 评估后的故事线定稿 */
  evaluatedStorylineMarkdown: Annotation<string>(),
  /** 对故事线的简要评估说明 */
  storylineEvaluationNotes: Annotation<string>(),
  /** JSON 字符串数组：每节对应的 RAG 检索查询 */
  ragQueriesJson: Annotation<string>(),

  /** 由召回片段拼成的「召回文档」，供终稿大纲专用 */
  recallDocument: Annotation<string>(),

  /**
   * 第一步：页级大纲 JSON 字符串（仅含 page_type / title / content_description）
   * 不含 design_style，由 enrich_design_styles 节点二次补充。
   */
  deckPagesJson: Annotation<string>(),

  /** 终稿：Markdown 包装后的完整 JSON（含每页 design_style） */
  finalOutlineMarkdown: Annotation<string>(),
  /** 轻量一致性说明（可选） */
  qualityNotes: Annotation<string>(),
})
