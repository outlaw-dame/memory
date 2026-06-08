<script setup lang="ts">
/**
 * FeedErrorState - Error state for feed
 *
 * Responsibilities:
 * - Error message display
 * - Retry button
 * - Platform-specific styling
 */

import { computed } from 'vue'
import { useI18n } from '@/i18n'

export interface FeedErrorStateProps {
  // Error data
  error: string
  
  // Display options
  showRetry?: boolean
  
  // Events
  onRetry?: () => void
}

const props = defineProps<FeedErrorStateProps>()
const { t } = useI18n()

const showRetryButton = computed(() => {
  return props.showRetry !== false && props.onRetry
})
</script>

<template>
  <div
    class="feed-error-state"
    role="alert"
    aria-live="assertive"
  >
    <div class="feed-error-icon-wrapper">
      <svg
        class="feed-error-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </div>
    <p class="feed-error-text">
      {{ props.error }}
    </p>
    <button
      v-if="showRetryButton"
      class="feed-error-retry-button"
      @click="props.onRetry"
    >
      {{ t('common.actions.retry') }}
    </button>
  </div>
</template>

<style scoped>
.feed-error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  
  padding: 1.5rem 1rem;
  
  background: var(--color-white, #fff);
  border: 1px solid var(--color-red-200, #fecaca);
  border-radius: var(--rounded-default, 1rem);
}

.feed-error-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  
  width: 2.5rem;
  height: 2.5rem;
  
  background: color-mix(in srgb, var(--color-red-500) 8%, transparent);
  border-radius: 50%;
}

.feed-error-icon {
  width: 1.25rem;
  height: 1.25rem;
  
  color: var(--color-red-500, #ef4444);
}

.feed-error-text {
  font-family: var(--font-family);
  font-size: var(--text-size-footnote);
  font-weight: 500;
  color: var(--color-red-500, #ef4444);
  
  margin: 0;
  
  text-align: center;
}

.feed-error-retry-button {
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

.feed-error-retry-button:hover {
  opacity: 0.85;
}

.feed-error-retry-button:active {
  opacity: 0.7;
}
</style>
