<script setup lang="ts">
import TypewriterText from './TypewriterText.vue'

defineProps<{
  text: string
}>()
</script>

<template>
  <div class="mb-[36px] relative animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
    <!-- Timeline Icon -->
    <div class="absolute -left-[35px] top-[2px] bg-[#fafafc]">
      <div class="w-[20px] h-[20px] rounded-[6px] bg-[#f2f3f5] flex items-center justify-center border border-[#e5e7eb]">
        <svg class="w-[14px] h-[14px] text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
    </div>
    
    <!-- Content -->
    <div v-if="text" class="text-[15px] text-[#1a1a1a] leading-[1.6] w-full relative z-20 mt-[6px]">
      <TypewriterText :text="text" :speed="40" />
    </div>
    <div class="mt-[10px] text-[13.5px] text-gray-400 flex items-center gap-[6px] relative z-20 font-medium">
      任务接收完毕
    </div>
  </div>
</template>