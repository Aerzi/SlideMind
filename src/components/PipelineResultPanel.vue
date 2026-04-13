<script setup lang="ts">
import MarkdownBody from './MarkdownBody.vue'

export type PipelineResultTabId = 'storyline' | 'recall' | 'outline' | 'quality'

defineProps<{
  headline: string
  /** 门槛终止时的提示 */
  pipelineStopped: boolean
  ragQueries: string[]
  tabs: readonly { id: PipelineResultTabId; label: string }[]
  /** 当前标签页对应的 Markdown 正文 */
  tabMarkdown: string
}>()

const activeTab = defineModel<PipelineResultTabId>('activeTab', { required: true })
</script>

<template>
  <div class="mb-[36px] relative animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex flex-col mt-6">
    <div class="flex flex-col gap-2 mb-4">
      <div class="text-[16px] font-medium text-gray-900">
        {{ headline }}
      </div>
      <p v-if="pipelineStopped" class="text-[13px] text-amber-800/90 leading-relaxed">
        流程在门槛处终止（常见原因：合并素材过短）。下方仍展示系统返回的说明与可用片段。
      </p>
      <div v-if="ragQueries.length" class="flex flex-wrap gap-2 pt-0.5">
        <span class="text-[11px] text-gray-500 w-full">检索查询（占位 RAG）</span>
        <span
          v-for="(q, i) in ragQueries.slice(0, 10)"
          :key="i"
          class="text-[11px] px-2.5 py-1 rounded-full bg-gray-50 text-gray-600 border border-gray-200/90 max-w-full truncate"
          :title="q"
          >{{ q }}</span
        >
        <span v-if="ragQueries.length > 10" class="text-[11px] text-gray-400 self-center">
          +{{ ragQueries.length - 10 }}
        </span>
      </div>
    </div>

    <div
      class="w-full rounded-[14px] border border-gray-100 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden"
    >
      <div class="flex flex-wrap gap-1.5 border-b border-gray-100 bg-[#fafafc] px-3 py-2.5">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          class="rounded-full px-3.5 py-1.5 text-[13px] transition-colors"
          :class="
            activeTab === tab.id
              ? 'bg-white text-[#2d68f8] shadow-sm border border-gray-200/80 font-medium'
              : 'text-gray-500 hover:text-gray-800 border border-transparent'
          "
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>
      <div class="max-h-[min(58vh,520px)] overflow-y-auto custom-scrollbar px-4 py-4">
        <MarkdownBody :source="tabMarkdown" extra-class="text-[13.5px] leading-relaxed text-[#1a1a1a]" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.08);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.15);
}
</style>
