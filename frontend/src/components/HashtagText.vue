<script setup lang="ts">
import { computed } from 'vue'
import { normalizeHashtag, splitTextWithHashtags } from '@/utils/hashtags'

const props = defineProps<{
  text: string
}>()

const emit = defineEmits<{
  hashtagClick: [hashtag: string]
}>()

const segments = computed(() => splitTextWithHashtags(props.text ?? ''))

function onHashtagClick(raw: string): void {
  const normalized = normalizeHashtag(raw)
  if (!normalized) return
  emit('hashtagClick', normalized)
}
</script>

<template>
  <p class="whitespace-pre-wrap break-words">
    <template v-for="(segment, index) in segments" :key="`${segment.type}-${index}`">
      <span v-if="segment.type === 'text'">{{ segment.value }}</span>
      <button
        v-else
        type="button"
        class="text-blue-600 hover:underline"
        @click="onHashtagClick(segment.value)"
      >
        {{ segment.value }}
      </button>
    </template>
  </p>
</template>
