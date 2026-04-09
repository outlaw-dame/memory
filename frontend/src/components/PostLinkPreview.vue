<script setup lang="ts">
export interface LinkPreviewData {
  url: string
  title: string
  description?: string
  image?: string
  domain?: string
}

const props = defineProps<{ preview: LinkPreviewData }>()

function getDomain(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}
const domain = props.preview.domain ?? getDomain(props.preview.url)
</script>

<template>
  <div class="rounded-2xl bg-pastel-light border border-dark-10 overflow-hidden flex items-stretch">
    <!-- Thumbnail -->
    <div v-if="preview.image" class="w-24 flex-shrink-0">
      <img :src="preview.image" alt="" class="w-full h-full object-cover" />
    </div>

    <!-- Text -->
    <div class="flex flex-col justify-center gap-0.5 px-3 py-3 min-w-0">
      <p class="text-caption font-medium truncate" style="color: #22c55e;">{{ domain }}</p>
      <p class="text-footnote font-bold text-dark leading-snug line-clamp-2">{{ preview.title }}</p>
      <p v-if="preview.description" class="text-caption text-dark-50 leading-snug line-clamp-3">{{ preview.description }}</p>
    </div>
  </div>
</template>
