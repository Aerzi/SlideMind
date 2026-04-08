<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import AgentAnalysis from './components/AgentAnalysis.vue'

const activeTab = ref('专业')
const tabs = ['专业', '创意', '经典']

const isUploadMenuOpen = ref(false)
const uploadMenuRef = ref<HTMLElement | null>(null)

// 模拟上传的文件列表
interface UploadedFile {
  id: string
  name: string
  size: string
  type: string
}
const uploadedFiles = ref<UploadedFile[]>([])

// 知识库选择弹窗状态
const isKbModalOpen = ref(false)

interface KnowledgeBase {
  id: string
  name: string
  iconType: 'cloud' | 'team'
  hasInfo?: boolean
}

const knowledgeBases = ref<KnowledgeBase[]>([
  { id: '1', name: '我的云文档', iconType: 'cloud', hasInfo: true },
  { id: '2', name: '金山设计学习圈', iconType: 'team' },
  { id: '3', name: '测试团队', iconType: 'team' },
  { id: '4', name: 'UX芝士站', iconType: 'team' },
  { id: '5', name: '用户体验设计专栏 KSUX', iconType: 'team' },
  { id: '6', name: '知识库团队', iconType: 'team' },
  { id: '7', name: '调研问卷', iconType: 'team' },
  { id: '8', name: 'WPS会议', iconType: 'team' },
  { id: '9', name: '个人使用', iconType: 'team' },
])

const selectedKbIds = ref<string[]>(['4', '5']) // 默认选中的两个

const firstSelectedKb = computed(() => {
  if (selectedKbIds.value.length === 0) return null;
  return knowledgeBases.value.find(kb => kb.id === selectedKbIds.value[0])
})

const toggleSelectAll = () => {
  if (selectedKbIds.value.length === knowledgeBases.value.length) {
    selectedKbIds.value = []
  } else {
    selectedKbIds.value = knowledgeBases.value.map(kb => kb.id)
  }
}

const toggleKbSelection = (id: string) => {
  const index = selectedKbIds.value.indexOf(id)
  if (index > -1) {
    selectedKbIds.value.splice(index, 1)
  } else {
    selectedKbIds.value.push(id)
  }
}

// 模拟文件上传动作
const handleSimulateUpload = () => {
  // 生成随机后缀
  const id = Math.random().toString(36).substring(7)
  uploadedFiles.value.push({
    id,
    name: '2023全年塑料市场分析报...',
    size: Math.random() > 0.5 ? '3.72MB' : '17KB',
    type: 'word' // 可以用来显示蓝色的 W 图标
  })
  isUploadMenuOpen.value = false // 选完文件关闭菜单
}

// 移除文件
const removeFile = (id: string) => {
  uploadedFiles.value = uploadedFiles.value.filter(f => f.id !== id)
}

// AI Analysis State
const isAnalyzing = ref(false)
const topicText = ref('')

const selectedKnowledgeBases = computed(() => {
  return knowledgeBases.value.filter(kb => selectedKbIds.value.includes(kb.id))
})

