<script setup lang="ts">
import { computed } from 'vue'
import type { UploadedFileKind } from '../types/uploadedFile'
import { fileKindLetter } from '../utils/fileKind'

const props = withDefaults(
  defineProps<{
    kind: UploadedFileKind
    /** md：输入卡片 36px；sm：对话气泡 32px；xs：标签 14px */
    size?: 'md' | 'sm' | 'xs'
    /** 解析中：角标上显示加载动画 */
    loading?: boolean
  }>(),
  { size: 'md', loading: false },
)

const boxClass = computed(() => {
  if (props.size === 'xs') {
    return 'w-[14px] h-[14px] rounded-[3px] text-[9px]'
  }
  if (props.size === 'sm') {
    return 'w-[32px] h-[32px] rounded-[6px] text-[18px]'
  }
  return 'w-9 h-9 rounded-[8px] text-[15px]'
})

const letter = computed(() => fileKindLetter(props.kind))
</script>

<template>
  <!-- PDF专属Icon -->
  <div v-if="kind === 'pdf'" class="relative flex items-center justify-center shrink-0">
    <i class="kd-icon kd-icon-pro kd-icon-pdf_format_s flex items-center justify-center" style="line-height: 0;">
      <svg :class="size === 'xs' ? 'w-[14px] h-[14px]' : size === 'sm' ? 'w-[32px] h-[32px]' : 'w-9 h-9'" viewBox="0 0 16 16" fill="none">
        <path d="M0 2C0 0.895431 0.895431 0 2 0H14C15.1046 0 16 0.895431 16 2V14C16 15.1046 15.1046 16 14 16H2C0.895431 16 0 15.1046 0 14V2Z" fill="#EB2F3B"></path>
        <path d="M2 16C0.895431 16 0 15.1046 0 14L16 14C16 15.1046 15.1046 16 14 16L2 16Z" fill="#CE1E29"></path>
        <path d="M8 16L8 14L16 14C16 15.1046 15.1046 16 14 16L8 16Z" fill="#FF4F5A"></path>
        <path fill-rule="evenodd" clip-rule="evenodd" d="M7 2.5H10.25C11.7688 2.5 13 3.73122 13 5.25C13 6.76878 11.7688 8 10.25 8H8.5V11H5.5C4.25736 11 3.25 9.99264 3.25 8.75C3.25 7.50736 4.25736 6.5 5.5 6.5H7V2.5ZM8.5 6.5H10.25C10.9404 6.5 11.5 5.94036 11.5 5.25C11.5 4.55964 10.9404 4 10.25 4H8.5V6.5ZM7 8H5.5C5.08579 8 4.75 8.33579 4.75 8.75C4.75 9.16421 5.08579 9.5 5.5 9.5H7V8Z" fill="white"></path>
      </svg>
    </i>
    <!-- Loading 遮罩 -->
    <div
      v-if="loading"
      class="absolute inset-0 z-20 flex items-center justify-center bg-black/10 rounded-[6px]"
      aria-hidden="true"
    >
      <svg
        class="animate-spin text-white drop-shadow-sm w-[15px] h-[15px]"
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

  <!-- 默认兜底 Icon -->
  <div
    v-else
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
