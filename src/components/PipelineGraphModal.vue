<script setup lang="ts">
import type { PipelineReactStep } from '../types/pipelineReactStep'

const props = defineProps<{
  show: boolean
  steps: PipelineReactStep[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()
</script>

<template>
  <Transition name="fade-scale">
    <div 
      v-if="show && steps.length > 0" 
      class="fixed right-8 bottom-12 w-[340px] bg-white/95 backdrop-blur-xl rounded-[20px] shadow-[0_20px_60px_-10px_rgba(0,0,0,0.15)] border border-white/50 ring-1 ring-black/5 z-50 overflow-hidden flex flex-col"
    >
      <!-- Header -->
      <div class="px-5 py-4 flex items-center justify-between border-b border-gray-100/80 bg-gradient-to-r from-violet-50/50 to-transparent">
        <div class="flex items-center gap-2.5 text-[15px] font-semibold text-gray-800 tracking-tight">
          <div class="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-inner">
            <svg class="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          LangGraph 编排图
        </div>
        <button @click="emit('close')" class="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="p-5 flex flex-col gap-0 max-h-[460px] overflow-y-auto custom-scrollbar">
        <div v-for="(step, i) in steps" :key="step.id" class="flex flex-col">
          <!-- Node -->
          <div class="flex items-start gap-3.5 group">
            <div class="relative flex flex-col items-center">
              <div 
                class="w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0 transition-all duration-500 z-10" 
                :class="[
                  step.status === 'completed' ? 'bg-emerald-500 text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)]' :
                  step.status === 'running' ? 'bg-violet-500 text-white shadow-[0_4px_16px_rgba(139,92,246,0.4)] ring-4 ring-violet-500/20' :
                  step.status === 'skipped' ? 'bg-gray-100 text-gray-400 border border-gray-200' :
                  'bg-white text-gray-300 border-2 border-gray-100'
                ]"
              >
                <svg v-if="step.status === 'completed'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                </svg>
                <svg v-else-if="step.status === 'running'" class="w-4 h-4 animate-[spin_2s_linear_infinite]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v2m0 12v2m8-8h-2M6 12H4m14.485-5.657l-1.414 1.414M7.929 17.657l-1.414 1.414M17.657 17.657l-1.414-1.414M6.515 6.515L5.101 5.101" />
                </svg>
                <span v-else-if="step.status === 'skipped'" class="text-[12px] font-medium">—</span>
                <span v-else class="text-[13px] font-semibold">{{ i + 1 }}</span>
              </div>
              
              <!-- Edge -->
              <div 
                v-if="i < steps.length - 1" 
                class="w-[2px] h-[32px] my-1 rounded-full transition-colors duration-500" 
                :class="[
                  step.status === 'completed' ? 'bg-emerald-500' : 
                  step.status === 'running' ? 'bg-gradient-to-b from-violet-500 to-gray-200' :
                  'bg-gray-100'
                ]"
              ></div>
            </div>
            <div class="flex flex-col pt-1 pb-4">
              <span 
                class="text-[14px] font-medium tracking-wide transition-colors duration-300" 
                :class="[
                  step.status === 'running' ? 'text-violet-700' :
                  step.status === 'completed' ? 'text-gray-800' :
                  'text-gray-400'
                ]"
              >{{ step.title }}</span>
              <span 
                class="text-[12px] mt-0.5 transition-colors duration-300 flex items-center gap-1.5" 
                :class="[
                  step.status === 'running' ? 'text-violet-500' :
                  step.status === 'completed' ? 'text-emerald-600' :
                  'text-gray-400'
                ]"
              >
                <span v-if="step.status === 'running'" class="relative flex h-2 w-2">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                </span>
                {{ step.status === 'running' ? 'Agent 执行中...' : step.status === 'completed' ? '节点已完成' : step.status === 'skipped' ? '节点跳过' : '等待调度' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(0, 0, 0, 0.1); border-radius: 10px; }

.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(10px);
}
</style>