<script setup lang="ts">
import type { DocumentParseAgentStep } from '../types/documentParseAgentStep'

defineProps<{
  steps: DocumentParseAgentStep[]
}>()

const collapsed = defineModel<boolean>({ required: true })

const emit = defineEmits<{
  toggleStep: [id: number]
}>()
</script>

<template>
  <div class="relative w-full" :class="collapsed ? 'mb-[24px]' : 'pb-[40px]'">
    <div
      v-if="collapsed"
      class="flex items-center gap-2 text-gray-500 text-[13.5px] cursor-pointer hover:text-gray-700 transition-colors w-fit group"
      @click="collapsed = false"
    >
      已完成 · 耗时 1m 15s
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
          <span v-if="step.status === 'completed'" class="text-[12.5px] text-gray-400 font-normal ml-1"
            >· 耗时 1m 15s</span
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
            <div
              v-show="step.showThought"
              class="inline-flex items-center gap-2 bg-[#f4f4f5] px-[12px] py-[8px] rounded-[8px] shadow-sm border border-transparent w-fit relative z-20 animate-in fade-in zoom-in-95 duration-200"
            >
              <svg class="w-[16px] h-[16px] text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.8"
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              <span class="text-[13.5px] text-[#1a1a1a] tracking-wide"
                >{{ step.action?.label }} <span class="text-gray-300 mx-1.5 font-light">|</span>
                <span class="text-gray-500">{{ step.action?.content }}</span></span
              >
            </div>
          </div>

          <div
            v-if="step.action && !step.thought_title"
            class="inline-flex items-center gap-2 bg-[#f4f4f5] px-[12px] py-[8px] rounded-[8px] shadow-sm border border-transparent w-fit relative z-20"
          >
            <svg
              v-if="step.action.icon === 'document'"
              class="w-[16px] h-[16px] text-gray-500"
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
            <svg v-else class="w-[16px] h-[16px] text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.8"
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            <span class="text-[13.5px] text-[#1a1a1a] tracking-wide"
              >{{ step.action.label }} <span class="text-gray-300 mx-1.5 font-light">|</span>
              <span class="text-gray-500">{{ step.action.content }}</span></span
            >
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
