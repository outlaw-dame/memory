<script setup lang="ts">
/**
 * FeedArticlePreview - Article-specific rendering
 *
 * Responsibilities:
 * - Article badge
 * - Article title
 * - Article summary
 * - Article content
 * - Open external article link
 * - Safe rel="noopener noreferrer"
 * - Valid HTTP/HTTPS-only URL behavior
 */

import { computed } from 'vue'
import { useI18n } from '@/i18n'
import type { UnifiedFeedItem } from '@/stores/atBridgeStore'

export interface FeedArticlePreviewProps {
  // Article data
  item: UnifiedFeedItem
  
  // Display options
  showContent?: boolean
  maxLines?: number
  
  // Events
  onClick?: () => void
}

const props = defineProps<FeedArticlePreviewProps>()
const { t } = useI18n()

// Helper function to strip markup
function stripMarkup(value: string | null | undefined): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) return null
  const stripped = value
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return stripped.length > 0 ? stripped : null
}

// Computed properties
const isArticle = computed(() => props.item.postType === 'article')
const articleTitle = computed(() => stripMarkup(props.item.title))
const articleSummary = computed(() => stripMarkup(props.item.summary))
const articleUrl = computed(() => {
  const candidate = props.item.canonicalUrl ?? props.item.objectUri ?? null
  if (!candidate) return null
  
  try {
    const parsed = new URL(candidate)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null
  } catch {
    return null
  }
})

const clampLines = computed(() => {
  if (!props.maxLines || props.maxLines <= 0) return undefined
  return `line-clamp-${props.maxLines}`
})

function handleArticleLinkClick(event: MouseEvent) {
  if (props.onClick) {
    event.preventDefault()
    props.onClick()
  }
  // Otherwise, let the link navigate naturally
}
</script>

<template>
  <div
    v-if="isArticle"
    class="feed-article-preview"
    @click="$event => { if (props.onClick) $event.stopPropagation() }"
  >
    <!-- Article badge -->
    <div class="feed-article-badge-wrapper">
      <span
        class="feed-article-badge"
        aria-label="Article"
      >
        {{ t('feed.article.badge') }}
      </span>
    </div>

    <!-- Title -->
    <h2
      v-if="articleTitle"
      class="feed-article-title"
      :class="clampLines"
    >
      {{ articleTitle }}
    </h2>

    <!-- Summary -->
    <p
      v-if="articleSummary"
      class="feed-article-summary"
      :class="clampLines"
    >
      {{ articleSummary }}
    </p>

    <!-- Content -->
    <div
      v-if="showContent && props.item.content"
      class="feed-article-content"
      :class="clampLines"
    >
      {{ props.item.content }}
    </div>

    <!-- External link -->
    <div v-if="articleUrl" class="feed-article-link-wrapper" @click.stop>
      <a
        :href="articleUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="feed-article-link"
        @click="handleArticleLinkClick"
      >
        {{ t('feed.article.open') }}
        <svg
          class="feed-article-link-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M7 17L17 7M8 7h9v9" />
        </svg>
      </a>
    </div>
  </div>
</template>

<style scoped>
.feed-article-preview {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  
  margin-top: 0.75rem;
  padding: 0.75rem 0;
}

.feed-article-badge-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.feed-article-badge {
  display: inline-flex;
  align-items: center;
  
  padding: 0.25rem 0.625rem;
  
  font-family: var(--font-family);
  font-size: var(--text-size-caption);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-accent, #1d9bf0);
  
  background: color-mix(in srgb, var(--color-accent) 12%, transparent);
  border-radius: 9999px;
}

.feed-article-title {
  font-family: var(--font-family);
  font-size: var(--text-size-large);
  font-weight: 700;
  color: var(--color-dark, #000);
  
  margin: 0;
  line-height: 1.25;
}

.feed-article-summary {
  font-family: var(--font-family);
  font-size: var(--text-size-small);
  color: var(--color-dark-50, #666);
  
  margin: 0;
  line-height: 1.5;
}

.feed-article-content {
  font-family: var(--font-family);
  font-size: var(--text-size-base);
  color: var(--color-dark, #000);
  
  line-height: 1.5;
}

.feed-article-link-wrapper {
  display: flex;
  justify-content: flex-start;
  
  margin-top: 0.5rem;
}

.feed-article-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  
  padding: 0.375rem 0.75rem;
  
  font-family: var(--font-family);
  font-size: var(--text-size-footnote);
  font-weight: 600;
  color: var(--color-accent, #1d9bf0);
  
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
  border-radius: 9999px;
  
  text-decoration: none;
  
  transition: opacity 0.2s ease, background-color 0.2s ease;
  
  cursor: pointer;
}

.feed-article-link:hover {
  opacity: 0.8;
}

.feed-article-link:active {
  opacity: 0.6;
}

.feed-article-link-icon {
  width: 0.875rem;
  height: 0.875rem;
}

/* Line clamp utilities */
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-4 {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-5 {
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-6 {
  display: -webkit-box;
  -webkit-line-clamp: 6;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
