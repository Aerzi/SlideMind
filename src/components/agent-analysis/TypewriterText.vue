<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

const props = defineProps<{
  text: string
  speed?: number
}>()

const emit = defineEmits(['complete', 'update'])

const displayedText = ref('')
const isTyping = ref(true)

const typeText = async () => {
  isTyping.value = true
  displayedText.value = ''
  
  const chars = Array.from(props.text)
  const typingSpeed = props.speed || 30 // ms per char

  for (let i = 0; i < chars.length; i++) {
    displayedText.value += chars[i]
    emit('update') // let parent know to scroll to bottom if needed
    // Add slight random variation to typing speed for more natural feel
    const randomDelay = typingSpeed + (Math.random() * 20 - 10)
    await new Promise(resolve => setTimeout(resolve, Math.max(10, randomDelay)))
  }
  
  isTyping.value = false
  emit('complete')
}

onMounted(() => {
  typeText()
})

watch(() => props.text, (newText) => {
  if (newText !== displayedText.value && !isTyping.value) {
    typeText()
  }
})
</script>

<template>
  <span class="inline-block">
    {{ displayedText }}<span 
      v-if="isTyping" 
      class="inline-block w-1.5 h-4 ml-[2px] align-middle bg-blue-500 animate-pulse"
    ></span>
  </span>
</template>