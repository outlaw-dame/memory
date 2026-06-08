<script setup lang="ts">
/**
 * FeedCard - Native card/list appearance for feed items
 *
 * Responsibilities:
 * - Native card/list appearance
 * - Spacing
 * - Tap target containment
 * - Platform-specific styling
 * - Accessible article/post container semantics
 * - Safe focus handling
 */

import { computed } from 'vue'

export interface FeedCardProps {
  // Content
  tag?: string
  
  // Styling
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  
  // Interactivity
  interactive?: boolean
  disabled?: boolean
  
  // Accessibility
  ariaLabel?: string
  ariaDescribedby?: string
}

const props = withDefaults(defineProps<FeedCardProps>(), {
  tag: 'article',
  rounded: 'xl',
  shadow: 'sm',
  padding: 'md',
  interactive: false,
  disabled: false,
})

// Classes for different variants
const roundedClasses = computed(() => {
  switch (props.rounded) {
    case 'none': return 'rounded-none'
    case 'sm': return 'rounded-sm'
    case 'md': return 'rounded-lg'
    case 'lg': return 'rounded-xl'
    case 'xl': return 'rounded-2xl'
    case 'full': return 'rounded-full'
    default: return 'rounded-xl'
  }
})

const shadowClasses = computed(() => {
  switch (props.shadow) {
    case 'none': return ''
    case 'sm': return 'shadow-sm'
    case 'md': return 'shadow-md'
    case 'lg': return 'shadow-lg'
    case 'xl': return 'shadow-xl'
    default: return 'shadow-sm'
  }
})

const paddingClasses = computed(() => {
  switch (props.padding) {
    case 'none': return 'p-0'
    case 'sm': return 'p-2'
    case 'md': return 'p-3'
    case 'lg': return 'p-4'
    case 'xl': return 'p-6'
    default: return 'p-3'
  }
})

const interactiveClasses = computed(() => {
  if (!props.interactive) return ''
  if (props.disabled) return 'cursor-not-allowed opacity-60'
  return 'cursor-pointer hover:shadow-md transition-shadow'
})
</script>

<template>
  <component
    :is="props.tag"
    class="feed-card"
    :class="[roundedClasses, shadowClasses, paddingClasses, interactiveClasses]"
    :style="{
      background: 'var(--bg-color, #fff)',
      border: '1px solid var(--border-color, #e5e7eb)',
    }"
    :aria-label="props.ariaLabel"
    :aria-describedby="props.ariaDescribedby"
    :tabindex="props.interactive && !props.disabled ? 0 : undefined"
  >
    <slot />
  </component>
</template>

<style scoped>
.feed-card {
  --bg-color: var(--color-white, #fff);
  --border-color: var(--color-dark-10, #e5e7eb);
  
  width: 100%;
  box-sizing: border-box;
  
  /* Native touch feedback */
  -webkit-tap-highlight-color: transparent;
  
  /* Prevent text selection on interactive cards */
  user-select: none;
  
  /* Smooth transitions */
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.feed-card:focus {
  outline: none;
  ring: 2px solid var(--color-accent, #1d9bf0);
  ring-offset: 2px;
}

.feed-card:active:not(:disabled) {
  transform: translateY(1px);
}
</style>
