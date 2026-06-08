<script setup lang="ts">
/**
 * FeedPopularCarousel - Popular posts carousel
 *
 * Responsibilities:
 * - Engagement scoring
 * - Minimum item count threshold
 * - Max item count
 * - Click to thread
 * - AP/AT source badge
 * - Score label
 */

import { computed } from 'vue'
import { useI18n } from '@/i18n'
import { useRouter } from 'vue-router'
import type { UnifiedFeedItem } from '@/stores/atBridgeStore'
import { resolvePostSourceMetadata } from './postSourceMetadata'

// Engagement scoring weights — adjust after observing real usage data.
const ENGAGEMENT_WEIGHTS = Object.freeze({
  reply: 3,
  repost: 2,
  quote: 2.5,
  like: 1,
} as const)

interface PopularFeedItem {
  id: string
  uri: string
  source: UnifiedFeedItem['source']
  authorName: string
  content: string
  createdAt: string | null
  replies: number
  reposts: number
  quotes: number
  likes: number
  score: number
}

export interface FeedPopularCarouselProps {
  // Source items
  items: UnifiedFeedItem[]
  
  // Display options
  minItems?: number
  maxItems?: number
  
  // Events
  onItemClick?: (item: UnifiedFeedItem) => void
}

const props = withDefaults(defineProps<FeedPopularCarouselProps>(), {
  minItems: 3,
  maxItems: 8,
})

const { t } = useI18n()
const router = useRouter()

// Computed properties
function getQuoteCount(item: UnifiedFeedItem): number {
  const explicit = typeof (item as unknown as Record<string, unknown>).quoteCount === 'number' 
    ? (item as unknown as Record<string, unknown>).quoteCount 
    : 0
  if (explicit > 0) return explicit
  return item.quotedPost ? 1 : 0
}

function getLikeCount(item: UnifiedFeedItem): number {
  return typeof (item as unknown as Record<string, unknown>).likeCount === 'number' 
    ? (item as unknown as Record<string, unknown>).likeCount 
    : 0
}

function getReplyCount(item: UnifiedFeedItem): number {
  return typeof item.threadReplyCount === 'number' ? item.threadReplyCount : 0
}

function getRepostCount(item: UnifiedFeedItem): number {
  return typeof item.repostCount === 'number' ? item.repostCount : 0
}

function engagementScore(item: UnifiedFeedItem): number {
  const replies = getReplyCount(item)
  const reposts = getRepostCount(item)
  const quotes = getQuoteCount(item)
  const likes = getLikeCount(item)
  return (
    replies * ENGAGEMENT_WEIGHTS.reply +
    reposts * ENGAGEMENT_WEIGHTS.repost +
    quotes * ENGAGEMENT_WEIGHTS.quote +
    likes * ENGAGEMENT_WEIGHTS.like
  )
}

const popularPosts = computed<PopularFeedItem[]>(() => {
  const ranked = props.items
    .filter(item => item.type !== 'thread_summary')
    .map(item => {
      const replies = getReplyCount(item)
      const reposts = getRepostCount(item)
      const quotes = getQuoteCount(item)
      const likes = getLikeCount(item)
      const uri = item.atUri ?? item.objectUri ?? ''
      return {
        id: `${item.source}-${item.id}`,
        uri,
        source: item.source,
        authorName: item.authorName,
        content: item.content,
        createdAt: item.createdAt,
        replies,
        reposts,
        quotes,
        likes,
        score: engagementScore(item),
      }
    })
    .filter(item => item.uri.length > 0)
    .filter(item => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      const aTs = a.createdAt ? Date.parse(a.createdAt) : 0
      const bTs = b.createdAt ? Date.parse(b.createdAt) : 0
      return bTs - aTs
    })

  return ranked.slice(0, props.maxItems)
})

const showPopularCarousel = computed(() => popularPosts.value.length >= props.minItems)

function toPopularLabel(item: PopularFeedItem): string {
  const metrics = [
    `${item.replies}R`,
    `${item.reposts}RP`,
    `${item.quotes}Q`,
    `${item.likes}L`,
  ]
  return metrics.join(' · ')
}

function navigateToPost(item: PopularFeedItem) {
  if (props.onItemClick) {
    const originalItem = props.items.find(i => `${i.source}-${i.id}` === item.id)
    if (originalItem) {
      props.onItemClick(originalItem)
    }
  } else {
    // Default navigation
    void router.push({ name: 'thread', params: { id: item.uri } })
  }
}

function handleKeyDown(event: KeyboardEvent, item: PopularFeedItem) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    navigateToPost(item)
  }
}
</script>

