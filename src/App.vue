<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import AgentAnalysis from './components/AgentAnalysis.vue'
import FileTypeBadge from './components/FileTypeBadge.vue'
import { inferUploadedFileKind } from './utils/fileKind'
import type { UploadedFile } from './types/uploadedFile'

const activeTab = ref('专业')
const tabs = ['专业', '创意', '经典']

const isUploadMenuOpen = ref(false)
const uploadMenuRef = ref<HTMLElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

const isOptimizing = ref(false)
const isOptimized = ref(false)
let originalTopic = ''

const optimizeTopic = () => {
  if (isOptimizing.value || isOptimized.value || !topicText.value.trim()) return
  isOptimizing.value = true
  
  originalTopic = topicText.value.trim()
  
  let optimizedText = ''
  if (originalTopic.includes('跨境电商行业发展前景')) {
    optimizedText = '帮我生成一份关于"跨境电商行业发展前景"的PPT，包含行业现状、市场规模、竞争格局、未来趋势等内容'
  } else {
    const cleanTopic = originalTopic.replace(/^帮我生成一份PPT，内容是关于/g, '').replace(/^["']|["']$/g, '')
    optimizedText = `帮我生成一份关于"${cleanTopic}"的PPT，包含行业现状、市场规模、竞争格局、未来趋势等内容`
  }
  
  let i = 0
  topicText.value = ''
  
  const typeWriter = setInterval(() => {
    if (i < optimizedText.length) {
      topicText.value += optimizedText.charAt(i)
      i++
    } else {
      clearInterval(typeWriter)
      isOptimizing.value = false
      isOptimized.value = true
    }
  }, 30)
}

const discardOptimization = () => {
  isOptimized.value = false
  topicText.value = originalTopic
}

const uploadedFiles = ref<UploadedFile[]>([])

const hasParsingFiles = computed(() =>
  uploadedFiles.value.some((f) => f.parseStatus === 'parsing'),
)

function openFilePicker() {
  isUploadMenuOpen.value = false
  fileInputRef.value?.click()
}

async function onUploadInputChange(e: Event) {
  const input = e.target as HTMLInputElement
  const list = input.files
  if (!list?.length) return
  isUploadMenuOpen.value = false

  const { fileToMarkdown, formatFileSize } = await import('./utils/documentToMarkdown')

  for (const file of Array.from(list)) {
    const id = crypto.randomUUID()
    const entry: UploadedFile = {
      id,
      name: file.name,
      size: formatFileSize(file.size),
      sizeBytes: file.size,
      kind: inferUploadedFileKind(file.name),
      markdown: '',
      parseStatus: 'parsing',
    }
    uploadedFiles.value.push(entry)

    try {
      const markdown = await fileToMarkdown(file, (progress) => {
        const idx = uploadedFiles.value.findIndex((f) => f.id === id)
        if (idx !== -1) {
          uploadedFiles.value[idx].progress = progress
        }
      })
      const idx = uploadedFiles.value.findIndex((f) => f.id === id)
      if (idx !== -1) {
        uploadedFiles.value[idx] = {
          ...uploadedFiles.value[idx],
          markdown,
          parseStatus: 'ready',
        }
      }
    } catch (err) {
      const idx = uploadedFiles.value.findIndex((f) => f.id === id)
      if (idx !== -1) {
        uploadedFiles.value[idx] = {
          ...uploadedFiles.value[idx],
          parseStatus: 'error',
          parseError: err instanceof Error ? err.message : '解析失败',
        }
      }
    }
  }
  input.value = ''
}

// 移除文件
const removeFile = (id: string) => {
  uploadedFiles.value = uploadedFiles.value.filter(f => f.id !== id)
}

// AI Analysis State
const isAnalyzing = ref(false)
const topicText = ref('')

const startAnalysis = () => {
  isAnalyzing.value = true
}

/** 上传后立即浅灰 + 虚线边框；解析完成后与现设计一致的深灰底 #f7f8fa */
function fileUploadCardClass(file: UploadedFile) {
  if (file.parseStatus === 'parsing') {
    return 'bg-[#fafbfc] border border-dashed border-[#d1d9e4] shadow-none hover:border-[#c5cedd]'
  }
  if (file.parseStatus === 'error') {
    return 'bg-[#f7f8fa] border border-transparent hover:border-red-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
  }
  return 'bg-[#f7f8fa] border border-transparent hover:border-gray-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
}

const useInternalApi = ref(localStorage.getItem('USE_INTERNAL_API') === 'true')

const toastMessage = ref('')
const showToast = ref(false)
let toastTimer: any = null

const showToastMessage = (msg: string) => {
  toastMessage.value = msg
  showToast.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    showToast.value = false
  }, 2500)
}

