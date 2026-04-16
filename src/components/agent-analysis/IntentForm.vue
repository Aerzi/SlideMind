<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  mockData?: any
  presentationGoals: { id: string; title: string; tag?: string; desc: string }[]
  targetAudiences: { id: string; title: string; tag?: string; desc: string }[]
}>()

const emit = defineEmits<{
  (e: 'confirm', data: any): void
  (e: 'skip'): void
}>()

const isSubmitted = ref(false)
const countdown = ref(59)
let timer: any = null

const formData = ref({
  presentationGoal: props.mockData ? props.mockData.input.confirmedIntent.usageScene : (props.presentationGoals[0]?.id || ''),
  targetAudience: props.mockData ? props.mockData.input.confirmedIntent.targetAudience : (props.targetAudiences[0]?.id || ''),
  theme: props.mockData ? props.mockData.input.confirmedIntent.theme : '',
  additionalInfo: ''
})

const stopTimer = () => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

const handleConfirm = () => {
  if (isSubmitted.value) return
  stopTimer()
  isSubmitted.value = true
  emit('confirm', formData.value)
}

const handleSkip = () => {
  if (isSubmitted.value) return
  stopTimer()
  isSubmitted.value = true
  emit('skip')
}

onMounted(() => {
  timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      handleConfirm()
    }
  }, 1000)
})

onUnmounted(() => {
  stopTimer()
})
</script>

<template>
  <div class="mb-[36px] relative animate-in fade-in slide-in-from-bottom-4 duration-500 w-full pl-[4px] pr-[16px]">
    <div class="bg-white border border-gray-100 rounded-[16px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden w-[720px] max-w-full">
      
      <!-- Header -->
      <div class="px-6 py-5 flex justify-between items-center bg-white relative z-10">
        <div class="flex flex-col gap-1">
          <h3 class="text-[16px] font-medium text-gray-900 leading-none">请确认以下核心意图信息</h3>
          <p class="text-[13.5px] text-gray-400 leading-none mt-1">补全 P0 核心字段，确保生成方向正确</p>
        </div>
        <button class="text-gray-400 hover:text-gray-600 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>

      <!-- Form Body -->
      <div class="px-6 pb-6 pt-2 flex flex-col gap-7" :class="isSubmitted ? 'opacity-80 pointer-events-none' : ''">
        
        <div class="flex flex-col gap-3">
          <div class="text-[15px] font-medium text-gray-900 mb-1">核心主题 (Theme) <span class="text-red-500">*</span></div>
          <input 
            type="text" 
            v-model="formData.theme"
            placeholder="请输入PPT核心主题" 
            class="w-full border border-gray-200 rounded-[8px] px-4 py-[10px] text-[14px] outline-none hover:border-gray-300 focus:border-[#2d68f8] focus:ring-1 focus:ring-[#2d68f8] transition-all placeholder-gray-300 text-gray-900"
          >
        </div>

        <!-- Presentation Goal -->
        <div class="flex flex-col gap-3">
          <div class="text-[15px] font-medium text-gray-900 mb-1">使用场景 (Usage Scene) <span class="text-red-500">*</span></div>
          <div class="grid grid-cols-2 gap-3" v-if="!mockData">
            <div v-for="item in presentationGoals" :key="item.id" 
                 @click="formData.presentationGoal = item.id"
                 class="border rounded-[8px] p-4 cursor-pointer transition-all relative overflow-hidden"
                 :class="formData.presentationGoal === item.id ? 'border-[#2d68f8] bg-white' : 'border-gray-200 hover:border-gray-300 bg-white'"
            >
              <div class="flex items-center gap-2 mb-1">
                <span class="text-[15px] font-medium" :class="formData.presentationGoal === item.id ? 'text-[#1a1a1a]' : 'text-gray-800'">{{ item.title }}</span>
                <span v-if="item.tag" class="text-[11px] px-[6px] py-[2px] rounded-[4px] font-medium border" :class="formData.presentationGoal === item.id ? 'border-gray-200 bg-gray-50 text-gray-500' : 'border-gray-200 bg-gray-50 text-gray-500'">{{ item.tag }}</span>
              </div>
              <div class="text-[13.5px] text-gray-400 leading-[1.5] mt-1">{{ item.desc }}</div>
            </div>
          </div>
          <input 
            v-else
            type="text" 
            v-model="formData.presentationGoal"
            placeholder="请输入使用场景" 
            class="w-full border border-gray-200 rounded-[8px] px-4 py-[10px] text-[14px] outline-none hover:border-gray-300 focus:border-[#2d68f8] focus:ring-1 focus:ring-[#2d68f8] transition-all placeholder-gray-300 text-gray-900"
          >
        </div>

        <!-- Target Audience -->
        <div class="flex flex-col gap-3">
          <div class="text-[15px] font-medium text-gray-900 mb-1">目标受众 (Target Audience) <span class="text-red-500">*</span></div>
          <div class="grid grid-cols-2 gap-3" v-if="!mockData">
            <div v-for="item in targetAudiences" :key="item.id" 
                 @click="formData.targetAudience = item.id"
                 class="border rounded-[8px] p-4 cursor-pointer transition-all relative overflow-hidden"
                 :class="formData.targetAudience === item.id ? 'border-[#2d68f8] bg-white' : 'border-gray-200 hover:border-gray-300 bg-white'"
            >
              <div class="flex items-center gap-2 mb-1">
                <span class="text-[15px] font-medium" :class="formData.targetAudience === item.id ? 'text-[#1a1a1a]' : 'text-gray-800'">{{ item.title }}</span>
                <span v-if="item.tag" class="text-[11px] px-[6px] py-[2px] rounded-[4px] font-medium border" :class="formData.targetAudience === item.id ? 'border-gray-200 bg-gray-50 text-gray-500' : 'border-gray-200 bg-gray-50 text-gray-500'">{{ item.tag }}</span>
              </div>
              <div class="text-[13.5px] text-gray-400 leading-[1.5] mt-1">{{ item.desc }}</div>
            </div>
          </div>
          <input 
            v-else
            type="text" 
            v-model="formData.targetAudience"
            placeholder="请输入目标受众" 
            class="w-full border border-gray-200 rounded-[8px] px-4 py-[10px] text-[14px] outline-none hover:border-gray-300 focus:border-[#2d68f8] focus:ring-1 focus:ring-[#2d68f8] transition-all placeholder-gray-300 text-gray-900"
          >
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 flex items-center justify-between bg-white relative z-10 border-t border-gray-50">
        <div class="text-[13.5px] text-gray-500">
          <span v-if="!isSubmitted">如未对表单内容进行修改，<span class="font-medium text-gray-600">{{ countdown }} s</span> 后任务将自动进行</span>
          <span v-else class="text-green-600 flex items-center gap-1.5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>信息已确认并提交</span>
        </div>
        <div class="flex items-center gap-3">
          <button v-if="!isSubmitted" @click="handleSkip" class="px-[24px] py-[8px] rounded-[6px] border border-gray-200 text-gray-700 text-[14px] hover:bg-gray-50 transition-colors">
            跳过
          </button>
          <button @click="handleConfirm" class="px-[24px] py-[8px] rounded-[6px] text-white text-[14px] font-medium transition-colors shadow-sm border"
                  :class="isSubmitted ? 'bg-blue-400 border-blue-400 cursor-default pointer-events-none' : 'bg-[#2d68f8] hover:bg-[#1a55e0] border-[#2d68f8]'">
            {{ isSubmitted ? '已确认执行' : '确认并执行' }}
          </button>
        </div>
      </div>

    </div>
  </div>
</template>