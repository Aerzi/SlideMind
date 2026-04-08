<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import AgentSequenceDiagram from './AgentSequenceDiagram.vue'

const emit = defineEmits(['back'])

const props = defineProps<{
  topic: string
  files: any[]
  knowledgeBases: any[]
}>()

const isFilesExpanded = ref(false)

const allMaterials = computed(() => {
  const materials: any[] = []
  props.files.forEach(f => materials.push({ type: 'file', data: f }))
  props.knowledgeBases.forEach(k => materials.push({ type: 'kb', data: k }))
  return materials
})

const displayMaterials = computed(() => {
  if (allMaterials.value.length <= 3) return allMaterials.value
  return isFilesExpanded.value ? allMaterials.value : allMaterials.value.slice(0, 3)
})

const messages = ref<any[]>([])
const agentSteps = ref<any[]>([])
const scrollContainer = ref<HTMLElement | null>(null)

import { nextTick } from 'vue'

const scrollToBottom = () => {
  nextTick(() => {
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
    }
  })
}

const isTraceCollapsed = ref(false)

const startAgentSimulation = async () => {
  const steps = [
    {
      title: '文档解析',
      status: 'running',
      isExpanded: true,
      description: '我将帮你处理这个文档并生成 PPT。让我先解析你上传的文档',
      action: {
        icon: 'document',
        label: '文档解析',
        content: `解析${props.files[0]?.name?.replace(/\.[^/.]+$/, "") || '高性能生鲜电商客户端PDP模块研发实践汇报'}.pdf`
      },
      result: '文档已成功解析！我已获取到文档内容，这是一份关于“高性能生鲜电商客户端PDP模块研发实践”的总结汇报，内容结构清晰，包含了混合架构实践、核心难点攻关及量化性能收益。我将基于文档内容和用户需求进行意图分析。',
    },
    {
      title: '意图分析',
      status: 'pending',
      isExpanded: true,
      description: '现在我将把解析后的文档信息传递给意图识别 Agent，以分析你的PPT制作需求。',
      thought_title: '已完成思考',
      showThought: false,
      action: {
        icon: 'idea',
        label: '意图确认',
        content: '确认用户制作 PPT 的关键信息'
      }
    }
  ];

  agentSteps.value = []

  // Add Step 1
  const step1 = { ...steps[0], id: 0 };
  agentSteps.value.push(step1);
  scrollToBottom();
  
  await new Promise(resolve => setTimeout(resolve, 600));
  step1.status = 'completed';
  scrollToBottom();

  // Add Step 2
  const step2 = { ...steps[1], id: 1, status: 'running' };
  agentSteps.value.push(step2);
  scrollToBottom();

  await new Promise(resolve => setTimeout(resolve, 800));
  step2.status = 'completed';
  scrollToBottom();

  setTimeout(() => {
    isTraceCollapsed.value = true
    messages.value.push({ type: 'intent_form' })
    showIntentForm.value = true
    formTimer = setInterval(() => {
      formCountdown.value--
      if (formCountdown.value <= 0) {
        confirmForm()
      }
    }, 1000)
    scrollToBottom()
  }, 500)
}

const showIntentForm = ref(false)
const isIntentFormSubmitted = ref(false)
const formCountdown = ref(59)
let formTimer: any = null

const intentFormData = ref({
  presentationGoal: 'report',
  targetAudience: 'report',
  additionalInfo: ''
})

const presentationGoals = [
  { id: 'report', title: '转正/实习述职', tag: '推荐', desc: '文档属于技术实践总结，适合团队内部评审或晋升答辩' },
  { id: 'share', title: '技术沙龙分享', desc: '可用于前端与客户端行业交流活动的主题分享' },
  { id: 'flow', title: '研发流程宣贯', desc: '用于企业内部技术架构重构的规范宣贯' },
  { id: 'edu', title: '新人入职培训', desc: '适合新员工熟悉 PDP 模块架构的培训使用' }
]

const targetAudiences = [
  { id: 'report', title: '技术评审委', tag: '推荐', desc: '关注架构选型、技术难点攻克及最终量化收益' },
  { id: 'share', title: '大前端团队', desc: '关注 RN 与 Kotlin 混合开发的具体实现与踩坑经验' },
  { id: 'flow', title: '业务产品线', desc: '关注首屏秒开与交互流畅度带来的业务指标提升' },
  { id: 'edu', title: '研发实习生', desc: '关注工程化管理、代码规范及问题排查方法论' }
]

const confirmForm = () => {
  if (isIntentFormSubmitted.value) return
  if (formTimer) clearInterval(formTimer)
  isIntentFormSubmitted.value = true
  
  // AI confirms and shows planning module
  setTimeout(() => {
    messages.value.push({
      type: 'ai_text',
      text: '已收到您的意图确认。基于您的选择，我已为您生成了本次 PPT 的任务规格书，请您查阅：'
    })
    
    setTimeout(() => {
      messages.value.push({
        type: 'ppt_planning_module'
      })
      scrollToBottom()
      
      // Delay before proceeding to next phase
      setTimeout(() => {
        messages.value.push({
          type: 'langgraph_trace_phase2'
        })
        startPhase2Simulation()
      }, 1500)
    }, 500)
    
    scrollToBottom()
  }, 300)
}

const agentStepsPhase2 = ref<any[]>([])
const isTrace2Collapsed = ref(false)
const isPlanningModuleExpanded = ref(true)

