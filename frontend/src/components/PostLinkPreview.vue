<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/i18n'

export interface LinkPreviewAuthorAccount {
  acct: string
  uri?: string
  url?: string
  displayName?: string
  avatarUrl?: string
  attributionDomains?: string[]
}

export interface LinkPreviewAuthor {
  name: string
  url: string
  handle?: string
  account?: LinkPreviewAuthorAccount | null
  verified?: boolean
  verificationState?: 'verified' | 'claimed'
  verificationReason?: string
}

export interface LinkPreviewData {
  url: string
  title: string
  description?: string
  image?: string
  domain?: string
  authorName?: string
  authorUrl?: string
  authors?: LinkPreviewAuthor[]
}

const props = defineProps<{ preview: LinkPreviewData }>()
const { t } = useI18n()

function getDomain(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}
const domain = props.preview.domain ?? getDomain(props.preview.url)

const primaryAuthor = computed<LinkPreviewAuthor | null>(() => {
  if (Array.isArray(props.preview.authors) && props.preview.authors.length > 0) {
    return props.preview.authors[0] ?? null
  }
  if (props.preview.authorName && props.preview.authorUrl) {
    return {
      name: props.preview.authorName,
      url: props.preview.authorUrl,
      verificationState: 'claimed'
    }
  }
  return null
})

const authorBadge = computed(() => {
  if (!primaryAuthor.value) return null
  return primaryAuthor.value.verificationState === 'verified'
    ? t('feed.preview.authorVerified')
    : t('feed.preview.authorClaimed')
})
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
      <div v-if="primaryAuthor" class="mt-1 flex flex-wrap items-center gap-2 text-caption text-dark-60">
        <a :href="primaryAuthor.url" target="_blank" rel="noopener noreferrer" class="truncate underline underline-offset-2">
          {{ t('feed.preview.byline', { name: primaryAuthor.name }) }}
        </a>
        <span class="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-dark-70">
          {{ authorBadge }}
        </span>
      </div>
    </div>
  </div>
</template>
