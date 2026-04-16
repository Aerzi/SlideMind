<script setup lang="ts">
import { ref, computed } from 'vue'
import FileTypeBadge from '../FileTypeBadge.vue'

const props = defineProps<{
  topic: string
  files: any[]
  knowledgeBases: any[]
}>()

const isFilesExpanded = ref(false)

const allMaterials = computed(() => {
  const materials: any[] = []
  props.files?.forEach(f => materials.push({ type: 'file', data: f }))
  props.knowledgeBases?.forEach(k => materials.push({ type: 'kb', data: k }))
  return materials
})

const displayMaterials = computed(() => {
  if (allMaterials.value.length <= 3) return allMaterials.value
  return isFilesExpanded.value ? allMaterials.value : allMaterials.value.slice(0, 3)
})
</script>

<template>
  <div class="flex items-end gap-3 w-full justify-end mt-[32px]">
    <div class="flex flex-col items-end gap-3 w-full max-w-[800px] relative z-20">
      <!-- Attached Files & Knowledge Bases -->
      <div v-if="allMaterials.length > 0" class="flex flex-col gap-2 w-fit min-w-[280px] max-w-[400px] bg-white border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.04)] rounded-[16px] p-2.5 relative z-20 transition-all duration-300 ease-in-out mt-1">
        
        <template v-for="(item, index) in displayMaterials" :key="item.type + item.data.id + index">
          <!-- Files -->
          <div 
            v-if="item.type === 'file'"
            class="flex items-center bg-[#f4f6f8] rounded-[10px] px-[16px] py-[14px] gap-4 transition-colors"
          >
            <FileTypeBadge :kind="item.data.kind" size="sm" />
            <div class="flex flex-col overflow-hidden gap-[2px] pr-2 w-full">
              <span class="text-[15px] text-[#1a1a1a] font-medium truncate leading-snug">{{ item.data.name?.replace(/\.[^/.]+$/, "") || '文档' }}</span>
              <span class="text-[13px] text-gray-400 font-normal leading-none mt-0.5">文档</span>
            </div>
          </div>

          <!-- Knowledge Bases -->
          <div 
            v-else-if="item.type === 'kb'"
            class="flex items-center bg-[#f4f6f8] rounded-[10px] px-[16px] py-[14px] gap-4 transition-colors"
          >
            <div class="w-[32px] h-[32px] rounded-[6px] bg-[#2d68f8] flex items-center justify-center shrink-0 shadow-sm relative">
              <svg viewBox="0 0 24 24" fill="currentColor" class="w-[18px] h-[18px] text-white">
                <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                <path v-if="item.data.iconType === 'cloud'" d="M16 13.5c0-1.1-.9-2-2-2-.1 0-.2 0-.3.1-.3-.8-1-1.4-1.9-1.4-1.1 0-2 .9-2 2 0 .1 0 .2.1.3-.5.2-1 .7-1 1.4 0 .8.7 1.5 1.5 1.5h5c1 0 1.8-.8 1.8-1.8 0-.6-.4-1.2-1.2-1.1z" fill="white" transform="scale(0.55) translate(8.5, 9.5)"/>
                <path v-else d="M12.5 13c1 0 1.8-.8 1.8-1.8S13.5 9.4 12.5 9.4s-1.8.8-1.8 1.8.8 1.8 1.8 1.8zm-4 1c-1.8 0-5.5 1-5.5 3v1.5h11V17c0-2-3.7-3-5.5-3zm8.5 0c-.2 0-.4 0-.6.1 1.2.8 2 2 2 3.1v1.5h3.5V17c0-2-3.3-3-4.9-3z" fill="#2d68f8" transform="scale(0.55) translate(8.5, 9.5)"/>
              </svg>
            </div>
            <div class="flex flex-col overflow-hidden gap-[2px] pr-2 w-full">
              <span class="text-[15px] text-[#1a1a1a] font-medium truncate leading-snug">{{ item.data.name }}</span>
              <span class="text-[13px] text-gray-400 font-normal leading-none mt-0.5">知识库</span>
            </div>
          </div>
        </template>

        <!-- Toggle Expand Button -->
        <button 
          v-if="allMaterials.length > 3" 
          @click="isFilesExpanded = !isFilesExpanded"
          class="flex items-center justify-center py-2 text-[13.5px] text-gray-500 hover:text-gray-800 transition-colors w-full mt-1 font-normal"
        >
          <span v-if="!isFilesExpanded">展开其余 {{ allMaterials.length - 3 }} 项</span>
          <span v-else>收起</span>
          <svg class="w-3.5 h-3.5 ml-1 transition-transform duration-200" :class="isFilesExpanded ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      
      <!-- Text Bubble -->
      <div class="bg-[#f2f3f5] text-[#1a1a1a] px-[24px] py-[16px] rounded-[16px] rounded-tr-[4px] text-[15px] leading-[1.6] w-fit">
        {{ topic }}
      </div>
    </div>
  </div>
</template>