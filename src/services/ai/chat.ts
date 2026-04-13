import { assertApiKeyConfigured, getAiConfig } from './config'
import type { ChatCompletionRequest, ChatCompletionResponse, ChatMessage } from './types'

function chatCompletionsUrl(baseUrl: string) {
  return `${baseUrl}/chat/completions`
}

/**
 * 调用 OpenAI 兼容的 Chat Completions（非流式）。
 * 任意业务处可直接 import 使用。
 */
export async function createChatCompletion(
  body: ChatCompletionRequest,
): Promise<ChatCompletionResponse> {
  assertApiKeyConfigured()
  const { baseUrl, apiKey, defaultModel } = getAiConfig()

  const res = await fetch(chatCompletionsUrl(baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: body.model ?? defaultModel,
      messages: body.messages,
      temperature: body.temperature ?? 0.7,
      ...(body.max_tokens != null ? { max_tokens: body.max_tokens } : {}),
      ...(body.top_p != null ? { top_p: body.top_p } : {}),
      ...(body.frequency_penalty != null ? { frequency_penalty: body.frequency_penalty } : {}),
      ...(body.presence_penalty != null ? { presence_penalty: body.presence_penalty } : {}),
      stream: false,
    }),
  })

  const raw = await res.text()
  let data: ChatCompletionResponse
  try {
    data = JSON.parse(raw) as ChatCompletionResponse
  } catch {
    throw new Error(`AI 响应非 JSON（HTTP ${res.status}）：${raw.slice(0, 400)}`)
  }

  if (!res.ok) {
    const msg = data.error?.message ?? raw.slice(0, 500)
    throw new Error(`AI 请求失败 ${res.status}: ${msg}`)
  }

  if (data.error?.message) {
    throw new Error(data.error.message)
  }

  return data
}

/** 从响应中取出助手回复正文 */
export function getAssistantContent(response: ChatCompletionResponse): string {
  const c = response.choices?.[0]?.message?.content
  return typeof c === 'string' ? c : ''
}

/**
 * 快捷对话：单轮 user 消息，可选 system。
 */
export async function askAssistant(
  userContent: string,
  options?: { system?: string; model?: string; temperature?: number; max_tokens?: number },
): Promise<string> {
  const messages: ChatMessage[] = []
  if (options?.system?.trim()) {
    messages.push({ role: 'system', content: options.system.trim() })
  }
  messages.push({ role: 'user', content: userContent })
  const res = await createChatCompletion({
    model: options?.model,
    messages,
    temperature: options?.temperature,
    max_tokens: options?.max_tokens,
  })
  return getAssistantContent(res)
}
