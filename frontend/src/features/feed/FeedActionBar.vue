<script setup lang="ts">
/**
 * FeedActionBar - Post action buttons (reply/like/repost/more)
 *
 * Responsibilities:
 * - Reply opens inline reply composer
 * - Like remains placeholder if backend is not wired
 * - Repost emits/toggles existing repost action
 * - Repost loading guard
 * - More opens action sheet
 * - Counts/labels
 * - Accessible labels
 */

import { computed } from 'vue'
import { useI18n } from '@/i18n'
import type { UnifiedFeedItem } from '@/stores/atBridgeStore'

export interface FeedActionBarProps {
  // Item data
  item: UnifiedFeedItem
  
  // Interaction state
  isReplying?: boolean
  isRepostProcessing?: boolean
  viewerHasReposted?: boolean
  repostCount?: number
  repostLabel?: string
  
  // Like state (placeholder for now)
  likeCount?: number
  viewerHasLiked?: boolean
  
  // Events
  onReply?: () => void
  onLike?: () => void
  onRepost?: () => void
  onMore?: () => void
}

const props = withDefaults(defineProps<FeedActionBarProps>(), {
  isReplying: false,
  isRepostProcessing: false,
  viewerHasReposted: false,
  repostCount: 0,
  repostLabel: 'Repost',
  likeCount: 0,
  viewerHasLiked: false,
})

const { t } = useI18n()

// Computed properties
const replyButtonLabel = computed(() => {
  return props.isReplying ? t('feed.actions.replying') : t('feed.actions.reply')
})

const likeButtonLabel = computed(() => {
  return props.viewerHasLiked ? t('feed.actions.liked') : t('feed.actions.like')
})

const repostButtonLabel = computed(() => {
  return props.repostLabel
})

// Button accessibility labels
const replyAriaLabel = computed(() => {
  return props.isReplying 
    ? t('feed.actions.replyingAria') 
    : t('feed.actions.replyAria')
})

const likeAriaLabel = computed(() => {
  return props.viewerHasLiked 
    ? t('feed.actions.unlikeAria') 
    : t('feed.actions.likeAria')
})

const repostAriaLabel = computed(() => {
  return props.viewerHasReposted 
    ? t('feed.actions.unrepostAria') 
    : t('feed.actions.repostAria')
})

const moreAriaLabel = computed(() => {
  return t('feed.actions.more')
})
</script>

<template>
  <div class="feed-action-bar">
    <!-- Reply button -->
    <button
      class="feed-action-button reply"
      :aria-label="replyAriaLabel"
      :disabled="props.isReplying"
      @click="props.onReply"
    >
      <svg
        class="feed-action-icon"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
      </svg>
      <span class="feed-action-text">{{ replyButtonLabel }}</span>
    </button>

    <!-- Like button -->
    <button
      class="feed-action-button like"
      :aria-label="likeAriaLabel"
      @click="props.onLike"
    >
      <svg
        class="feed-action-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      <span class="feed-action-text">{{ likeButtonLabel }}</span>
      <span v-if="props.likeCount > 0" class="feed-action-count">{{ props.likeCount }}</span>
    </button>

    <!-- Repost button -->
    <button
      class="feed-action-button repost"
      :class="{
        'active': props.viewerHasReposted,
        'processing': props.isRepostProcessing,
      }"
      :aria-label="repostAriaLabel"
      :disabled="props.isRepostProcessing"
      @click="props.onRepost"
    >
      <svg
        class="feed-action-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3" />
      </svg>
      <span class="feed-action-text">{{ repostButtonLabel }}</span>
      <span v-if="props.repostCount > 0" class="feed-action-count">{{ props.repostCount }}</span>
    </button>

    <!-- More button (horizontal dots) -->
    <button
      class="feed-action-button more"
      :aria-label="moreAriaLabel"
      @click="props.onMore"
    >
      <svg
        class="feed-action-icon"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <circle cx="5" cy="12" r="2" />
        <circle cx="12" cy="12" r="2" />
        <circle cx="19" cy="12" r="2" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.feed-action-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  padding-top: 0.25rem;
}

.feed-action-button {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  
  padding: 0.375rem 0.75rem;
  
  font-family: var(--font-family);
  font-size: var(--text-size-footnote);
  font-weight: 600;
  
  background: transparent;
  border: none;
  border-radius: 9999px;
  
  cursor: pointer;
  
  transition: opacity 0.2s ease, background-color 0.2s ease;
  
  white-space: nowrap;
  
  color: var(--color-dark-70, #4b5563);
}

.feed-action-button:hover:not(:disabled) {
  opacity: 0.8;
}

.feed-action-button:active:not(:disabled) {
  opacity: 0.6;
}

.feed-action-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.feed-action-button.reply {
  background: color-mix(in srgb, var(--color-accent) 12%, transparent);
  color: var(--color-accent, #1d9bf0);
}

.feed-action-button.like:hover:not(:disabled) {
  background: rgba(55, 55, 55, 0.07);
  color: rgba(55, 55, 55, 0.7);
}

.feed-action-button.repost {
  background: rgba(34, 197, 94, 0.12);
  color: var(--color-emerald-600, #16a34a);
}

.feed-action-button.repost.active {
  background: var(--color-emerald-600, #16a34a);
  color: white;
}

.feed-action-button.repost.processing {
  cursor: wait;
}

.feed-action-button.more {
  margin-left: auto;
  padding: 0.5rem;
}

.feed-action-button.more:hover:not(:disabled) {
  background: var(--color-dark-10, #f3f4f6);
}

.feed-action-icon {
  width: 0.875rem;
  height: 0.875rem;
  
  flex-shrink: 0;
}

.feed-action-text {
  line-height: 1;
}

.feed-action-count {
  font-variant-numeric: tabular-nums;
  color: inherit;
  opacity: 0.8;
}
</style>
