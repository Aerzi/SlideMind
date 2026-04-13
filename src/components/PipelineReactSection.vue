<script setup lang="ts">
import type { PipelineReactStep } from '../types/pipelineReactStep'
import MarkdownBody from './MarkdownBody.vue'

defineProps<{
  steps: PipelineReactStep[]
  getStageHtml: (step: PipelineReactStep) => string
}>()

const emit = defineEmits<{
  toggleReactExpand: [id: number]
  toggleStageDetail: [id: number]
}>()
</script>

<template>
  <div v-if="steps.length > 0" class="mb-[8px] w-full max-w-[800px]">
    <div class="mb-[14px] text-[14px] font-medium text-[#1a1a1a]">大纲编排</div>
    <p class="mb-[18px] text-[13px] text-gray-500 leading-relaxed">
      以下为与后端图节点一致的 ReAct 记录：思考 → 行动 → 观察；当前进度随节点完成实时更新。
    </p>
    <div
      v-for="(step, pidx) in steps"
      :key="step.id"
      class="mb-[28px] relative animate-in fade-in w-full pl-[2px]"
    >
      <div class="absolute left-[-31px] top-[2px] bg-[#fafafc] z-30 flex items-center justify-center py-1">
        <div
          v-if="step.status === 'completed'"
          class="w-[14px] h-[14px] rounded-full border border-gray-300 flex items-center justify-center bg-white"
        >
          <svg class="w-2.5 h-2.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div
          v-else-if="step.status === 'skipped'"
          class="w-[14px] h-[14px] rounded-full border border-gray-200 bg-gray-100 flex items-center justify-center"
        >
          <span class="text-[9px] text-gray-400 font-medium">—</span>
        </div>
        <div
          v-else
          class="w-[14px] h-[14px] rounded-full border-[1.5px] border-[#e5e7eb] border-t-[#a855f7] animate-spin bg-white"
        ></div>
      </div>

      <div
        class="flex items-center gap-[6px] text-[15px] font-medium text-[#1a1a1a] mb-[10px] cursor-pointer group select-none relative z-20"
        @click="emit('toggleReactExpand', step.id)"
      >
        <span>{{ pidx + 1 }}. {{ step.title }}</span>
        <svg
          class="w-[14px] h-[14px] text-gray-400 group-hover:text-gray-600 transition-transform"
          :class="step.isExpanded ? 'rotate-180' : ''"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 9l-7 7-7-7" />
        </svg>
        <span v-if="step.status === 'running'" class="text-[12.5px] text-gray-400 font-normal ml-1">· 进行中</span>
        <span v-else-if="step.status === 'skipped'" class="text-[12.5px] text-gray-400 font-normal ml-1">· 未执行</span>
      </div>

      <div v-show="step.isExpanded" class="flex flex-col gap-3 relative z-20">
        <div class="text-[13.5px] text-gray-600 leading-[1.65]">
          <span class="text-gray-400 font-medium">思考</span>
          {{ step.thought }}
        </div>
        <div
          class="inline-flex items-center gap-2 bg-[#f4f4f5] px-[12px] py-[8px] rounded-[8px] shadow-sm border border-transparent w-fit max-w-full"
        >
          <svg class="w-[16px] h-[16px] text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <span class="text-[13.5px] text-[#1a1a1a] tracking-wide break-all">
            行动 <span class="text-gray-300 mx-1.5 font-light">|</span>
            <span class="text-gray-500">{{ step.actionPill }}</span>
          </span>
        </div>

        <div class="mt-1 border-t border-dashed border-gray-200/90 pt-3">
          <button
            type="button"
            class="flex w-full items-center justify-between gap-2 rounded-[8px] px-2 py-1.5 text-left transition-colors hover:bg-gray-50/90"
            :class="step.status === 'running' ? 'cursor-default' : 'cursor-pointer'"
            @click="step.status !== 'running' && emit('toggleStageDetail', step.id)"
          >
            <span class="text-[13px] font-medium text-gray-700">阶段产出</span>
            <span class="flex items-center gap-1.5 shrink-0">
              <span v-if="step.status === 'running'" class="text-[11px] text-violet-600 font-normal"
                >进行中（不可收起）</span
              >
              <svg
                class="w-[14px] h-[14px] text-gray-400 transition-transform"
                :class="step.stageDetailOpen ? 'rotate-180' : ''"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </button>
          <div
            v-show="step.stageDetailOpen"
            class="mt-2 rounded-[10px] border border-gray-100 bg-[#fafbfc] overflow-hidden"
          >
            <MarkdownBody
              :rendered-html="getStageHtml(step)"
              extra-class="max-h-[min(50vh,480px)] overflow-y-auto custom-scrollbar px-3 py-3 text-[13.5px] leading-relaxed text-[#1a1a1a]"
            />
          </div>
        </div>

        <div
          v-if="step.observation"
          class="text-[14.5px] text-[#1a1a1a] leading-[1.65] font-light border-l-2 border-gray-200 pl-3 mt-3"
        >
          {{ step.observation }}
        </div>
        <div v-else-if="step.status === 'running'" class="text-[13.5px] text-gray-400 font-light">等待节点返回…</div>
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
