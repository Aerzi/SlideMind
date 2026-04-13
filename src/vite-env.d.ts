/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** OpenAI 兼容接口基础 URL，需含 /v1，如 https://api2.gemai.cc/v1 */
  readonly VITE_AI_BASE_URL?: string
  readonly VITE_AI_API_KEY?: string
  /** 默认模型 id */
  readonly VITE_AI_MODEL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
