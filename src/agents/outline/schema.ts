import { z } from 'zod'

/**
 * 意图澄清结果（由前端表单提交后传入 Agent，不放在图内再 interrupt）
 * 字段覆盖 PPT 生成所需关键要素。
 */
export const clarifiedIntentSchema = z.object({
  /** 演示目标，如「转正述职」「季度业务汇报」 */
  presentationGoal: z.string(),
  /** 受众描述 */
  targetAudience: z.string(),
  /** 期望时长（分钟），可选 */
  durationMinutes: z.number().optional(),
  /** 页数期望，如「10-15页」 */
  pageCountHint: z.string().optional(),
  /** 语气/风格，如「正式、数据导向」 */
  tone: z.string().optional(),
  /** 必须覆盖的要点 */
  mustCover: z.array(z.string()).optional(),
  /** 需要避免的点 */
  mustAvoid: z.array(z.string()).optional(),
  /** 用户补充说明 */
  additionalInfo: z.string().optional(),
})

export type ClarifiedIntent = z.infer<typeof clarifiedIntentSchema>

/** 单页大纲（纯文字结构，不要求保留上传文档中的图/表） */
export const pptOutlineSlideSchema = z.object({
  title: z.string(),
  bullets: z.array(z.string()),
  sourceHints: z.array(z.string()).optional(),
})

export const pptOutlineSchema = z.object({
  deckTitle: z.string(),
  audience: z.string().optional(),
  slides: z.array(pptOutlineSlideSchema),
})

export type PptOutline = z.infer<typeof pptOutlineSchema>