const startPhase2Simulation = async () => {
  const steps = [
    {
      title: '知识检索',
      status: 'running',
      isExpanded: true,
      description: '根据确认的意图，我将从私有知识库中检索相关内容，确保大纲的专业性和针对性。',
      action: {
        icon: 'search',
        label: '内容检索',
        content: '检索关于“技术述职汇报”及受众相关的结构框架'
      },
      result: '检索完成。已获取 5 份高相关的技术答辩与重构总结模板作为参考依据。',
    },
    {
      title: '大纲生成',
      status: 'pending',
      isExpanded: true,
      description: '信息汇总完毕，正在为你生成 PPT 大纲草稿。',
      action: {
        icon: 'document',
        label: '生成大纲',
        content: '调用大纲生成模型'
      },
      result: '大纲生成完毕！即将为您呈现。',
    }
  ];

  agentStepsPhase2.value = []

  // Add Step 1
  const step1 = { ...steps[0], id: 10 };
  agentStepsPhase2.value.push(step1);
  scrollToBottom();
  
  await new Promise(resolve => setTimeout(resolve, 600));
  step1.status = 'completed';
  scrollToBottom();

  // Add Step 2
  const step2 = { ...steps[1], id: 11, status: 'running' };
  agentStepsPhase2.value.push(step2);
  scrollToBottom();

  await new Promise(resolve => setTimeout(resolve, 800));
  step2.status = 'completed';
  scrollToBottom();

  // Show final outline
  setTimeout(() => {
    isTrace2Collapsed.value = true
    messages.value.push({
      type: 'outline_result'
    })
    scrollToBottom()
  }, 500)
}

const skipForm = () => {
  if (isIntentFormSubmitted.value) return
  if (formTimer) clearInterval(formTimer)
  isIntentFormSubmitted.value = true
  
  setTimeout(() => {
    messages.value.push({
      type: 'ai_text',
      text: '收到。我将使用默认配置生成本次 PPT 的任务规格书，请您查阅：'
    })
    
    setTimeout(() => {
      messages.value.push({
        type: 'ppt_planning_module'
      })
      scrollToBottom()
      
      setTimeout(() => {
        messages.value.push({
          type: 'langgraph_trace_phase2'
        })
        startPhase2Simulation()
      }, 1500)
    }, 500)
    
    scrollToBottom()
  }, 300)
}

const toggleStepExpand = (stepId: number) => {
  let step = agentSteps.value.find(s => s.id === stepId);
  if (!step) step = agentStepsPhase2.value.find(s => s.id === stepId);
  if (step) {
    step.isExpanded = !step.isExpanded;
  }
}

onMounted(() => {
  // Add initial AI greeting based on user input
  setTimeout(() => {
    messages.value.push({
      type: 'ai_greeting',
      text: '收到。我将帮你完成高性能生鲜电商客户端PDP模块研发实践汇报并输出 PPT，这是一个需要专业技术沉淀与工程化呈现的任务。',
      files: props.files,
      topic: props.topic
    })
    
    // Start langgraph trace quickly for demo
    setTimeout(() => {
      messages.value.push({
        type: 'langgraph_trace'
      })
      startAgentSimulation()
    }, 300)
  }, 200)
})

</script>

