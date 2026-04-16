<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  markdown: string
}>()

const isExpanded = ref(true)

// Helper to render basic markdown lines with simple styling
const renderedLines = computed(() => {
  return props.markdown.split('\n').map(line => {
    if (line.startsWith('# ')) {
      return { type: 'h1', text: line.replace('# ', '') }
    } else if (line.startsWith('## ')) {
      return { type: 'h2', text: line.replace('## ', '') }
    } else if (line.startsWith('- ')) {
      let content = line.replace('- ', '')
      // Simple italics parsing
      const parts = content.split(/_(.*?)_/)
      return { type: 'li', parts }
    }
    return { type: 'p', text: line }
  })
})

import { computed } from 'vue'
</script>

<template>
  <div class="mb-[36px] relative animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex justify-start">
    <div class="bg-white border border-gray-200 rounded-[12px] shadow-sm w-[760px] max-w-full font-mono text-[13.5px] transition-all overflow-hidden relative">
      
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-200 cursor-pointer" @click="isExpanded = !isExpanded">
        <div class="text-gray-400 text-[13px] font-sans flex items-center gap-2">
          <svg class="w-4 h-4 transition-transform duration-200" :class="isExpanded ? 'rotate-90' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          Markdown
        </div>
        <div class="flex items-center gap-4 text-gray-500 text-[13px] font-sans">
          <div class="flex items-center gap-1.5 hover:text-gray-700" @click.stop>
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
            固定高度
          </div>
          <div class="flex items-center gap-1.5 hover:text-gray-700" @click.stop>
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            复制
          </div>
        </div>
      </div>

      <!-- Body -->
      <div v-show="isExpanded" class="flex bg-white text-[13.5px] leading-[1.8] font-mono">
        <!-- Line numbers -->
        <div class="flex flex-col items-center pl-3 pr-2 py-3 bg-[#fafafc] border-r border-gray-100 text-gray-300 select-none w-[36px] shrink-0 text-[13px]">
          <span v-for="(_, index) in renderedLines" :key="index">{{ index + 1 }}</span>
        </div>
        <!-- Content -->
        <div class="flex-1 px-4 py-3 text-[#24292f] overflow-x-auto whitespace-pre font-[Consolas,Monaco,monospace]">
          <div class="flex flex-col text-[13.5px]">
            <template v-for="(line, index) in renderedLines" :key="index">
              <span v-if="line.type === 'h1'" class="text-[#0550ae] font-semibold"># {{ line.text }}</span>
              <span v-else-if="line.type === 'h2'" class="text-[#0550ae] font-semibold">## {{ line.text }}</span>
              <span v-else-if="line.type === 'li'">- <template v-for="(part, pIndex) in line.parts" :key="pIndex"><span :class="pIndex % 2 !== 0 ? 'italic text-gray-500' : ''">{{ part }}</span></template></span>
              <span v-else>{{ line.text || ' ' }}</span>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>