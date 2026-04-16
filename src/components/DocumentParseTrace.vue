<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import type { DocumentParseAgentStep } from '../types/documentParseAgentStep'
import FileTypeBadge from './FileTypeBadge.vue'

const props = defineProps<{
  steps: DocumentParseAgentStep[]
}>()

const collapsed = defineModel<boolean>({ required: true })

const emit = defineEmits<{
  toggleStep: [id: number]
}>()

const now = ref(Date.now())
let timer: any = null

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

function formatDuration(ms: number) {
  if (ms < 1000) return '< 1s'
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rs = s % 60
  return `${m}m ${rs}s`
}

function getStepDuration(step: DocumentParseAgentStep) {
  if (step.status === 'completed' && step.elapsedMs !== undefined) {
    return formatDuration(step.elapsedMs)
  }
  if (step.startTimeMs) {
    return formatDuration(now.value - step.startTimeMs)
  }
  return ''
}

const totalDuration = computed(() => {
  if (!props.steps.length) return ''
  const first = props.steps[0]
  const last = props.steps[props.steps.length - 1]
  if (!first.startTimeMs) return ''
  
  if (last.status === 'completed') {
    const totalMs = props.steps.reduce((acc, s) => acc + (s.elapsedMs || 0), 0)
    return formatDuration(totalMs)
  }
  
  const totalMs = props.steps.reduce((acc, s) => acc + (s.elapsedMs || 0), 0)
  const currentRunningMs = last.startTimeMs ? now.value - last.startTimeMs : 0
  return formatDuration(totalMs + currentRunningMs)
})
</script>