const startAnalysis = () => {
  isAnalyzing.value = true
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
        <div class="w-8 h-8 rounded-full bg-orange-200 overflow-hidden cursor-pointer flex items-center justify-center">
          <!-- Avatar placeholder -->
          <svg class="w-6 h-6 text-orange-500 mt-1.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </div>
      </div>
    </header>

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
        
        <!-- Selected Knowledge Bases Bar -->
        <div v-if="selectedKbIds.length > 0" class="flex items-center justify-between bg-[#f7f8fa] rounded-2xl px-2 py-2 mb-3">
          <button 
            @click="isKbModalOpen = true"
            class="flex items-center gap-1.5 bg-[#eef0f4] hover:bg-[#e4e6eb] text-gray-700 text-[13.5px] px-3 py-1.5 rounded-[10px] transition-colors font-medium"
          >
            <!-- 文件夹图标 -->
            <div class="w-[18px] h-[18px] text-[#146bf7] flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" fill="currentColor" class="w-full h-full">
                <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                <path v-if="firstSelectedKb?.iconType === 'cloud'" d="M16 13.5c0-1.1-.9-2-2-2-.1 0-.2 0-.3.1-.3-.8-1-1.4-1.9-1.4-1.1 0-2 .9-2 2 0 .1 0 .2.1.3-.5.2-1 .7-1 1.4 0 .8.7 1.5 1.5 1.5h5c1 0 1.8-.8 1.8-1.8 0-.6-.4-1.2-1.2-1.1z" fill="white" transform="scale(0.55) translate(8.5, 9.5)"/>
                <path v-else d="M12.5 13c1 0 1.8-.8 1.8-1.8S13.5 9.4 12.5 9.4s-1.8.8-1.8 1.8.8 1.8 1.8 1.8zm-4 1c-1.8 0-5.5 1-5.5 3v1.5h11V17c0-2-3.7-3-5.5-3zm8.5 0c-.2 0-.4 0-.6.1 1.2.8 2 2 2 3.1v1.5h3.5V17c0-2-3.3-3-4.9-3z" fill="white" transform="scale(0.55) translate(8.5, 9.5)"/>
              </svg>
            </div>
            <span>{{ firstSelectedKb?.name }}{{ selectedKbIds.length > 1 ? ` 等 ${selectedKbIds.length} 个知识库` : '' }}</span>
            <svg class="w-3.5 h-3.5 text-gray-500 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button @click="selectedKbIds = []" class="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200/60 rounded-full transition-colors mr-1">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Uploaded Files Bar -->
        <div v-if="uploadedFiles.length > 0" class="flex items-center gap-2 mb-3 overflow-x-auto pb-2 custom-scrollbar">
          <div 
            v-for="file in uploadedFiles" 
            :key="file.id"
            class="flex items-center bg-[#f7f8fa] border border-transparent hover:border-gray-200 rounded-xl px-3 py-2 gap-3 group relative cursor-pointer min-w-[220px] max-w-[240px] transition-all"
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
            
            <!-- 文件图标 (Word类型高仿) -->
            <div class="w-9 h-9 rounded-[8px] bg-[#146bf7] flex items-center justify-center shrink-0 shadow-sm">
              <span class="text-white font-bold text-[15px] tracking-tighter">W</span>
            </div>
            
            <!-- 文件信息 -->
            <div class="flex flex-col overflow-hidden w-full gap-0.5">
              <span class="text-[13px] text-gray-700 font-medium truncate leading-tight">
                {{ file.name }}
              </span>
              <span class="text-[11px] text-gray-400 font-normal tracking-wide">
                {{ file.size }}
              </span>
            </div>
          </div>
        </div>

        <!-- Textarea -->
        <textarea 
          v-model="topicText"
          placeholder="请输入幻灯片正文页主题或粘贴大纲内容" 
          class="w-full h-[80px] resize-none outline-none text-[15px] placeholder-gray-400 p-2 bg-transparent"
        ></textarea>
        
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
                <!-- 选择知识库 -->
                <button 
                  @click="isKbModalOpen = true; isUploadMenuOpen = false"
                  class="w-full flex items-center justify-between px-3 py-2 text-[14px] text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <div class="flex items-center gap-2">
                    <svg class="w-[18px] h-[18px] text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    选择知识库
                  </div>
                  <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <!-- Divider -->
                <div class="h-px bg-gray-100 my-1 mx-2"></div>

                <button 
                  @click="handleSimulateUpload"
                  class="w-full flex items-center gap-2 px-3 py-2 text-[14px] text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg class="w-[18px] h-[18px] text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                  云端文档
                </button>
                <button 
                  @click="handleSimulateUpload"
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
            @click="startAnalysis"
            class="flex items-center gap-2 bg-[#111111] hover:bg-black text-white px-6 py-2.5 rounded-full text-[15px] font-medium transition-colors shadow-sm"
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
      :knowledge-bases="selectedKnowledgeBases"
      @back="isAnalyzing = false"
    />

    <!-- Knowledge Base Selection Modal -->
    <div v-if="isKbModalOpen" class="fixed inset-0 z-[100] flex items-center justify-center">
      <!-- Overlay -->
      <div class="absolute inset-0 bg-black/20 transition-opacity" @click="isKbModalOpen = false"></div>
      
      <!-- Modal Content -->
      <div class="relative bg-white w-[640px] max-w-[90vw] h-[600px] max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <!-- Header -->
        <div class="px-6 pt-5 pb-3">
          <div class="flex justify-between items-start mb-1">
            <h2 class="text-[17px] font-semibold text-gray-900 tracking-wide">选择团队/知识库</h2>
            <button @click="isKbModalOpen = false" class="text-gray-400 hover:text-gray-600 transition-colors -mr-1">
              <svg class="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p class="text-[13px] text-gray-500">以下团队/知识库开启了 AI 服务，请选择作为参考素材的文档</p>
        </div>

        <!-- Scrollable List -->
        <div class="flex-1 overflow-y-auto px-2 pb-4 custom-scrollbar">
          <div class="flex flex-col px-4">
            <label 
              v-for="kb in knowledgeBases" 
              :key="kb.id"
              class="flex items-center gap-3 py-3.5 cursor-pointer group transition-colors"
            >
              <!-- Custom Checkbox -->
              <div class="relative flex items-center justify-center w-[18px] h-[18px] rounded-[4px] border transition-colors duration-200"
                :class="selectedKbIds.includes(kb.id) ? 'bg-[#146bf7] border-[#146bf7]' : 'bg-white border-gray-400 group-hover:border-[#146bf7]'"
              >
                <svg v-if="selectedKbIds.includes(kb.id)" class="w-3 h-3 text-white pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                </svg>
                <input 
                  type="checkbox" 
                  class="absolute opacity-0 w-0 h-0"
                  :checked="selectedKbIds.includes(kb.id)"
                  @change="toggleKbSelection(kb.id)"
                />
              </div>

              <!-- Folder Icon -->
              <div class="w-[22px] h-[22px] text-[#146bf7] flex items-center justify-center shrink-0">
                <svg viewBox="0 0 24 24" fill="currentColor" class="w-full h-full">
                  <!-- Folder body -->
                  <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
                  <!-- Inner icon: Cloud -->
                  <path v-if="kb.iconType === 'cloud'" d="M16 13.5c0-1.1-.9-2-2-2-.1 0-.2 0-.3.1-.3-.8-1-1.4-1.9-1.4-1.1 0-2 .9-2 2 0 .1 0 .2.1.3-.5.2-1 .7-1 1.4 0 .8.7 1.5 1.5 1.5h5c1 0 1.8-.8 1.8-1.8 0-.6-.4-1.2-1.2-1.1z" fill="white" transform="scale(0.55) translate(8.5, 9.5)"/>
                  <!-- Inner icon: Team -->
                  <path v-else d="M12.5 13c1 0 1.8-.8 1.8-1.8S13.5 9.4 12.5 9.4s-1.8.8-1.8 1.8.8 1.8 1.8 1.8zm-4 1c-1.8 0-5.5 1-5.5 3v1.5h11V17c0-2-3.7-3-5.5-3zm8.5 0c-.2 0-.4 0-.6.1 1.2.8 2 2 2 3.1v1.5h3.5V17c0-2-3.3-3-4.9-3z" fill="white" transform="scale(0.55) translate(8.5, 9.5)"/>
                </svg>
              </div>

              <!-- Label -->
              <span class="text-[15px] text-gray-800 tracking-wide select-none">{{ kb.name }}</span>

              <!-- Info Icon -->
              <div v-if="kb.hasInfo" class="ml-[-4px] text-gray-400">
                <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </label>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 flex justify-between items-center rounded-b-2xl bg-white border-t border-gray-100">
          <div class="flex items-center gap-5">
            <label class="flex items-center gap-2 cursor-pointer group">
              <div class="relative flex items-center justify-center w-[18px] h-[18px] rounded-[4px] border transition-colors duration-200"
                :class="selectedKbIds.length === knowledgeBases.length ? 'bg-[#146bf7] border-[#146bf7]' : 'bg-white border-gray-400 group-hover:border-[#146bf7]'"
              >
                <svg v-if="selectedKbIds.length === knowledgeBases.length" class="w-3 h-3 text-white pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                </svg>
                <!-- Partial selection indicator -->
                <svg v-else-if="selectedKbIds.length > 0" class="w-3 h-3 text-[#146bf7] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 12h14" />
                </svg>
                <input 
                  type="checkbox" 
                  class="absolute opacity-0 w-0 h-0"
                  :checked="selectedKbIds.length === knowledgeBases.length"
                  @change="toggleSelectAll"
                />
              </div>
              <span class="text-[14px] text-gray-600 select-none">全部</span>
            </label>

            <!-- vertical divider -->
            <div class="h-4 w-px bg-gray-200 -mx-1"></div>

            <div class="flex items-center gap-2 text-[14px] text-gray-900">
              <svg class="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span class="font-medium">已选团队/知识库 {{ selectedKbIds.length }}</span>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <button @click="isKbModalOpen = false" class="px-5 py-1.5 rounded-md text-[14px] text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors">
              取消
            </button>
            <button @click="isKbModalOpen = false" class="px-5 py-1.5 rounded-md text-[14px] text-white bg-[#146bf7] hover:bg-[#1156c7] transition-colors shadow-sm">
              确定
            </button>
          </div>
        </div>
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
