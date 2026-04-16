<script setup lang="ts">
import type { PresetSlide } from '../../mock/agentAnalysisPresets'
import type { OutlineMockDataSet } from '../../mock/intentionMockData'

const props = defineProps<{
  title: string
  slides: PresetSlide[]
  mockData?: OutlineMockDataSet | null
  isRecallComplete?: boolean
}>()

const getRecalledContent = (chapterId: string) => {
  return props.mockData?.expectedRetrievalResult?.find(c => c.chapterId === chapterId)
}
</script>

<template>
  <div class="mb-[36px] relative animate-in fade-in slide-in-from-bottom-4 duration-500 w-full flex flex-col items-center mt-6">
    <div class="text-[16px] font-medium text-gray-900 mb-6">{{ title }} PPT 大纲</div>
    
    <div class="flex flex-col gap-4 w-[760px] max-w-full pb-4">
      <template v-if="mockData">
        <div 
          v-for="chapter in mockData.outputOutlineSkeleton.chapterList" 
          :key="chapter.chapterId"
          class="bg-white border border-gray-100 rounded-[12px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-gray-200 transition-colors relative"
          :class="{
            'ml-0': chapter.level === 'LEVEL_1',
            'ml-10': chapter.level === 'LEVEL_2',
            'ml-20': chapter.level === 'LEVEL_3'
          }"
        >
          <div class="flex items-center gap-2 mb-3">
            <span class="text-[11px] px-1.5 py-[2px] border border-blue-200 rounded bg-blue-50 text-blue-600 font-medium">{{ chapter.level }}</span>
            <span class="text-[12px] text-gray-400">Chapter ID: {{ chapter.chapterId }}</span>
          </div>
          <h4 class="text-[16px] font-medium text-gray-900 mb-2">
            <span class="mr-1">{{ chapter.chapterNumber }}</span>{{ chapter.chapterTitle }}
          </h4>
          <div class="text-[14px] text-gray-600 mb-1 leading-snug">{{ chapter.chapterDesc }}</div>

          <!-- Visualizing 1:1 binding -->
          <div class="mt-5 pt-4 border-t border-gray-100 flex flex-col gap-3">
            <div class="text-[12px] font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              1:1 章节绑定召回链路可视化
            </div>
            
            <div class="bg-gray-50 rounded-lg p-3 text-[13px] flex flex-col gap-2 relative border border-gray-200/60">
              <div class="flex flex-col">
                <span class="text-purple-600 font-medium mb-1">② 模型召回规则 (Retrieval Rule)</span>
                <span class="text-gray-700"><span class="text-gray-500">Command:</span> {{ chapter.retrievalRule.coreCommand }}</span>
                <span class="text-gray-700"><span class="text-gray-500">Scope:</span> {{ chapter.retrievalRule.scope.priorityDocIds.join(', ') }}</span>
                <span class="text-gray-700"><span class="text-gray-500">Keywords:</span> {{ chapter.retrievalRule.mustIncludeKeywords.join(', ') }}</span>
              </div>
              
              <template v-if="!isRecallComplete">
                <div class="w-px h-3 bg-gray-300 ml-3"></div>
                <div class="flex items-center gap-2 text-gray-500 mt-1 mb-1">
                  <svg class="animate-spin w-[14px] h-[14px] text-blue-500" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span class="text-[12px]">正在按当前规则执行内容召回...</span>
                </div>
              </template>
              <template v-else-if="getRecalledContent(chapter.chapterId)">
                <div class="w-px h-3 bg-gray-300 ml-3"></div>
                <div class="flex flex-col animate-in fade-in zoom-in duration-500">
                  <span class="text-green-600 font-medium mb-1">③ 召回内容 (Recalled Content)</span>
                  <span class="text-gray-700"><span class="text-gray-500">From:</span> {{ getRecalledContent(chapter.chapterId)?.sourceDocId }}</span>
                  <span class="text-gray-700 mt-1 leading-snug">{{ getRecalledContent(chapter.chapterId)?.recalledContent }}</span>
                </div>
              </template>
              <template v-else>
                <div class="w-px h-3 bg-gray-300 ml-3"></div>
                <div class="flex flex-col animate-in fade-in zoom-in duration-500 text-gray-400 italic">
                  此章节暂无对应召回内容。
                </div>
              </template>
            </div>
          </div>
        </div>
      </template>

      <!-- Fallback for preset/no mock data -->
      <template v-else>
        <div 
          v-for="slide in slides" 
          :key="slide.id"
          class="bg-white border border-gray-100 rounded-[12px] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-gray-200 transition-colors relative"
        >
          <div class="flex items-center gap-2 mb-3">
            <span class="text-[13px] text-gray-400">第 {{ slide.pageNumber }} 页</span>
            <span v-if="slide.tag" class="text-[11px] px-1.5 py-[2px] border border-gray-200 rounded text-gray-500">{{ slide.tag }}</span>
          </div>
          <h4 class="text-[16px] font-medium text-gray-900 mb-4">{{ slide.title }}</h4>
          <div class="flex flex-col gap-2.5">
            <div v-for="(item, iIndex) in slide.items" :key="iIndex" class="flex items-start gap-2">
              <div v-if="item.type === 'bullet' || item.type === 'subtitle'" class="w-1 h-1 rounded-full bg-gray-900 mt-[8px]"></div>
              <span class="text-[14px] text-gray-700">
                <span v-if="item.boldPrefix" class="font-medium text-gray-900">{{ item.boldPrefix }}</span>
                {{ item.content }}
              </span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>