<template>
  <div class="relative w-full" :class="collapsed ? 'mb-[24px]' : 'pb-[40px]'">
    <div
      v-if="collapsed"
      class="flex items-center gap-2 text-gray-500 text-[13.5px] cursor-pointer hover:text-gray-700 transition-colors w-fit group"
      @click="collapsed = false"
    >
      已完成 · 耗时 {{ totalDuration }}
      <svg
        class="w-3.5 h-3.5 transition-transform group-hover:translate-y-[1px]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 9l-7 7-7-7" />
      </svg>
    </div>

    <template v-else>
      <div v-for="(step, index) in steps" :key="index" class="mb-[36px] relative animate-in fade-in w-full">
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
            v-else
            class="w-[14px] h-[14px] rounded-full border-[1.5px] border-[#e5e7eb] border-t-[#a855f7] animate-spin bg-white"
          ></div>
        </div>

        <div
          class="flex items-center gap-[6px] text-[15px] font-medium text-[#1a1a1a] mb-[12px] cursor-pointer mt-[0.5px] relative z-20 group select-none"
          @click="emit('toggleStep', step.id)"
        >
          {{ step.title }}
          <svg
            class="w-[14px] h-[14px] text-gray-400 group-hover:text-gray-600 transition-transform"
            :class="step.isExpanded ? 'rotate-180' : ''"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 9l-7 7-7-7" />
          </svg>
          <span class="text-[12.5px] text-gray-400 font-normal ml-1"
            >· 耗时 {{ getStepDuration(step) }}</span
          >
        </div>

        <div class="text-[14.5px] text-[#1a1a1a] mb-[12px] leading-[1.6] relative z-20 font-light">
          {{ step.description }}
        </div>

        <div v-show="step.isExpanded" class="flex flex-col gap-3">
          <div v-if="step.thought_title" class="flex flex-col gap-2 mt-1">
            <div
              class="flex items-center gap-[6px] text-[13.5px] text-gray-500 cursor-pointer group w-fit"
              @click="step.showThought = !step.showThought"
            >
              {{ step.thought_title }}
              <svg
                class="w-3.5 h-3.5 transition-transform"
                :class="step.showThought ? 'rotate-180' : ''"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            <!-- 可以预留给真实的思考内容展示 -->
            <div v-show="step.showThought" class="text-[13px] text-gray-400 pl-[4px] leading-relaxed relative z-20 animate-in fade-in duration-200">
              <span class="italic">思考过程已完成。</span>
            </div>
          </div>

          <!-- Tool call pills ALWAYS shown (multiple actions trace support) -->
          <div class="flex flex-col gap-2 mt-1 w-full max-w-[90%]">
            <template v-for="(act, actIdx) in (step.actions || (step.action ? [step.action] : []))" :key="actIdx">
              <div class="flex flex-col gap-1.5 w-full">
                <div
                  class="inline-flex items-center gap-2 bg-[#f4f4f5] px-[12px] py-[8px] rounded-[8px] shadow-sm border border-transparent w-fit relative z-20"
                >
                  <svg
                    v-if="act.icon === 'document'"
                    class="w-[16px] h-[16px] text-gray-500 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.8"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <svg v-else-if="act.icon === 'search'" class="w-[16px] h-[16px] text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <svg v-else-if="act.icon === 'idea'" class="w-[16px] h-[16px] text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <svg v-else class="w-[16px] h-[16px] text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span class="text-[13.5px] text-[#1a1a1a] tracking-wide break-words"
                    >{{ act.label }} <span class="text-gray-300 mx-1.5 font-light">|</span>
                    <span class="text-gray-500 whitespace-pre-wrap">{{ act.content }}</span></span
                  >
                </div>
                
                <div v-if="act.tags && act.tags.length > 0" class="flex flex-wrap gap-2 px-1 mb-1 relative z-20">
                  <div v-for="(tag, tIdx) in act.tags" :key="tIdx" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#e5e7eb] rounded-full shadow-sm cursor-pointer hover:shadow-md transition-shadow">
                    <template v-if="tag.text !== '展开'">
                      <!-- Word icon -->
                      <div v-if="tag.type === 'word'" class="w-[14px] h-[14px] bg-[#2b579a] rounded-full flex items-center justify-center shrink-0">
                        <svg class="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M15.5 3H4.5C3.67 3 3 3.67 3 4.5v15c0 .83.67 1.5 1.5 1.5h15c.83 0 1.5-.67 1.5-1.5V9l-5.5-6zm-1.62 13.92H12l-1.5-4.14-1.5 4.14H7.12l2.64-6.51-2.48-6.15h1.86l1.36 3.86 1.36-3.86h1.86l-2.48 6.15 2.64 6.51z"/></svg>
                      </div>
                      <!-- Web icon (globe) -->
                      <div v-else-if="tag.type === 'web'" class="w-[14px] h-[14px] bg-[#9ca3af] rounded-full flex items-center justify-center shrink-0">
                        <svg class="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                      </div>
                      <!-- Web icon (red star) -->
                      <div v-else-if="tag.type === 'red_star'" class="w-[14px] h-[14px] bg-[#ef4444] rounded-full flex items-center justify-center shrink-0">
                        <svg class="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                      </div>
                      <!-- Web icon (yiche) -->
                      <div v-else-if="tag.type === 'yiche'" class="w-[14px] h-[14px] bg-red-600 rounded-full flex items-center justify-center shrink-0">
                        <svg class="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2zm0 4.5l6.5 13h-13L12 6.5zM12 11l-3 6h6l-3-6z"/></svg>
                      </div>
                      <!-- Web icon (smzdm red) -->
                      <div v-else-if="tag.type === 'smzdm'" class="w-[14px] h-[14px] bg-[#ef4444] rounded-full flex items-center justify-center shrink-0 text-[8px] text-white font-bold tracking-tighter italic">
                        值
                      </div>
                    </template>
                    <span class="text-[13px] text-[#4b5563] truncate max-w-[200px]" :class="tag.text === '展开' ? 'text-gray-500' : ''">{{ tag.text }}</span>
                    <svg v-if="tag.text === '展开'" class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <div
            v-if="step.result && step.status === 'completed'"
            class="text-[14.5px] text-[#1a1a1a] leading-[1.6] font-light animate-in fade-in duration-500"
          >
            {{ step.result }}
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
