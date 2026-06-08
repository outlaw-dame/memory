<script setup lang="ts">
/**
 * FeedRepostBanner - Repost summary rendering
 *
 * Responsibilities:
 * - One-person repost summary
 * - Two-person repost summary
 * - Many-person repost summary
 * - Truncation behavior
 * - Green repost visual language
 * - Accessible text
 */

import { computed } from 'vue'
import { useI18n } from '@/i18n'
import type { RepostGroup } from '@/stores/atBridgeStore'

export interface FeedRepostBannerProps {
  // Repost data
  repostGroup: RepostGroup | null
  repostCount?: number
  viewerHasReposted?: boolean
  
  // Display options
  compact?: boolean
}

const props = defineProps<FeedRepostBannerProps>()
const { t } = useI18n()

// Computed repost summary
const repostSummary = computed(() => {
  const group = props.repostGroup
  const count = props.repostCount ?? group?.count ?? 0
  
  if (!group || count <= 0 || group.actors.length === 0) return null

  const names = group.actors.map(actor => actor.displayName)
  
  if (count === 1) {
    return t('feed.reposts.byOne', { name: names[0] })
  }

  if (count === 2 && names.length >= 2) {
    return t('feed.reposts.byTwo', { first: names[0], second: names[1] })
  }

  const visibleNames = names.slice(0, 2).join(', ')
  const remainingCount = Math.max(1, count - Math.min(2, names.length))
  return t('feed.reposts.byMany', { names: visibleNames, count: remainingCount })
})

const showBanner = computed(() => {
  return repostSummary.value !== null
})

// Accessible text
const ariaLabel = computed(() => {
  if (!repostSummary.value) return undefined
  return t('feed.reposts.ariaLabel', { summary: repostSummary.value })
})
</script>

<template>
  <div
    v-if="showBanner"
    class="feed-repost-banner"
    role="status"
    :aria-label="ariaLabel"
  >
    <div
      class="feed-repost-indicator"
      aria-hidden="true"
    >
      <svg
        class="feed-repost-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.4"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3" />
      </svg>
    </div>
    <span class="feed-repost-text">
      {{ repostSummary }}
    </span>
  </div>
</template>

<style scoped>
.feed-repost-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  font-family: var(--font-family);
  font-size: var(--text-size-footnote);
  font-weight: 600;
  color: var(--color-emerald-700, #15803d);
  
  padding: 0.5rem 0;
  min-height: 1.5rem;
}

.feed-repost-indicator {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  
  width: 1.5rem;
  height: 1.5rem;
  
  background: rgba(34, 197, 94, 0.12);
  border-radius: 50%;
}

.feed-repost-icon {
  width: 0.875rem;
  height: 0.875rem;
  color: var(--color-emerald-700, #15803d);
}

.feed-repost-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Screen reader only text for accessibility */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
