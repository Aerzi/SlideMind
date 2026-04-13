<script setup lang="ts">
import { computed, ref } from 'vue'
import type { UploadedFile } from '../types/uploadedFile'
import FileTypeBadge from './FileTypeBadge.vue'

const props = defineProps<{
  files: UploadedFile[]
}>()

const isExpanded = ref(false)

const displayFiles = computed(() => {
  const files = props.files
  if (files.length <= 3) return files
  return isExpanded.value ? files : files.slice(0, 3)
})
</script>

<template>
  <div
    v-if="files.length > 0"
    class="flex flex-col gap-2 w-fit min-w-[280px] max-w-[400px] bg-white border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.04)] rounded-[16px] p-2.5 relative z-20 transition-all duration-300 ease-in-out mt-1"
  >
    <template v-for="(file, index) in displayFiles" :key="file.id + index">
      <div class="flex items-center bg-[#f4f6f8] rounded-[10px] px-[16px] py-[14px] gap-4 transition-colors">
        <FileTypeBadge :kind="file.kind" size="sm" />
        <div class="flex flex-col overflow-hidden gap-[2px] pr-2 w-full">
          <span class="text-[15px] text-[#1a1a1a] font-medium truncate leading-snug">{{
            file.name.replace(/\.[^/.]+$/, '')
          }}</span>
          <span class="text-[13px] text-gray-400 font-normal leading-none mt-0.5">文档</span>
          <span
            v-if="file.parseStatus === 'ready' && file.markdown"
            class="text-[12px] text-emerald-600 font-medium leading-snug mt-0.5"
          >
            Markdown {{ file.markdown.length.toLocaleString() }} 字
          </span>
          <span
            v-else-if="file.parseStatus === 'error'"
            class="text-[12px] text-red-500 font-medium leading-snug mt-0.5 truncate"
          >
            {{ file.parseError }}
          </span>
        </div>
      </div>
    </template>

    <button
      v-if="files.length > 3"
      type="button"
      class="flex items-center justify-center py-2 text-[13.5px] text-gray-500 hover:text-gray-800 transition-colors w-full mt-1 font-normal"
      @click="isExpanded = !isExpanded"
    >
      <span v-if="!isExpanded">展开其余 {{ files.length - 3 }} 项</span>
      <span v-else>收起</span>
      <svg
        class="w-3.5 h-3.5 ml-1 transition-transform duration-200"
        :class="isExpanded ? 'rotate-180' : ''"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  </div>
</template>
