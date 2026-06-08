<script setup lang="ts">
/**
 * FeedEmptyState - Empty state for feed
 *
 * Responsibilities:
 * - Empty message display
 * - Subtitle/context message
 * - Action button (optional)
 * - Platform-specific styling
 */

import { useI18n } from '@/i18n'

export interface FeedEmptyStateProps {
  // Content
  title?: string
  subtitle?: string
  
  // Action
  actionLabel?: string
  showAction?: boolean
  
  // Display options
  icon?: string
  
  // Events
  onAction?: () => void
}

const props = withDefaults(defineProps<FeedEmptyStateProps>(), {
  title: 'Nothing here yet',
  subtitle: 'Posts from your federated network will appear as they arrive.',
  actionLabel: 'Clear filter',
  showAction: false,
  icon: 'messages',
})

const { t } = useI18n()

// Icon mapping for different empty states
const iconMap = {
  messages: 'M7 11v2.4h10M17 21l-4-4-4 4M21 13v2a4 4 0 01-4 4H3',
  search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  hashtag: 'M15.5 8.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM5.5 15.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z',
  default: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
}

const resolvedIcon = computed(() => {
  return iconMap[props.icon as keyof typeof iconMap] || iconMap.default
})

const showActionButton = computed(() => {
  return props.showAction && props.actionLabel && props.onAction
})
</script>

<template>
  <div
    class="feed-empty-state"
    role="status"
    aria-live="polite"
  >
    <!-- Icon -->
    <div class="feed-empty-icon-wrapper">
      <svg
        class="feed-empty-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path :d="resolvedIcon" />
      </svg>
    </div>

    <!-- Text content -->
    <div class="feed-empty-text-content">
      <p class="feed-empty-title">
        {{ props.title }}
      </p>
      <p v-if="props.subtitle" class="feed-empty-subtitle">
        {{ props.subtitle }}
      </p>
    </div>

    <!-- Action button -->
    <button
      v-if="showActionButton"
      class="feed-empty-action-button"
      @click="props.onAction"
    >
      {{ props.actionLabel }}
    </button>
  </div>
</template>

<style scoped>
.feed-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  
  padding: 2rem 1rem;
  
  background: var(--color-white, #fff);
  border: 1px solid var(--color-dark-10, #e5e7eb);
  border-radius: var(--rounded-default, 1rem);
  
  box-shadow: var(--shadow-sm, 0 1px 2px 0 rgb(0 0 0 / 0.05));
  
  text-align: center;
}

.feed-empty-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  
  width: 4rem;
  height: 4rem;
  
  background: color-mix(in srgb, var(--color-accent) 8%, transparent);
  border-radius: 50%;
}

.feed-empty-icon {
  width: 2rem;
  height: 2rem;
  
  color: var(--color-accent, #1d9bf0);
}

.feed-empty-text-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.feed-empty-title {
  font-family: var(--font-family);
  font-size: var(--text-size-subHeader);
  font-weight: 700;
  color: var(--color-dark, #000);
  
  margin: 0;
}

.feed-empty-subtitle {
  font-family: var(--font-family);
  font-size: var(--text-size-footnote);
  color: var(--color-dark-50, #6b7280);
  
  margin: 0;
  
  max-width: 18rem;
  line-height: 1.5;
}

.feed-empty-action-button {
  padding: 0.5rem 1rem;
  
  font-family: var(--font-family);
  font-size: var(--text-size-footnote);
  font-weight: 600;
  color: white;
  
  background: var(--color-accent, #1d9bf0);
  border: none;
  border-radius: 9999px;
  
  cursor: pointer;
  
  transition: opacity 0.2s ease, background-color 0.2s ease;
  
  white-space: nowrap;
}

.feed-empty-action-button:hover {
  opacity: 0.85;
}

.feed-empty-action-button:active {
  opacity: 0.7;
}
</style>