<template>
  <div class="flex-1 w-full max-w-[1000px] mt-4 px-4 flex flex-col h-[calc(100vh-80px)] mx-auto relative">
    
    <!-- Top Action Bar -->
    <div class="absolute top-[24px] left-[32px] flex items-center z-20">
      <button 
        @click="$emit('back')" 
        class="flex items-center gap-1 text-gray-500 hover:text-gray-900 transition-colors text-[14px]"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        返回修改
      </button>
    </div>

    <div ref="scrollContainer" class="flex-1 overflow-y-auto pb-[160px] pt-[32px] px-[80px] custom-scrollbar relative z-10 flex flex-col items-center scroll-smooth">
      
        <div class="w-full max-w-[800px] flex flex-col pt-[32px] mx-auto">
        <!-- User Message -->
        <div class="flex flex-col items-end mb-[32px] animate-in fade-in slide-in-from-bottom-4 duration-500 relative w-full">
        
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
                  <div class="w-[32px] h-[32px] rounded-[6px] bg-[#2d68f8] flex items-center justify-center shrink-0 relative overflow-hidden shadow-sm">
                    <span class="text-white font-bold text-[18px] tracking-tighter relative z-10 font-sans">W</span>
                  </div>
                  <div class="flex flex-col overflow-hidden gap-[2px] pr-2 w-full">
                    <span class="text-[15px] text-[#1a1a1a] font-medium truncate leading-snug">{{ item.data.name.replace(/\.[^/.]+$/, "") }}</span>
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
              {{ topic || '帮我写一份高性能生鲜电商客户端PDP模块研发实践汇报 PPT' }}
            </div>
          </div>
      </div>
      </div>

      <div class="relative pl-[24px] border-l-[1.5px] border-[#e5e7eb] ml-[16px] pb-[40px] w-full mt-[32px]">
        <template v-for="(msg, index) in messages" :key="index">
          
          <!-- AI Greeting -->
          <div v-if="msg.type === 'ai_greeting'" class="mb-[36px] relative animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
            <!-- Timeline Icon -->
            <div class="absolute -left-[35px] top-[2px] bg-[#fafafc]">
              <div class="w-[20px] h-[20px] rounded-[6px] bg-[#f2f3f5] flex items-center justify-center border border-[#e5e7eb]">
                <svg class="w-[14px] h-[14px] text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            
            <!-- Content -->
          <div v-if="msg.text" class="text-[15px] text-[#1a1a1a] leading-[1.6] w-full relative z-20 mt-[6px]">
            {{ msg.text }}
          </div>
            <div class="mt-[10px] text-[13.5px] text-gray-400 flex items-center gap-[6px] relative z-20 font-medium">
              任务接收完毕
            </div>
          </div>

          <!-- LangGraph Trace / Agent Steps -->
          <div v-if="msg.type === 'langgraph_trace'" class="relative w-full" :class="isTraceCollapsed ? 'mb-[24px]' : 'pb-[40px]'">
            
            <!-- Collapsed State -->
            <div v-if="isTraceCollapsed" @click="isTraceCollapsed = false" class="flex items-center gap-2 text-gray-500 text-[13.5px] cursor-pointer hover:text-gray-700 transition-colors w-fit group">
              已完成 · 耗时 1m 15s
              <svg class="w-3.5 h-3.5 transition-transform group-hover:translate-y-[1px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            <!-- Expanded State -->
            <template v-else>
              <div v-for="(step, index) in agentSteps" :key="index" class="mb-[36px] relative animate-in fade-in w-full">
                <!-- Icon -->
                <div class="absolute left-[-31px] top-[2px] bg-[#fafafc] z-30 flex items-center justify-center py-1">
                  <div v-if="step.status === 'completed'" class="w-[14px] h-[14px] rounded-full border border-gray-300 flex items-center justify-center bg-white">
                    <svg class="w-2.5 h-2.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div v-else class="w-[14px] h-[14px] rounded-full border-[1.5px] border-[#e5e7eb] border-t-[#a855f7] animate-spin bg-white"></div>
                </div>
                
                <!-- Title -->
                <div @click="toggleStepExpand(step.id)" class="flex items-center gap-[6px] text-[15px] font-medium text-[#1a1a1a] mb-[12px] cursor-pointer mt-[0.5px] relative z-20 group select-none">
                  {{ step.title }}
                  <svg class="w-[14px] h-[14px] text-gray-400 group-hover:text-gray-600 transition-transform" :class="step.isExpanded ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 9l-7 7-7-7" />
                  </svg>
                  <span v-if="step.status === 'completed'" class="text-[12.5px] text-gray-400 font-normal ml-1">· 耗时 1m 15s</span>
                </div>
                
                <!-- Description -->
                <div class="text-[14.5px] text-[#1a1a1a] mb-[12px] leading-[1.6] relative z-20 font-light">
                  {{ step.description }}
                </div>

                <!-- Collapsible area -->
                <div v-show="step.isExpanded" class="flex flex-col gap-3">
                  <!-- Thought complete toggle -->
                  <div v-if="step.thought_title" class="flex flex-col gap-2 mt-1">
                    <div class="flex items-center gap-[6px] text-[13.5px] text-gray-500 cursor-pointer group w-fit" @click="step.showThought = !step.showThought">
                      {{ step.thought_title }}
                      <svg class="w-3.5 h-3.5 transition-transform" :class="step.showThought ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <div v-show="step.showThought" class="inline-flex items-center gap-2 bg-[#f4f4f5] px-[12px] py-[8px] rounded-[8px] shadow-sm border border-transparent w-fit relative z-20 animate-in fade-in zoom-in-95 duration-200">
                        <svg class="w-[16px] h-[16px] text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <span class="text-[13.5px] text-[#1a1a1a] tracking-wide">{{ step.action?.label }} <span class="text-gray-300 mx-1.5 font-light">|</span> <span class="text-gray-500">{{ step.action?.content }}</span></span>
                    </div>
                  </div>

                  <!-- Tool call pill -->
                  <div v-if="step.action && !step.thought_title" class="inline-flex items-center gap-2 bg-[#f4f4f5] px-[12px] py-[8px] rounded-[8px] shadow-sm border border-transparent w-fit relative z-20">
                    <!-- SVG icon based on step.action.icon -->
                    <svg v-if="step.action.icon === 'document'" class="w-[16px] h-[16px] text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <svg v-else class="w-[16px] h-[16px] text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span class="text-[13.5px] text-[#1a1a1a] tracking-wide">{{ step.action.label }} <span class="text-gray-300 mx-1.5 font-light">|</span> <span class="text-gray-500">{{ step.action.content }}</span></span>
                  </div>

                  <!-- Result text -->
                  <div v-if="step.result && step.status === 'completed'" class="text-[14.5px] text-[#1a1a1a] leading-[1.6] font-light animate-in fade-in duration-500">
                    {{ step.result }}
                  </div>
                </div>
              </div>
            </template>
          </div>

          <!-- Intent Confirmation Form -->
          <div v-if="msg.type === 'intent_form' && showIntentForm" class="mb-[36px] relative animate-in fade-in slide-in-from-bottom-4 duration-500 w-full pl-[4px] pr-[16px]">
            <div class="bg-white border border-gray-100 rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden w-[720px] max-w-full">
              
              <!-- Header -->
              <div class="px-6 py-5 flex justify-between items-center bg-white relative z-10">
                <div class="flex flex-col gap-1">
                  <h3 class="text-[16px] font-medium text-gray-900 leading-none">请确认以下关键信息</h3>
                  <p class="text-[13.5px] text-gray-400 leading-none mt-1">帮你生成更符合预期的高质量内容</p>
                </div>
                <button class="text-gray-400 hover:text-gray-600 transition-colors">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M5 15l7-7 7 7" />
                  </svg>
                </button>
              </div>

              <!-- Form Body -->
              <div class="px-6 pb-6 pt-2 flex flex-col gap-7" :class="isIntentFormSubmitted ? 'opacity-80 pointer-events-none' : ''">
                
                <!-- Presentation Goal -->
                <div class="flex flex-col gap-3">
                  <div class="text-[15px] font-medium text-gray-900 mb-1">演示目标</div>
                  <div class="grid grid-cols-2 gap-3">
                    <div v-for="item in presentationGoals" :key="item.id" 
                         @click="intentFormData.presentationGoal = item.id"
                         class="border rounded-[8px] p-4 cursor-pointer transition-all relative overflow-hidden"
                         :class="intentFormData.presentationGoal === item.id ? 'border-[#2d68f8] bg-white' : 'border-gray-200 hover:border-gray-300 bg-white'"
                    >
                      <div class="flex items-center gap-2 mb-1">
                        <span class="text-[15px] font-medium" :class="intentFormData.presentationGoal === item.id ? 'text-[#1a1a1a]' : 'text-gray-800'">{{ item.title }}</span>
                        <span v-if="item.tag" class="text-[11px] px-[6px] py-[2px] rounded-[4px] font-medium border" :class="intentFormData.presentationGoal === item.id ? 'border-gray-200 bg-gray-50 text-gray-500' : 'border-gray-200 bg-gray-50 text-gray-500'">{{ item.tag }}</span>
                      </div>
                      <div class="text-[13.5px] text-gray-400 leading-[1.5] mt-1">{{ item.desc }}</div>
                    </div>
                  </div>
                </div>

                <!-- Target Audience -->
                <div class="flex flex-col gap-3">
                  <div class="text-[15px] font-medium text-gray-900 mb-1">受众人群</div>
                  <div class="grid grid-cols-2 gap-3">
                    <div v-for="item in targetAudiences" :key="item.id" 
                         @click="intentFormData.targetAudience = item.id"
                         class="border rounded-[8px] p-4 cursor-pointer transition-all relative overflow-hidden"
                         :class="intentFormData.targetAudience === item.id ? 'border-[#2d68f8] bg-white' : 'border-gray-200 hover:border-gray-300 bg-white'"
                    >
                      <div class="flex items-center gap-2 mb-1">
                        <span class="text-[15px] font-medium" :class="intentFormData.targetAudience === item.id ? 'text-[#1a1a1a]' : 'text-gray-800'">{{ item.title }}</span>
                        <span v-if="item.tag" class="text-[11px] px-[6px] py-[2px] rounded-[4px] font-medium border" :class="intentFormData.targetAudience === item.id ? 'border-gray-200 bg-gray-50 text-gray-500' : 'border-gray-200 bg-gray-50 text-gray-500'">{{ item.tag }}</span>
                      </div>
                      <div class="text-[13.5px] text-gray-400 leading-[1.5] mt-1">{{ item.desc }}</div>
                    </div>
                  </div>
                </div>

                <!-- Additional Info -->
                <div class="flex flex-col gap-3">
                  <div class="text-[15px] font-medium text-gray-900 mb-1">我要补充更多信息</div>
                  <input 
                    type="text" 
                    v-model="intentFormData.additionalInfo"
                    placeholder="请输入内容" 
                    class="w-full border border-gray-200 rounded-[8px] px-4 py-[10px] text-[14px] outline-none hover:border-gray-300 focus:border-[#2d68f8] focus:ring-1 focus:ring-[#2d68f8] transition-all placeholder-gray-300 text-gray-900"
                  >
                </div>
              </div>

              <!-- Footer -->
              <div class="px-6 py-4 flex items-center justify-between bg-white relative z-10 border-t border-gray-50">
                <div class="text-[13.5px] text-gray-500">
                  <span v-if="!isIntentFormSubmitted">如未对表单内容进行修改，<span class="font-medium text-gray-600">{{ formCountdown }} s</span> 后任务将自动进行</span>
                  <span v-else class="text-green-600 flex items-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>信息已确认并提交</span>
                </div>
                <div class="flex items-center gap-3">
                  <button v-if="!isIntentFormSubmitted" @click="skipForm" class="px-[24px] py-[8px] rounded-[6px] border border-gray-200 text-gray-700 text-[14px] hover:bg-gray-50 transition-colors">
                    跳过
                  </button>
                  <button @click="confirmForm" class="px-[24px] py-[8px] rounded-[6px] text-white text-[14px] font-medium transition-colors shadow-sm border"
                          :class="isIntentFormSubmitted ? 'bg-blue-400 border-blue-400 cursor-default pointer-events-none' : 'bg-[#2d68f8] hover:bg-[#1a55e0] border-[#2d68f8]'">
                    {{ isIntentFormSubmitted ? '已确认执行' : '确认并执行' }}
                  </button>
                </div>
              </div>

            </div>
          </div>

          <!-- Sequence Diagram is already handled above this old step -->
            

          <!-- User Intent Confirmed Message (Removed rendering as form stays) -->
          
          <!-- AI Text Message -->
          <div v-if="msg.type === 'ai_text'" class="mb-[36px] relative animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
            <div class="text-[15px] text-[#1a1a1a] leading-[1.6] w-full relative z-20 mt-[6px]">
              {{ msg.text }}
            </div>
          </div>

          <!-- PPT Planning Module -->
          <div v-if="msg.type === 'ppt_planning_module'" class="mb-[36px] relative animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex justify-start">
            <div class="bg-white border border-gray-200 rounded-[12px] shadow-sm w-[760px] max-w-full font-mono text-[13.5px] transition-all overflow-hidden relative">
              
              <!-- Header -->
              <div class="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-200 cursor-pointer" @click="isPlanningModuleExpanded = !isPlanningModuleExpanded">
                <div class="text-gray-400 text-[13px] font-sans flex items-center gap-2">
                  <svg class="w-4 h-4 transition-transform duration-200" :class="isPlanningModuleExpanded ? 'rotate-90' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
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

              <!-- Body with line numbers and text -->
              <div v-show="isPlanningModuleExpanded" class="flex bg-white text-[13.5px] leading-[1.8] font-mono">
                <!-- Line numbers -->
                <div class="flex flex-col items-center pl-3 pr-2 py-3 bg-[#fafafc] border-r border-gray-100 text-gray-300 select-none w-[36px] shrink-0 text-[13px]">
                  <span v-for="n in 30" :key="n">{{ n }}</span>
                </div>
                <!-- Content -->
                <div class="flex-1 px-4 py-3 text-[#24292f] overflow-x-auto whitespace-pre font-[Consolas,Monaco,monospace]">
                  <div class="flex flex-col text-[13.5px]">
<span class="text-[#0550ae] font-semibold"># Sprint Contract - PPT任务规格书</span>
<span></span>
<span class="text-[#0550ae] font-semibold">## 任务基本信息</span>
<span>- 场景类型：向上汇报</span>
<span>- 目标受众：CEO，1人，背景为销售背景</span>
<span>- 演示时长：15分钟</span>
<span>- 页数要求：10-12页</span>
<span>- 数据来源：<span class="italic text-gray-500">q1_sales.xlsx（已附加）</span></span>
<span></span>
<span class="text-[#0550ae] font-semibold">## 内容规格</span>
<span>- <span class="italic text-gray-500">第1页</span>：核心结论<span class="italic text-gray-500">（Q1整体情况，1句话+3个关键数字）</span></span>
<span>- <span class="italic text-gray-500">第2-4页</span>：三大亮点<span class="italic text-gray-500">（正向，各附数据支撑）</span></span>
<span>- <span class="italic text-gray-500">第5-7页</span>：三大问题<span class="italic text-gray-500">（负向，各附根因分析）</span></span>
<span>- <span class="italic text-gray-500">第8-9页</span>：Q2行动计划<span class="italic text-gray-500">（对应每个问题）</span></span>
<span>- <span class="italic text-gray-500">第10页</span>：附录-数据明细</span>
<span></span>
<span class="text-[#0550ae] font-semibold">## 设计规格</span>
<span>- 主色：#1A73E8<span class="italic text-gray-500">（企业色）</span></span>
<span>- 字体：标题使用方正黑体，正文使用思源宋体</span>
<span>- 图表：数量对比用柱状图，趋势用折线图</span>
<span></span>
<span class="text-[#0550ae] font-semibold">## 验收标准（直接映射评测体系）</span>
<span>- L1：全部通过</span>
<span>- L2a布局：≥ 75分</span>
<span>- L3叙事：结论前置性 ≥ 4分，数据支撑性 ≥ 4分</span>
<span></span>
<span class="text-[#0550ae] font-semibold">## 禁止事项</span>
<span>- 正文每页不超过120字</span>
<span>- 不使用模糊表述如"大幅增长"<span class="italic text-gray-500">（必须有数字）</span></span>
<span>- 不在正文页放超过2个图表</span></div>
                </div>
              </div>
            </div>
          </div>

          <!-- LangGraph Trace Phase 2 -->
          <div v-if="msg.type === 'langgraph_trace_phase2'" class="relative w-full" :class="isTrace2Collapsed ? 'mb-[24px]' : 'pb-[40px]'">
            
            <!-- Collapsed State -->
            <div v-if="isTrace2Collapsed" @click="isTrace2Collapsed = false" class="flex items-center gap-2 text-gray-500 text-[13.5px] cursor-pointer hover:text-gray-700 transition-colors w-fit group">
              已完成 · 耗时 48s
              <svg class="w-3.5 h-3.5 transition-transform group-hover:translate-y-[1px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            <!-- Expanded State -->
            <template v-else>
              <div v-for="(step, index) in agentStepsPhase2" :key="index" class="mb-[36px] relative animate-in fade-in w-full">
                <!-- Icon -->
                <div class="absolute left-[-31px] top-[2px] bg-[#fafafc] z-30 flex items-center justify-center py-1">
                  <div v-if="step.status === 'completed'" class="w-[14px] h-[14px] rounded-full border border-gray-300 flex items-center justify-center bg-white">
                    <svg class="w-2.5 h-2.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div v-else class="w-[14px] h-[14px] rounded-full border-[1.5px] border-[#e5e7eb] border-t-[#a855f7] animate-spin bg-white"></div>
                </div>
                
                <!-- Title -->
                <div @click="toggleStepExpand(step.id)" class="flex items-center gap-[6px] text-[15px] font-medium text-[#1a1a1a] mb-[12px] cursor-pointer mt-[0.5px] relative z-20 group select-none">
                  {{ step.title }}
                  <svg class="w-[14px] h-[14px] text-gray-400 group-hover:text-gray-600 transition-transform" :class="step.isExpanded ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M19 9l-7 7-7-7" />
                  </svg>
                  <span v-if="step.status === 'completed'" class="text-[12.5px] text-gray-400 font-normal ml-1">· 耗时 48s</span>
                </div>
                
                <!-- Description -->
                <div class="text-[14.5px] text-[#1a1a1a] mb-[12px] leading-[1.6] relative z-20 font-light">
                  {{ step.description }}
                </div>

                <!-- Collapsible area -->
                <div v-show="step.isExpanded" class="flex flex-col gap-3">
                  <div v-if="step.action" class="inline-flex items-center gap-2 bg-[#f4f4f5] px-[12px] py-[8px] rounded-[8px] shadow-sm border border-transparent w-fit relative z-20">
                    <svg v-if="step.action.icon === 'search'" class="w-[16px] h-[16px] text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <svg v-else class="w-[16px] h-[16px] text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span class="text-[13.5px] text-[#1a1a1a] tracking-wide">{{ step.action.label }} <span class="text-gray-300 mx-1.5 font-light">|</span> <span class="text-gray-500">{{ step.action.content }}</span></span>
                  </div>

                  <!-- Result text -->
                  <div v-if="step.result && step.status === 'completed'" class="text-[14.5px] text-[#1a1a1a] leading-[1.6] font-light animate-in fade-in duration-500">
                    {{ step.result }}
                  </div>
                </div>
              </div>
            </template>
          </div>

        </template>
      </div>

      <!-- Outline Result -->
      <div v-if="messages.some(m => m.type === 'outline_result')" class="mb-[36px] relative animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex flex-col items-center mt-6">
            
            <div class="text-[16px] font-medium text-gray-900 mb-6">{{ topic || '高性能生鲜电商客户端PDP模块研发实践汇报' }} PPT 大纲</div>
            
            <div class="flex flex-col gap-4 w-[760px] max-w-full">
              
              <!-- Slide 1 -->
              <div class="bg-white border border-gray-100 rounded-[12px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-gray-200 transition-colors relative">
                <div class="flex items-center gap-2 mb-3">
                  <span class="text-[13px] text-gray-400">第 1 页</span>
                  <span class="text-[11px] px-1.5 py-[2px] border border-gray-200 rounded text-gray-500">封面</span>
                </div>
                <h4 class="text-[16px] font-medium text-gray-900 mb-4">高性能生鲜电商客户端 PDP 模块研发实践汇报</h4>
                <div class="flex flex-col gap-2">
                  <div class="flex items-start gap-2">
                    <div class="w-1 h-1 rounded-full bg-gray-900 mt-[8px]"></div>
                    <span class="text-[14px] text-gray-700">副标题：React Native 与 Kotlin 混合开发、性能优化</span>
                  </div>
                  <div class="flex items-start gap-2">
                    <div class="w-1 h-1 rounded-full bg-gray-900 mt-[8px]"></div>
                    <span class="text-[14px] text-gray-700">页脚补充：汇报人信息 | XXX 有限公司 客户端研发部</span>
                  </div>
                </div>
              </div>

              <!-- Slide 2 -->
              <div class="bg-white border border-gray-100 rounded-[12px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-gray-200 transition-colors relative">
                <div class="flex items-center gap-2 mb-3">
                  <span class="text-[13px] text-gray-400">第 2 页</span>
                </div>
                <h4 class="text-[16px] font-medium text-gray-900 mb-4">个人简介与实习概况</h4>
                <div class="flex flex-col gap-2.5">
                  <div class="flex items-center gap-2">
                    <div class="w-1 h-1 rounded-full bg-gray-900"></div>
                    <span class="text-[14px] text-gray-700">实习时间：2025.07.10 ‒ 2025.09.24</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="w-1 h-1 rounded-full bg-gray-900"></div>
                    <span class="text-[14px] text-gray-700">核心角色：混合架构研发小组成员</span>
                  </div>
                  <div class="flex items-start gap-2">
                    <div class="w-1 h-1 rounded-full bg-gray-900 mt-[8px]"></div>
                    <span class="text-[14px] text-gray-700">主要职责：PDP 核心逻辑开发、Kotlin 原生插件封装、长列表性能调优、工程化质量保障。</span>
                  </div>
                </div>
              </div>

              <!-- Slide 3 -->
              <div class="bg-white border border-gray-100 rounded-[12px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-gray-200 transition-colors relative">
                <div class="flex items-center gap-2 mb-3">
                  <span class="text-[13px] text-gray-400">第 3 页</span>
                </div>
                <h4 class="text-[16px] font-medium text-gray-900 mb-4">行业背景与技术路线</h4>
                <div class="flex flex-col gap-2.5">
                  <div class="flex items-start gap-2">
                    <div class="w-1 h-1 rounded-full bg-gray-900 mt-[8px]"></div>
                    <span class="text-[14px] text-gray-700"><span class="font-medium text-gray-900">生鲜电商特征：</span>高频交互、强即时性、营销变动快</span>
                  </div>
                  <div class="flex items-start gap-2">
                    <div class="w-1 h-1 rounded-full bg-gray-900 mt-[8px]"></div>
                    <span class="text-[14px] text-gray-700"><span class="font-medium text-gray-900">技术选型：</span>React Native（业务灵活性） + Kotlin（原生稳定性）</span>
                  </div>
                  <div class="flex items-start gap-2">
                    <div class="w-1 h-1 rounded-full bg-gray-900 mt-[8px]"></div>
                    <span class="text-[14px] text-gray-700"><span class="font-medium text-gray-900">核心诉求：</span>在保证研发效率的同时，追求不输于全原生的交互性能</span>
                  </div>
                </div>
              </div>

              <!-- Slide 4 -->
              <div class="bg-white border border-gray-100 rounded-[12px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-gray-200 transition-colors relative">
                <div class="flex items-center gap-2 mb-3">
                  <span class="text-[13px] text-gray-400">第 4 页</span>
                </div>
                <h4 class="text-[16px] font-medium text-gray-900 mb-4">核心项目：商品详情页(PDP)重构</h4>
                <div class="flex flex-col gap-2.5">
                  <div class="flex items-start gap-2">
                    <div class="w-1 h-1 rounded-full bg-gray-900 mt-[8px]"></div>
                    <span class="text-[14px] text-gray-700"><span class="font-medium text-gray-900">挑战点：</span>SKU 多维规格联动、高清视频加载、长图文内存占用</span>
                  </div>
                  <div class="flex items-start gap-2">
                    <div class="w-1 h-1 rounded-full bg-gray-900 mt-[8px]"></div>
                    <span class="text-[14px] text-gray-700"><span class="font-medium text-gray-900">现状分析：</span>旧版页面在低端机存在滑动掉帧和规格切换卡顿</span>
                  </div>
                  <div class="flex items-start gap-2">
                    <div class="w-1 h-1 rounded-full bg-gray-900 mt-[8px]"></div>
                    <span class="text-[14px] text-gray-700"><span class="font-medium text-gray-900">重构目标：</span>FPS 稳定 58+，首屏加载 400ms 以内</span>
                  </div>
                </div>
              </div>

              <!-- Slide 5 -->
              <div class="bg-white border border-gray-100 rounded-[12px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-gray-200 transition-colors relative">
                <div class="flex items-center gap-2 mb-3">
                  <span class="text-[13px] text-gray-400">第 5 页</span>
                </div>
                <h4 class="text-[16px] font-medium text-gray-900 mb-4">混合架构设计：Bridge 与 JSI 实践</h4>
                <div class="flex flex-col gap-2.5">
                  <div class="flex items-start gap-2">
                    <div class="w-1 h-1 rounded-full bg-gray-900 mt-[8px]"></div>
                    <span class="text-[14px] text-gray-700"><span class="font-medium text-gray-900">架构分层：</span>UI 表现层(RN)、中间件层(JSI)、能力支撑层(Kotlin)</span>
                  </div>
                  <div class="flex items-start gap-2">
                    <div class="w-1 h-1 rounded-full bg-gray-900 mt-[8px]"></div>
                    <span class="text-[14px] text-gray-700"><span class="font-medium text-gray-900">技术点：</span>利用 JSI 实现同步调用，绕过 JSON 序列化开销</span>
                  </div>
                </div>
              </div>

              <!-- Slide 6 -->
              <div class="bg-white border border-gray-100 rounded-[12px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-gray-200 transition-colors relative">
                <div class="flex items-center gap-2 mb-3">
                  <span class="text-[13px] text-gray-400">第 6 页</span>
                </div>
                <h4 class="text-[16px] font-medium text-gray-900 mb-4">原生攻关：基于 Kotlin 的高性能多媒体组件</h4>
                <div class="flex flex-col gap-2.5">
                  <div class="flex items-start gap-2">
                    <div class="w-1 h-1 rounded-full bg-gray-900 mt-[8px]"></div>
                    <span class="text-[14px] text-gray-700"><span class="font-medium text-gray-900">方案：</span>封装 Google ExoPlayer，弃用纯 JS 视频库</span>
                  </div>
                  <div class="flex items-start gap-2">
                    <div class="w-1 h-1 rounded-full bg-gray-900 mt-[8px]"></div>
                    <span class="text-[14px] text-gray-700"><span class="font-medium text-gray-900">特性：</span>生命周期感应、硬件加速解码、Surface 生命周期管控</span>
                  </div>
                </div>
              </div>

              <!-- Slide 7 -->
              <div class="bg-white border border-gray-100 rounded-[12px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-gray-200 transition-colors relative">
                <div class="flex items-center gap-2 mb-3">
                  <span class="text-[13px] text-gray-400">第 7 页</span>
                </div>
                <h4 class="text-[16px] font-medium text-gray-900 mb-4">算法创新：SKU 路径字典逻辑</h4>
                <div class="flex flex-col gap-2.5">
                  <div class="flex items-start gap-2">
                    <div class="w-1 h-1 rounded-full bg-gray-900 mt-[8px]"></div>
                    <span class="text-[14px] text-gray-700"><span class="font-medium text-gray-900">对比图：</span>O(n²) 递归查找 vs O(1) 字典查找</span>
                  </div>
                  <div class="flex items-start gap-2">
                    <div class="w-1 h-1 rounded-full bg-gray-900 mt-[8px]"></div>
                    <span class="text-[14px] text-gray-700"><span class="font-medium text-gray-900">实现：</span>全排列预处理生成路径字典</span>
                  </div>
                  <div class="flex items-start gap-2">
                    <div class="w-1 h-1 rounded-full bg-gray-900 mt-[8px]"></div>
                    <span class="text-[14px] text-gray-700"><span class="font-medium text-gray-900">成果：</span>规格切换响应耗时由 200ms 降至 30ms 以内</span>
                  </div>
                </div>
              </div>

              <!-- Slide 8 -->
              <div class="bg-white border border-gray-100 rounded-[12px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-gray-200 transition-colors relative">
                <div class="flex items-center gap-2 mb-3">
                  <span class="text-[13px] text-gray-400">第 8 页</span>
                </div>
                <h4 class="text-[16px] font-medium text-gray-900 mb-4">性能优化：长列表与内存治理</h4>
                <div class="flex flex-col gap-2.5">
                  <div class="flex items-start gap-2">
                    <div class="w-1 h-1 rounded-full bg-gray-900 mt-[8px]"></div>
                    <span class="text-[14px] text-gray-700"><span class="font-medium text-gray-900">组件：</span>从 FlatList 迁移至 RecyclerListView</span>
                  </div>
                  <div class="flex items-start gap-2">
                    <div class="w-1 h-1 rounded-full bg-gray-900 mt-[8px]"></div>
                    <span class="text-[14px] text-gray-700"><span class="font-medium text-gray-900">策略：</span>视图复用池、分级渲染、离屏强制回收</span>
                  </div>
                </div>
              </div>

              <!-- Slide 9 -->
              <div class="bg-white border border-gray-100 rounded-[12px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-gray-200 transition-colors relative">
                <div class="flex items-center gap-2 mb-3">
                  <span class="text-[13px] text-gray-400">第 9 页</span>
                </div>
                <h4 class="text-[16px] font-medium text-gray-900 mb-4">工程化管理：工业级质量保障</h4>
                <div class="flex flex-col gap-2.5">
                  <div class="flex items-start gap-2">
                    <div class="w-1 h-1 rounded-full bg-gray-900 mt-[8px]"></div>
                    <span class="text-[14px] text-gray-700"><span class="font-medium text-gray-900">流程：</span>Gitflow 分支策略、Code Review、CI/CD 流水线</span>
                  </div>
                  <div class="flex items-start gap-2">
                    <div class="w-1 h-1 rounded-full bg-gray-900 mt-[8px]"></div>
                    <span class="text-[14px] text-gray-700"><span class="font-medium text-gray-900">质量：</span>Jest 单元测试覆盖 SKU 算法，Lint 代码静态检查</span>
                  </div>
                </div>
              </div>

              <!-- Slide 10 -->
              <div class="bg-white border border-gray-100 rounded-[12px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-gray-200 transition-colors relative">
                <div class="flex items-center gap-2 mb-3">
                  <span class="text-[13px] text-gray-400">第 10 页</span>
                </div>
                <h4 class="text-[16px] font-medium text-gray-900 mb-4">量化成果：重构前后性能对比</h4>
                <div class="flex flex-col gap-2.5">
                  <div class="flex items-start gap-2">
                    <div class="w-1 h-1 rounded-full bg-gray-900 mt-[8px]"></div>
                    <span class="text-[14px] text-gray-700"><span class="font-medium text-gray-900">表格对比：</span>FPS（45 -> 58.5）、首屏耗时（650ms -> 380ms）、Crash 率（<0.05%）</span>
                  </div>
                  <div class="flex items-start gap-2">
                    <div class="w-1 h-1 rounded-full bg-gray-900 mt-[8px]"></div>
                    <span class="text-[14px] text-gray-700"><span class="font-medium text-gray-900">视觉展示：</span>平滑度对比曲线、机型覆盖测试结果</span>
                  </div>
                </div>
              </div>

              <!-- Slide 11 -->
              <div class="bg-white border border-gray-100 rounded-[12px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-gray-200 transition-colors relative">
                <div class="flex items-center gap-2 mb-3">
                  <span class="text-[13px] text-gray-400">第 11 页</span>
                </div>
                <h4 class="text-[16px] font-medium text-gray-900 mb-4">总结与收获：从码农到工程师的蜕变</h4>
                <div class="flex flex-col gap-2.5">
                  <div class="flex items-start gap-2">
                    <div class="w-1 h-1 rounded-full bg-gray-900 mt-[8px]"></div>
                    <span class="text-[14px] text-gray-700"><span class="font-medium text-gray-900">认知升级：</span>从“实现功能”到“追求工程极致”</span>
                  </div>
                  <div class="flex items-start gap-2">
                    <div class="w-1 h-1 rounded-full bg-gray-900 mt-[8px]"></div>
                    <span class="text-[14px] text-gray-700"><span class="font-medium text-gray-900">能力提升：</span>混合开发底层原理、性能分析方法论、团队协作素养</span>
                  </div>
                </div>
              </div>

              <!-- Slide 12 -->
              <div class="bg-white border border-gray-100 rounded-[12px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-gray-200 transition-colors relative mb-[20px]">
                <div class="flex items-center gap-2 mb-3">
                  <span class="text-[13px] text-gray-400">第 12 页</span>
                  <span class="text-[11px] px-1.5 py-[2px] border border-gray-200 rounded text-gray-500">封底</span>
                </div>
                <h4 class="text-[16px] font-medium text-gray-900 mb-4">结语与 Q&A</h4>
                <div class="flex flex-col gap-2.5">
                  <div class="flex items-start gap-2">
                    <div class="w-1 h-1 rounded-full bg-gray-900 mt-[8px]"></div>
                    <span class="text-[14px] text-gray-700"><span class="font-medium text-gray-900">结语：</span>技术赋能民生，代码驱动效率</span>
                  </div>
                  <div class="flex items-start gap-2">
                    <div class="w-1 h-1 rounded-full bg-gray-900 mt-[8px]"></div>
                    <span class="text-[14px] text-gray-700"><span class="font-medium text-gray-900">致谢：</span>感谢导师与团队的信任与指导</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

    </div>
    </div>

    <!-- Generate PPT Button (Fixed Bottom) -->
    <div class="absolute bottom-[40px] left-1/2 -translate-x-1/2 z-20" v-if="messages.some(m => m.type === 'outline_result')">
      <button class="bg-[#8b5cf6] hover:bg-[#7c3aed] text-white px-[48px] py-[12px] rounded-full text-[16px] font-medium shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 tracking-wide w-fit">
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10.5 4.5L12 2l1.5 2.5L16 6l-2.5 1.5L12 10l-1.5-2.5L8 6l2.5-1.5zM19 12.5L20 11l1 1.5L22.5 14l-1.5 1.5L20 17l-1-1.5L17.5 14l1.5-1.5zM6 14.5L7 13l1 1.5L9.5 16l-1.5 1.5L7 19l-1-1.5L4.5 16l1.5-1.5z" />
        </svg>
        生成 PPT
      </button>
    </div>

  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.08);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.15);
}
</style>