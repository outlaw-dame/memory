<script setup lang="ts">
/**
 * FeedLoadingState - Loading state for feed
 *
 * Responsibilities:
 * - Loading spinner
 * - Loading message
 * - Platform-specific styling
 */

import { computed } from 'vue'
import { useI18n } from '@/i18n'
import AppIcon from '@/components/AppIcon.vue'

export interface FeedLoadingStateProps {
  // Display options
  message?: string
  size?: 'sm' | 'md' | 'lg'
  
  // Events
  onRetry?: () => void
}

const props = withDefaults(defineProps<FeedLoadingStateProps>(), {
  message: 'Loading feed...',
  size: 'md',
})

const { t } = useI18n()

// Size classes
const iconSize = computed(() => {
  switch (props.size) {
    case 'sm': return 20
    case 'lg': return 36
    default: return 28
  }
})

const messageText = computed(() => {
  return props.message || t('feed.loading')
})
</script>

<template>
  <div
    class="feed-loading-state"
    role="status"
    aria-live="polite"
  >
    <AppIcon
      name="loader"
      :size="iconSize"
      color="color-mix(in srgb, var(--color-accent) 50%, transparent)"
      class="animate-spin"
      aria-hidden="true"
    />
    <p class="feed-loading-text">
      {{ messageText }}
    </p>
  </div>
</template>

<style scoped>
.feed-loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  
  padding: 2rem 1rem;
  
  background: var(--color-white, #fff);
  border: 1px solid var(--color-dark-10, #e5e7eb);
  border-radius: var(--rounded-default, 1rem);
  
  box-shadow: var(--shadow-sm, 0 1px 2px 0 rgb(0 0 0 / 0.05));
}

.feed-loading-text {
  font-family: var(--font-family);
  font-size: var(--text-size-footnote);
  color: var(--color-dark-50, #6b7280);
  
  margin: 0;
  
  text-align: center;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 0.8s linear infinite;
}
</style>
