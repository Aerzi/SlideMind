<script setup lang="ts">
import { computed } from 'vue'
import type { UploadedFileKind } from '../types/uploadedFile'
import { fileKindLetter } from '../utils/fileKind'

const props = withDefaults(
  defineProps<{
    kind: UploadedFileKind
    /** md：输入卡片 36px；sm：对话气泡 32px */
    size?: 'md' | 'sm'
    /** 解析中：角标上显示加载动画 */
    loading?: boolean
  }>(),
  { size: 'md', loading: false },
)

const boxClass = computed(() => {
  if (props.size === 'sm') {
    return 'w-[32px] h-[32px] rounded-[6px] text-[18px]'
  }
  return 'w-9 h-9 rounded-[8px] text-[15px]'
})

const letter = computed(() => fileKindLetter(props.kind))
</script>

<template>
  <div
    class="bg-[#146bf7] flex items-center justify-center shrink-0 shadow-sm relative overflow-hidden font-bold tracking-tighter text-white font-sans transition-opacity duration-300"
    :class="[boxClass, loading && 'opacity-95']"
  >
    <span class="relative z-10 transition-opacity duration-300" :class="loading && 'opacity-30'">{{ letter }}</span>
    <div
      v-if="loading"
      class="absolute inset-0 z-20 flex items-center justify-center bg-[#146bf7]/35"
      aria-hidden="true"
    >
      <svg
        class="animate-spin text-white drop-shadow-sm"
        :class="size === 'sm' ? 'w-[15px] h-[15px]' : 'w-[17px] h-[17px]'"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
        <path
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  </div>
</template>
