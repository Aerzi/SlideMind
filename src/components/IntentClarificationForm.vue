<script setup lang="ts">
import { computed, ref } from 'vue'
import type { IntentClarificationFormPayload, IntentQuestion } from '../utils/intentClarificationForm'

const props = defineProps<{
  form: IntentClarificationFormPayload
  countdown: number
  intentSubmitted: boolean
  pipelineRunning: boolean
}>()

const answers = defineModel<Record<string, string | string[]>>('answers', { required: true })
const additionalNotes = defineModel<string>('additionalNotes', { default: '' })

const emit = defineEmits<{
  confirm: []
  skip: []
  addOption: [payload: { questionId: string; label: string; type: 'single' | 'multi' }]
}>()

const draftLabel = ref<Record<string, string>>({})
const showDraftInput = ref<Record<string, boolean>>({})

function openDraftInput(qid: string) {
  showDraftInput.value = { ...showDraftInput.value, [qid]: true }
}

const canInteract = computed(() => !props.intentSubmitted && !props.pipelineRunning)

const displaySubtitle = computed(
  () => props.form.subtitle?.trim() || '帮你生成更符合预期的高质量内容',
)

const isSingleSelected = (q: IntentQuestion, oid: string) => {
  return typeof answers.value[q.id] === 'string' && answers.value[q.id] === oid
}

const isMultiSelected = (q: IntentQuestion, oid: string) => {
  const v = answers.value[q.id]
  return Array.isArray(v) && v.includes(oid)
}

function selectSingle(q: IntentQuestion, oid: string) {
  if (!canInteract.value) return
  answers.value = { ...answers.value, [q.id]: oid }
}

function toggleMulti(q: IntentQuestion, oid: string) {
  if (!canInteract.value) return
  const cur = Array.isArray(answers.value[q.id]) ? [...(answers.value[q.id] as string[])] : []
  const i = cur.indexOf(oid)
  if (i >= 0) cur.splice(i, 1)
  else cur.push(oid)
  answers.value = { ...answers.value, [q.id]: cur }
}

function selectAllMulti(q: IntentQuestion) {
  if (!canInteract.value) return
  const all = q.options.map((o) => o.id)
  answers.value = { ...answers.value, [q.id]: all }
}

function clearMulti(q: IntentQuestion) {
  if (!canInteract.value) return
  answers.value = { ...answers.value, [q.id]: [] }
}

function isRecommendedSingle(q: IntentQuestion, oid: string) {
  return q.recommendedId === oid
}

function addCustomOption(q: IntentQuestion) {
  const raw = (draftLabel.value[q.id] ?? '').trim()
  if (!raw || !canInteract.value) return
  emit('addOption', { questionId: q.id, label: raw, type: q.type === 'multi' ? 'multi' : 'single' })
  draftLabel.value = { ...draftLabel.value, [q.id]: '' }
  showDraftInput.value = { ...showDraftInput.value, [q.id]: false }
}

const numberedTitle = (index: number, title: string) => `${index + 1}. ${title}`
</script>

