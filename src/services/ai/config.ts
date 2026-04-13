/**
 * 从环境变量读取 AI 配置（Vite 仅暴露 VITE_ 前缀变量）。
 * 本地开发：复制 .env.example 为 .env.local 并填写密钥。
 */
export function getAiConfig() {
  const baseUrl = (import.meta.env.VITE_AI_BASE_URL ?? 'https://api2.gemai.cc/v1').replace(
    /\/?$/,
    '',
  )
  const apiKey = import.meta.env.VITE_AI_API_KEY ?? ''
  const defaultModel =
    import.meta.env.VITE_AI_MODEL ?? '[满血A]gemini-3.1-pro-preview-maxthinking'

  return {
    baseUrl,
    apiKey,
    defaultModel,
  }
}

export function assertApiKeyConfigured() {
  const { apiKey } = getAiConfig()
  if (!apiKey.trim()) {
    throw new Error(
      '未配置 VITE_AI_API_KEY。请在项目根目录创建 .env.local 并设置密钥（勿提交到 Git）。',
    )
  }
}
