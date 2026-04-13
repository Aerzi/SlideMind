export type ChatRole = 'system' | 'user' | 'assistant'

export interface ChatMessage {
  role: ChatRole
  content: string
}

/** OpenAI 兼容 chat/completions 请求体（非流式） */
export interface ChatCompletionRequest {
  model?: string
  messages: ChatMessage[]
  temperature?: number
  max_tokens?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
}

/** 常见 OpenAI 兼容响应结构 */
export interface ChatCompletionResponse {
  id?: string
  choices?: Array<{
    index?: number
    message?: { role?: string; content?: string | null }
    finish_reason?: string
  }>
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
  error?: { message?: string; type?: string; code?: string }
}