<template>
  <div
    class="bg-white border border-gray-100/90 rounded-[18px] shadow-[0_8px_40px_rgba(15,23,42,0.06)] overflow-hidden w-[720px] max-w-full"
  >
    <!-- 顶部渐变条 + 标题区（对齐参考图） -->
    <div class="relative">
      <div
        class="h-[4px] w-full bg-gradient-to-r from-violet-400 via-[#5b8cff] to-sky-400"
        aria-hidden="true"
      />
      <div class="px-7 pt-6 pb-2 bg-gradient-to-b from-[#f8f9ff] to-white">
        <h3 class="text-[18px] font-semibold text-gray-900 tracking-tight">
          {{ form.formTitle?.trim() || '请确认创作意图' }}
        </h3>
        <p class="text-[13.5px] text-gray-500 mt-1.5 leading-relaxed">
          {{ displaySubtitle }}
        </p>
      </div>
    </div>

    <div
      class="px-7 pb-2 pt-3 flex flex-col gap-10"
      :class="!canInteract ? 'opacity-75 pointer-events-none' : ''"
    >
      <div v-for="(q, qi) in form.questions" :key="q.id" class="flex flex-col gap-3">
        <div>
          <div class="text-[15px] font-semibold text-gray-900 leading-snug">
            {{ numberedTitle(qi, q.title) }}
          </div>
          <p v-if="q.description?.trim()" class="text-[13px] text-gray-600 leading-[1.65] mt-2">
            {{ q.description }}
          </p>
        </div>

        <!-- 单选：横向胶囊 + 蓝框选中（参考图 Q1 / Q3） -->
        <div v-if="q.type === 'single'" class="flex flex-wrap gap-2.5 mt-1">
          <button
            v-for="opt in q.options"
            :key="opt.id"
            type="button"
            :disabled="!canInteract"
            class="inline-flex items-center gap-2.5 rounded-full border-2 px-4 py-2.5 text-[14px] transition-all text-left max-w-full"
            :class="
              isSingleSelected(q, opt.id)
                ? 'border-[#2d68f8] bg-[#f5f8ff] text-gray-900 shadow-[0_1px_2px_rgba(45,104,248,0.12)]'
                : 'border-gray-200 bg-white text-gray-800 hover:border-gray-300'
            "
            @click="selectSingle(q, opt.id)"
          >
            <span
              class="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
              :class="
                isSingleSelected(q, opt.id)
                  ? 'border-[#2d68f8] bg-white'
                  : 'border-gray-300 bg-white'
              "
            >
              <span
                v-if="isSingleSelected(q, opt.id)"
                class="h-2 w-2 rounded-full bg-[#2d68f8]"
              />
            </span>
            <span class="truncate leading-snug">{{ opt.label }}</span>
            <span
              v-if="isRecommendedSingle(q, opt.id) && !isSingleSelected(q, opt.id)"
              class="text-[10px] px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500 shrink-0"
              >推荐</span
            >
          </button>
          <template v-if="q.allowAddOption">
            <button
              v-if="!showDraftInput[q.id]"
              type="button"
              :disabled="!canInteract"
              class="rounded-full px-3.5 py-2.5 text-[13px] border-2 border-dashed border-gray-300 text-gray-500 hover:border-[#2d68f8]/50 hover:text-gray-700 transition-colors"
              @click="openDraftInput(q.id)"
            >
              + 添加选项
            </button>
            <div v-else class="flex flex-wrap items-center gap-2 w-full">
              <input
                v-model="draftLabel[q.id]"
                type="text"
                placeholder="输入自定义选项"
                class="min-w-[160px] flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-[#2d68f8] focus:ring-1 focus:ring-[#2d68f8]/20"
                @keydown.enter.prevent="addCustomOption(q)"
              />
              <button
                type="button"
                class="text-[13px] text-[#2d68f8] font-medium px-2"
                @click="addCustomOption(q)"
              >
                添加
              </button>
            </div>
          </template>
        </div>

        <!-- 多选：网格卡片 + 勾选（参考图 Q2） -->
        <div v-else-if="q.type === 'multi'" class="flex flex-col gap-3 mt-1">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              v-for="opt in q.options"
              :key="opt.id"
              type="button"
              :disabled="!canInteract"
              class="flex items-start gap-3 w-full text-left rounded-xl border-2 px-4 py-3 transition-all"
              :class="
                isMultiSelected(q, opt.id)
                  ? 'border-[#2d68f8] bg-[#f5f8ff] shadow-[0_1px_2px_rgba(45,104,248,0.1)]'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              "
              @click="toggleMulti(q, opt.id)"
            >
              <span
                class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors"
                :class="
                  isMultiSelected(q, opt.id)
                    ? 'border-[#2d68f8] bg-[#2d68f8]'
                    : 'border-gray-300 bg-white'
                "
              >
                <svg
                  v-if="isMultiSelected(q, opt.id)"
                  class="w-3 h-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2.5"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </span>
              <span class="text-[14px] text-gray-900 leading-snug">{{ opt.label }}</span>
            </button>
          </div>
          <div class="flex flex-wrap items-center gap-4">
            <button
              v-if="q.showSelectAll"
              type="button"
              :disabled="!canInteract"
              class="text-[13px] text-[#2d68f8] font-medium hover:underline"
              @click="selectAllMulti(q)"
            >
              全选
            </button>
            <button
              type="button"
              :disabled="!canInteract"
              class="text-[13px] text-gray-500 hover:text-gray-800"
              @click="clearMulti(q)"
            >
              清空
            </button>
            <template v-if="q.allowAddOption">
              <button
                v-if="!showDraftInput[q.id]"
                type="button"
                :disabled="!canInteract"
                class="text-[13px] text-gray-600 hover:text-gray-900"
                @click="openDraftInput(q.id)"
              >
                + 添加选项
              </button>
              <div v-else class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <input
                  v-model="draftLabel[q.id]"
                  type="text"
                  placeholder="输入自定义选项"
                  class="min-w-[160px] flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] outline-none focus:border-[#2d68f8]"
                  @keydown.enter.prevent="addCustomOption(q)"
                />
                <button type="button" class="text-[13px] text-[#2d68f8] font-medium" @click="addCustomOption(q)">
                  添加
                </button>
              </div>
            </template>
          </div>
        </div>

        <!-- 文本题（参考图 Q4：大输入框 + 推荐默认值由 defaultText 注入） -->
        <div v-else class="mt-1">
          <textarea
            v-model="answers[q.id] as string"
            rows="4"
            :disabled="!canInteract"
            placeholder="请输入，例如：认知纠偏 → 心理基础 → 方法学习 → 场景应用"
            class="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 text-[14px] outline-none hover:border-gray-300 focus:border-[#2d68f8] focus:ring-2 focus:ring-[#2d68f8]/15 transition-all text-gray-900 placeholder-gray-400 resize-y min-h-[100px] bg-[#fafbfc]/80"
          />
        </div>
      </div>

      <!-- 我要补充 -->
      <div class="flex flex-col gap-2.5 pt-2 border-t border-gray-100">
        <div class="text-[15px] font-semibold text-gray-900">我要补充</div>
        <textarea
          v-model="additionalNotes"
          rows="2"
          :disabled="!canInteract"
          placeholder="请输入补充内容"
          class="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 text-[14px] outline-none hover:border-gray-300 focus:border-[#2d68f8] focus:ring-2 focus:ring-[#2d68f8]/15 transition-all placeholder-gray-400 text-gray-900 resize-y min-h-[76px] bg-white"
        />
      </div>
    </div>

    <!-- 页脚：左说明 + 右主按钮（对齐参考图） -->
    <div
      class="px-7 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#fafbfc] border-t border-gray-100"
    >
      <div class="min-w-0 space-y-1.5">
        <p class="text-[13px] text-gray-600 leading-relaxed">
          你已进入编辑模式，完成修改后需要确认，任务才会继续执行。
        </p>
        <p v-if="!intentSubmitted" class="text-[12px] text-gray-400">
          如未操作，<span class="font-medium text-gray-500">{{ countdown }} s</span> 后将自动确认。
        </p>
      </div>
      <div class="flex items-center justify-end gap-3 shrink-0 w-full sm:w-auto">
        <button
          v-if="!intentSubmitted"
          type="button"
          :disabled="pipelineRunning"
          class="px-4 py-2.5 rounded-full text-[13px] text-gray-500 hover:text-gray-800 hover:bg-gray-100/80 transition-colors disabled:opacity-50"
          @click="emit('skip')"
        >
          跳过
        </button>
        <button
          type="button"
          :disabled="pipelineRunning || intentSubmitted"
          class="min-w-[200px] px-8 py-3 rounded-full text-[15px] font-medium transition-all shadow-md"
          :class="
            intentSubmitted || pipelineRunning
              ? 'bg-gray-300 text-white cursor-default shadow-none'
              : 'bg-gray-900 text-white hover:bg-black hover:shadow-lg'
          "
          @click="emit('confirm')"
        >
          {{ pipelineRunning ? '编排中…' : intentSubmitted ? '已确认' : '确认意图并执行' }}
        </button>
      </div>
    </div>
  </div>
</template>