const toggleApi = () => {
  useInternalApi.value = !useInternalApi.value
  localStorage.setItem('USE_INTERNAL_API', String(useInternalApi.value))
  showToastMessage(useInternalApi.value ? '已切换至公司内网 API (Doubao)' : '已切换至外部通用 API')
}

// Close menu when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  if (uploadMenuRef.value && !uploadMenuRef.value.contains(event.target as Node)) {
    isUploadMenuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="min-h-screen bg-[#fafafc] flex flex-col items-center relative">
    <!-- Header -->
    <header class="w-full h-16 flex justify-between items-center px-6 absolute top-0 left-0">
      <!-- Logo -->
      <div class="flex items-center gap-2 cursor-pointer">
        <div class="w-6 h-6 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
            <path d="M7 4H14C17.3137 4 20 6.68629 20 10C20 13.3137 17.3137 16 14 16H10V20H7V4Z" fill="url(#paint0_linear)"/>
            <path d="M10 16H14C16.2091 16 18 14.2091 18 12C18 10.4357 17.1009 9.08059 15.751 8.44855C15.228 9.38799 14.218 10 13 10H7V16H10Z" fill="white"/>
            <defs>
              <linearGradient id="paint0_linear" x1="7" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
                <stop stop-color="#A855F7" />
                <stop offset="1" stop-color="#EC4899" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <span class="font-bold text-[#1a1a1a] text-[17px] tracking-wide">WPS AIPPT</span>
      </div>

      <!-- Right actions -->
      <div class="flex items-center gap-4 text-[14px] text-gray-600">
        <button class="flex items-center gap-1.5 hover:text-gray-900 transition-colors">
          <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          历史创作
        </button>
        <div 
          @click="toggleApi"
          class="w-8 h-8 rounded-full overflow-hidden cursor-pointer flex items-center justify-center transition-all"
          :class="useInternalApi ? 'bg-blue-100 ring-2 ring-blue-400' : 'bg-orange-200'"
          :title="useInternalApi ? '当前: 公司内网 API (Doubao)' : '当前: 外部通用 API'"
        >
          <!-- Avatar placeholder -->
          <svg class="w-6 h-6 mt-1.5 transition-colors" :class="useInternalApi ? 'text-blue-500' : 'text-orange-500'" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </div>
      </div>
    </header>

    <input
      ref="fileInputRef"
      type="file"
      class="sr-only"
      accept=".doc,.docx,.txt,.pdf,.md,.markdown,.ppt,.pptx,.pptm,.pps,.ppsx,.otl,.xls,.xlsx,.xlsm,.csv,.et,.ett,.ods,.log"
      multiple
      @change="onUploadInputChange"
    />

    <!-- Main Content -->
    <main v-if="!isAnalyzing" class="flex-1 flex flex-col items-center justify-center w-full max-w-[900px] mt-20 px-4">
      
      <!-- Title -->
      <h1 class="text-[36px] font-medium tracking-wide mb-10 flex items-center justify-center text-[#1a1a1a]">
        <span>与&nbsp;</span>
        <span class="bg-[linear-gradient(to_right,#ff4eb2,#5215db,#7341e2)] bg-clip-text text-transparent font-semibold">AI 边聊边改</span>
        <span>，轻松创作 PPT</span>
      </h1>

      <!-- Input Card -->
      <div class="w-[800px] max-w-full bg-white rounded-3xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 mb-6 flex flex-col">
        
        <!-- Uploaded Files Bar -->
        <div v-if="uploadedFiles.length > 0" class="flex items-center gap-2 mb-3 overflow-x-auto pb-2 custom-scrollbar">
          <div 
            v-for="file in uploadedFiles" 
            :key="file.id"
            class="flex items-center rounded-xl px-3 py-2 gap-3 group relative cursor-pointer min-w-[220px] max-w-[240px] transition-[background-color,border-color,box-shadow] duration-300 ease-out"
            :class="fileUploadCardClass(file)"
          >
            <!-- 删除按钮 -->
            <button 
              @click.stop="removeFile(file.id)"
              class="absolute -top-1.5 -right-1.5 bg-white text-gray-400 hover:text-gray-700 shadow-sm border border-gray-200 rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <template v-if="file.kind === 'pdf' && file.parseStatus === 'parsing'">
              <!-- 演示AI风格的Loading占位符 -->
              <div class="flex items-center gap-3 w-full">
                <div class="w-9 h-9 rounded-lg bg-[#c83c3c] flex items-center justify-center shrink-0 shadow-sm relative overflow-hidden">
                  <div class="absolute inset-0 bg-black/5 w-full h-full"></div>
                  <!-- Logo (dp style) -->
                  <svg class="w-5 h-5 text-white z-10" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.5 5a4.5 4.5 0 0 0-4.49 4h-1.5a2.5 2.5 0 0 0 0 5h1.5A4.5 4.5 0 0 0 12.5 18a4.5 4.5 0 0 0 4.49-4h1.5a2.5 2.5 0 0 0 0-5h-1.5A4.5 4.5 0 0 0 12.5 5zm0 2.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/>
                  </svg>
                </div>
                <div class="flex flex-col overflow-hidden w-full gap-0.5 justify-center">
                  <span class="text-[13px] text-gray-800 font-medium truncate leading-tight">
                    【演示AI】私有文档生成...
                  </span>
                  <span class="text-[12px] text-gray-400 font-medium mt-0.5">
                    {{ file.progress || 0 }}%
                  </span>
                </div>
              </div>
            </template>
            <template v-else>
              <FileTypeBadge :kind="file.kind" size="md" :loading="file.parseStatus === 'parsing'" />
              
              <!-- 文件信息 -->
              <div class="flex flex-col overflow-hidden w-full gap-0.5">
                <span class="text-[13px] text-gray-700 font-medium truncate leading-tight">
                  {{ file.name }}
                </span>
                <span class="text-[11px] text-gray-400 font-normal tracking-wide">
                  {{ file.size }}
                </span>
                <span
                  v-if="file.parseStatus === 'parsing'"
                  class="text-[11px] text-[#146bf7] font-medium flex items-center gap-1.5"
                >
                  <span class="inline-block h-1 w-1 rounded-full bg-[#146bf7] animate-pulse" aria-hidden="true" />
                  正在解析为 Markdown…
                </span>
                <span
                  v-else-if="file.parseStatus === 'ready'"
                  class="text-[11px] text-emerald-600 font-medium"
                >
                  已解析 · Markdown {{ file.markdown.length.toLocaleString() }} 字
                </span>
                <span
                  v-else-if="file.parseStatus === 'error'"
                  class="text-[11px] text-red-500 font-medium truncate"
                  :title="file.parseError"
                >
                  {{ file.parseError }}
                </span>
              </div>
            </template>
          </div>
        </div>

        <!-- Textarea Wrapper -->
        <div class="relative w-full">
          <textarea 
            v-model="topicText"
            placeholder="请输入幻灯片正文页主题或粘贴大纲内容" 
            class="w-full h-[80px] resize-none outline-none text-[15px] placeholder-gray-400 p-2 bg-transparent"
          ></textarea>
          
          <!-- 一键优化按钮 (在 textarea 内部右下角，或者紧跟文本) -->
          <div 
            v-if="topicText.trim().length > 0"
            class="absolute bottom-2 left-2 flex items-center"
          >
            <div 
              v-if="!isOptimizing && !isOptimized"
              @click="optimizeTopic"
              class="inline-flex items-center gap-1 px-2 py-[2px] rounded-md bg-white border border-gray-200 text-[#333333] text-[13px] cursor-pointer hover:bg-gray-50 transition-colors shadow-sm"
            >
              <span class="flex items-center justify-center w-4 h-4" style="line-height: 0;">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <g style="fill:#333333;stroke:#333333;stroke-width:1px;">
                    <path d="M10.3047 6.23047L12.6673 8.59313" stroke-linejoin="round" fill="none" vector-effect="non-scaling-stroke"></path>
                    <path d="M11.829 4.6688L5.02951 11.1047C4.74251 11.3764 4.54241 11.727 4.45449 12.1122L4.00442 14.0842C3.95529 14.2995 4.14768 14.4923 4.36304 14.4436L6.39867 13.9835C6.74729 13.9047 7.06842 13.7339 7.32866 13.489L14.148 7.06928C14.5587 6.68261 14.5685 6.03293 14.1697 5.63405L13.2236 4.68795C12.8406 4.30499 12.2224 4.2965 11.829 4.6688Z" stroke-linecap="round" stroke-linejoin="round" fill="none" vector-effect="non-scaling-stroke"></path>
                  </g>
                  <g style="fill:#333333;stroke:#333333;stroke-width:1px;">
                    <path d="M3.5 3C3.58821 3 3.66236 3.06578 3.68281 3.15159C3.77213 3.52625 3.82562 3.73318 3.9082 3.91602C4.14383 4.43734 4.56176 4.85504 5.08301 5.09082C5.26559 5.17339 5.47246 5.22675 5.84644 5.31595C5.93285 5.33656 6 5.41117 6 5.5C6 5.58824 5.93322 5.66237 5.8474 5.68288C5.47271 5.77241 5.26578 5.82653 5.08301 5.90918C4.56176 6.14496 4.14383 6.56266 3.9082 7.08398C3.82569 7.26666 3.77205 7.47335 3.68284 7.84739C3.66236 7.93322 3.58824 8 3.5 8C3.41117 8 3.33657 7.93284 3.31599 7.84643C3.22711 7.4731 3.17423 7.26647 3.0918 7.08398C2.85617 6.56266 2.43823 6.14496 1.91699 5.90918C1.73407 5.82646 1.52688 5.77249 1.15158 5.68286C1.06578 5.66237 1 5.58821 1 5.5C1 5.4112 1.06616 5.33656 1.15253 5.31597C1.52714 5.22667 1.73425 5.17346 1.91699 5.09082C2.43824 4.85504 2.85617 4.43734 3.0918 3.91602C3.1743 3.73337 3.22703 3.5265 3.31601 3.15254C3.33657 3.06616 3.41121 3 3.5 3Z" stroke="none"></path>
                    <path d="M7.5 0.5C7.57057 0.5 7.62989 0.552627 7.64625 0.62127C7.7177 0.920997 7.76049 1.08654 7.82656 1.23281C8.01506 1.64987 8.34941 1.98403 8.76641 2.17266C8.91247 2.23871 9.07797 2.2814 9.37715 2.35276C9.44628 2.36925 9.5 2.42894 9.5 2.5C9.5 2.5706 9.44658 2.6299 9.37792 2.6463C9.07817 2.71793 8.91262 2.76122 8.76641 2.82734C8.34941 3.01597 8.01506 3.35013 7.82656 3.76719C7.76055 3.91333 7.71764 4.07868 7.64627 4.37791C7.62989 4.44658 7.57059 4.5 7.5 4.5C7.42894 4.5 7.36925 4.44627 7.35279 4.37715C7.28169 4.07848 7.23938 3.91318 7.17344 3.76719C6.98494 3.35013 6.65059 3.01597 6.23359 2.82734C6.08725 2.76116 5.92151 2.71799 5.62126 2.64629C5.55262 2.62989 5.5 2.57057 5.5 2.5C5.5 2.42896 5.55292 2.36925 5.62203 2.35277C5.92171 2.28133 6.0874 2.23877 6.23359 2.17266C6.65059 1.98403 6.98494 1.64987 7.17344 1.23281C7.23944 1.0867 7.28162 0.921202 7.35281 0.622035C7.36925 0.552929 7.42896 0.5 7.5 0.5Z" stroke="none"></path>
                  </g>
                </svg>
              </span>
              <span>一键优化</span>
            </div>

            <!-- 优化中 loading -->
            <div 
              v-if="isOptimizing"
              class="inline-flex items-center gap-1.5 px-2 py-[2px] rounded-md bg-white border border-gray-200 text-blue-500 text-[13px] shadow-sm"
            >
              <svg class="animate-spin w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>优化中...</span>
            </div>

            <!-- 弃用按钮 -->
            <div 
              v-if="isOptimized"
              @click="discardOptimization"
              class="inline-flex items-center gap-1 px-2 py-[2px] rounded-md bg-white border border-gray-200 text-gray-500 text-[13px] cursor-pointer hover:bg-gray-50 hover:text-red-500 transition-colors shadow-sm"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <g style="fill:#6b7280;stroke:#6b7280;stroke-width:1px;">
                  <path d="M10.3047 6.23047L12.6673 8.59313" stroke-linejoin="round" fill="none" vector-effect="non-scaling-stroke"></path>
                  <path d="M11.829 4.6688L5.02951 11.1047C4.74251 11.3764 4.54241 11.727 4.45449 12.1122L4.00442 14.0842C3.95529 14.2995 4.14768 14.4923 4.36304 14.4436L6.39867 13.9835C6.74729 13.9047 7.06842 13.7339 7.32866 13.489L14.148 7.06928C14.5587 6.68261 14.5685 6.03293 14.1697 5.63405L13.2236 4.68795C12.8406 4.30499 12.2224 4.2965 11.829 4.6688Z" stroke-linecap="round" stroke-linejoin="round" fill="none" vector-effect="non-scaling-stroke"></path>
                </g>
              </svg>
              <span>弃用</span>
            </div>
          </div>
        </div>
        
        <!-- Bottom Controls -->
        <div class="flex justify-between items-center mt-2 px-2">
          
          <!-- Left tags -->
          <div class="flex items-center gap-3">
            <div class="relative" ref="uploadMenuRef">
              <button 
                @click="isUploadMenuOpen = !isUploadMenuOpen"
                class="flex items-center gap-1.5 text-[14px] text-gray-600 hover:text-gray-900 font-medium px-2 py-1 rounded-md transition-colors"
                :class="isUploadMenuOpen ? 'bg-gray-50' : ''"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                上传文件
                <svg 
                  class="w-3.5 h-3.5 transition-transform duration-200" 
                  :class="isUploadMenuOpen ? 'rotate-180' : ''"
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <!-- Dropdown Menu -->
              <div 
                v-show="isUploadMenuOpen"
                class="absolute left-0 top-[calc(100%+8px)] w-[150px] bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-gray-100 py-1.5 z-50 transform origin-top-left transition-all duration-200"
              >
                <button 
                  type="button"
                  @click="openFilePicker"
                  class="w-full flex items-center gap-2 px-3 py-2 text-[14px] text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg class="w-[18px] h-[18px] text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                  云端文档
                </button>
                <button 
                  type="button"
                  @click="openFilePicker"
                  class="w-full flex items-center gap-2 px-3 py-2 text-[14px] text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg class="w-[18px] h-[18px] text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  本地文档
                </button>
              </div>
            </div>
            <div class="h-4 w-[1px] bg-gray-200 mx-1"></div>
            <div class="flex items-center p-1 rounded-full bg-gray-50 border border-gray-200 relative">
              <!-- 滑块背景 -->
              <div 
                class="absolute top-1 bottom-1 left-1 w-[52px] bg-white rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.1)] transition-transform duration-300 ease-out"
                :style="{ transform: `translateX(${tabs.indexOf(activeTab) * 52}px)` }"
              ></div>
              <!-- 选项 -->
              <button 
                v-for="tab in tabs" 
                :key="tab"
                @click="activeTab = tab"
                class="w-[52px] py-1 text-[13px] relative z-10 transition-colors duration-300"
                :class="activeTab === tab ? 'text-gray-800 font-medium' : 'text-gray-500 hover:text-gray-700'"
              >
                {{ tab }}
              </button>
            </div>
          </div>

          <!-- Right button -->
          <button 
            type="button"
            :disabled="hasParsingFiles"
            @click="startAnalysis"
            class="flex items-center gap-2 bg-[#111111] hover:bg-black text-white px-6 py-2.5 rounded-full text-[15px] font-medium transition-colors shadow-sm disabled:opacity-40 disabled:pointer-events-none"
          >
            立即生成
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>

        </div>
      </div>

      <!-- Feature Cards -->
      <div class="flex items-center justify-center gap-4 w-[800px] max-w-full">
        
        <!-- Card 1 -->
        <div class="flex-1 bg-white rounded-2xl p-4 flex flex-col gap-1.5 cursor-pointer hover:shadow-md transition-shadow border border-gray-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
          <div class="flex items-center gap-2 text-[15px] font-medium text-gray-800">
            <span class="text-orange-500 bg-orange-50 p-1 rounded-md">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </span>
            文档生成 PPT
          </div>
          <div class="text-[12px] text-gray-400 truncate">
            DOC/PDF/思维导图/云文档转PPT
          </div>
        </div>

        <!-- Card 2 -->
        <div class="flex-1 bg-white rounded-2xl p-4 flex flex-col gap-1.5 cursor-pointer hover:shadow-md transition-shadow border border-gray-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
          <div class="flex items-center gap-2 text-[15px] font-medium text-gray-800">
            <span class="text-fuchsia-500 bg-fuchsia-50 p-1 rounded-md">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </span>
            上传美化 PPT
          </div>
          <div class="text-[12px] text-gray-400 truncate">
            上传PPT，一键美化排版样式
          </div>
        </div>

        <!-- Card 3 -->
        <div class="flex-1 bg-white rounded-2xl p-4 flex flex-col gap-1.5 cursor-pointer hover:shadow-md transition-shadow border border-gray-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
          <div class="flex items-center gap-2 text-[15px] font-medium text-gray-800">
            <span class="text-yellow-500 bg-yellow-50 p-1 rounded-md">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </span>
            Nano Banana 图片转 PPT
          </div>
          <div class="text-[12px] text-gray-400 truncate">
            图片类型 PPT 转换为可编辑 PPT
          </div>
        </div>

      </div>

    </main>

    <!-- Agent Analysis View -->
    <AgentAnalysis 
      v-else
      :topic="topicText"
      :files="uploadedFiles"
      @back="isAnalyzing = false"
    />

    <!-- Toast Notification -->
    <div 
      class="fixed top-20 left-1/2 -translate-x-1/2 z-50 transition-all duration-300"
      :class="showToast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'"
    >
      <div class="bg-gray-800 text-white px-4 py-2.5 rounded-full shadow-lg text-[14px] flex items-center gap-2 font-medium">
        <svg v-if="useInternalApi" class="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-4-4 1.41-1.41L11 14.17l6.59-6.59L19 9l-8 8z"/></svg>
        <svg v-else class="w-4 h-4 text-orange-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-4-4 1.41-1.41L11 14.17l6.59-6.59L19 9l-8 8z"/></svg>
        {{ toastMessage }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.08);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.15);
}
.custom-scrollbar::-webkit-scrollbar-button {
  display: none;
}
</style>