<template>
  <section
    v-if="showPopularCarousel"
    class="feed-popular-carousel"
    aria-label="Popular posts"
  >
    <!-- Header -->
    <div class="feed-popular-header">
      <div class="feed-popular-title">
        <h3 class="feed-popular-heading">{{ t('feed.popular.heading') }}</h3>
        <p class="feed-popular-subtitle">{{ t('feed.popular.subtitle') }}</p>
      </div>
    </div>

    <!-- Carousel content -->
    <div class="feed-popular-scroll-container">
      <div class="feed-popular-items">
        <article
          v-for="item in popularPosts"
          :key="item.id"
          class="feed-popular-item"
          role="button"
          :aria-label="item.authorName"
          tabindex="0"
          @click="navigateToPost(item)"
          @keydown="handleKeyDown($event, item)"
        >
          <!-- Author and source -->
          <div class="feed-popular-item-header">
            <p class="feed-popular-author">{{ item.authorName }}</p>
            <span
              class="feed-popular-source-badge"
              :class="item.source === 'atproto' ? 'atproto' : 'activitypods'"
            >
              {{ item.source === 'atproto' ? 'AT' : 'AP' }}
            </span>
          </div>

          <!-- Content -->
          <p class="feed-popular-content">{{ item.content }}</p>

          <!-- Footer with metrics and score -->
          <div class="feed-popular-item-footer">
            <span class="feed-popular-metrics">{{ toPopularLabel(item) }}</span>
            <span class="feed-popular-score">
              Score {{ item.score.toFixed(1) }}
            </span>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.feed-popular-carousel {
  background: var(--color-white, #fff);
  border: 1px solid var(--color-dark-10, #e5e7eb);
  border-radius: var(--rounded-default, 1rem);
  
  box-shadow: var(--shadow-sm, 0 1px 2px 0 rgb(0 0 0 / 0.05));
  
  padding: 1rem;
  
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.feed-popular-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.feed-popular-title {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.feed-popular-heading {
  font-family: var(--font-family);
  font-size: var(--text-size-subHeader);
  font-weight: 700;
  color: var(--color-dark, #000);
  
  margin: 0;
}

.feed-popular-subtitle {
  font-family: var(--font-family);
  font-size: var(--text-size-footnote);
  color: var(--color-dark-50, #6b7280);
  
  margin: 0;
}

.feed-popular-scroll-container {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.feed-popular-scroll-container::-webkit-scrollbar {
  display: none;
}

.feed-popular-items {
  display: flex;
  gap: 0.75rem;
  padding-bottom: 0.25rem;
  min-width: max-content;
}

.feed-popular-item {
  flex: 0 0 16.25rem;
  
  padding: 0.75rem;
  
  background: var(--color-white, #fff);
  border: 1px solid var(--color-dark-10, #e5e7eb);
  border-radius: var(--rounded-xl, 0.75rem);
  
  cursor: pointer;
  
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.feed-popular-item:hover {
  border-color: var(--color-indigo-300, #a78bfa);
  box-shadow: 0 0 0 3px rgba(29, 155, 240, 0.1);
}

.feed-popular-item:focus {
  outline: none;
  ring: 2px solid var(--color-accent, #1d9bf0);
  ring-offset: 2px;
}

.feed-popular-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  
  margin-bottom: 0.5rem;
}

.feed-popular-author {
  font-family: var(--font-family);
  font-size: var(--text-size-footnote);
  font-weight: 600;
  color: var(--color-dark, #000);
  
  margin: 0;
  
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.feed-popular-source-badge {
  flex-shrink: 0;
  
  padding: 0.125rem 0.5rem;
  
  font-family: var(--font-family);
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  
  border-radius: 9999px;
}

.feed-popular-source-badge.atproto {
  background: var(--color-indigo-50, #eef2ff);
  color: var(--color-indigo-600, #4f46e5);
}

.feed-popular-source-badge.activitypods {
  background: var(--color-emerald-50, #d1fae5);
  color: var(--color-emerald-600, #065f46);
}

.feed-popular-content {
  font-family: var(--font-family);
  font-size: var(--text-size-small);
  color: var(--color-dark, #000);
  
  margin: 0;
  
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.feed-popular-item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-dark-10, #e5e7eb);
}

.feed-popular-metrics {
  font-family: var(--font-family);
  font-size: 0.625rem;
  font-weight: 500;
  color: var(--color-dark-50, #6b7280);
  
  letter-spacing: 0.08em;
}

.feed-popular-score {
  padding: 0.125rem 0.5rem;
  
  font-family: var(--font-family);
  font-size: 0.625rem;
  font-weight: 700;
  color: var(--color-accent, #1d9bf0);
  
  background: color-mix(in srgb, var(--color-accent) 12%, transparent);
  border-radius: 9999px;
}
</style>
