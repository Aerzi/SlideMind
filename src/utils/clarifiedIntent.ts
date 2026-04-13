import type { ClarifiedIntent } from '../agents/outline/schema'

export function buildClarifiedIntentFromWizard(opts: {
  presentationGoalId: string
  targetAudienceId: string
  additionalInfo: string
  presentationGoals: { id: string; title: string }[]
  targetAudiences: { id: string; title: string }[]
}): ClarifiedIntent {
  const pg = opts.presentationGoals.find((g) => g.id === opts.presentationGoalId)
  const ta = opts.targetAudiences.find((a) => a.id === opts.targetAudienceId)
  return {
    presentationGoal: pg?.title ?? opts.presentationGoalId,
    targetAudience: ta?.title ?? opts.targetAudienceId,
    additionalInfo: opts.additionalInfo.trim() || undefined,
  }
}

export function buildSkippedClarifiedIntent(additionalInfo: string): ClarifiedIntent {
  return {
    presentationGoal: '通用演示（已跳过快照选项）',
    targetAudience: '通用听众',
    additionalInfo: additionalInfo.trim() || '用户跳过快照选项，使用默认演示假设',
  }
}
