<script setup lang="ts">
import { computed } from 'vue'
import { renderMarkdown } from '../utils/markdownRender'

const props = defineProps<{
  /** Markdown 源文本（与 renderedHtml 二选一） */
  source?: string
  /**
   * 已由上游生成的 HTML（例如 ReAct 阶段产出），传入时不再解析 `source`
   */
  renderedHtml?: string | null
  /** 追加在根节点 class 上（默认含 pipeline-md） */
  extraClass?: string
}>()

const rootClass = computed(() => ['pipeline-md', props.extraClass].filter(Boolean).join(' '))
const html = computed(() => {
  if (props.renderedHtml != null && props.renderedHtml !== '') return props.renderedHtml
  return renderMarkdown(props.source ?? '')
})
</script>

<template>
  <div :class="rootClass" v-html="html" />
</template>

<style scoped>
.pipeline-md :deep(h1) {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
  color: #111827;
}
.pipeline-md :deep(h2) {
  font-size: 1.05rem;
  font-weight: 600;
  margin: 1rem 0 0.4rem;
  color: #1f2937;
}
.pipeline-md :deep(h3) {
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0.75rem 0 0.35rem;
  color: #374151;
}
.pipeline-md :deep(p) {
  margin: 0.35rem 0;
}
.pipeline-md :deep(ul),
.pipeline-md :deep(ol) {
  margin: 0.35rem 0 0.35rem 1.1rem;
  padding-left: 0.2rem;
}
.pipeline-md :deep(li) {
  margin: 0.15rem 0;
}
.pipeline-md :deep(blockquote) {
  margin: 0.5rem 0;
  padding: 0.35rem 0.65rem;
  border-left: 3px solid #c4b5fd;
  background: rgba(139, 92, 246, 0.06);
  color: #4b5563;
}
.pipeline-md :deep(hr) {
  margin: 0.75rem 0;
  border: none;
  border-top: 1px solid #e5e7eb;
}
.pipeline-md :deep(pre) {
  margin: 0.5rem 0;
  padding: 0.65rem 0.75rem;
  border-radius: 8px;
  background: #f3f4f6;
  font-size: 12px;
  line-height: 1.55;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}
.pipeline-md :deep(code) {
  font-size: 0.92em;
  padding: 0.1em 0.35em;
  border-radius: 4px;
  background: #f3f4f6;
}
.pipeline-md :deep(pre code) {
  padding: 0;
  background: transparent;
}
.pipeline-md :deep(table) {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
  margin: 0.5rem 0;
}
.pipeline-md :deep(th),
.pipeline-md :deep(td) {
  border: 1px solid #e5e7eb;
  padding: 0.35rem 0.5rem;
  text-align: left;
}
.pipeline-md :deep(th) {
  background: #f9fafb;
  font-weight: 600;
}
.pipeline-md :deep(a) {
  color: #2563eb;
  text-decoration: underline;
}
</style>
