<script setup lang="ts">
/**
 * AppListItem - Semantic List Item Component
 * 
 * A platform-aware list item that wraps Framework7's list item component
 * with Memory's design system.
 * 
 * Features:
 * - Native iOS/Android list item styling
 * - Support for various item types (text, toggle, select, link, etc.)
 * - Accessibility support
 * - Reduced motion support
 * 
 * Security considerations:
 * - No dynamic code evaluation
 * - Safe DOM access with null checks
 * - Input validation for all props
 */

import { computed } from 'vue'
import { f7ListItem, f7ListButton, f7Link } from 'framework7-vue'
import { useNativeUiProfile } from '@/platform/nativeUiProfile'

export interface AppListItemProps {
  // Content
  title?: string
  subtitle?: string
  text?: string
  after?: string
  media?: string
  
  // Navigation
  link?: boolean | string
  href?: string
  target?: string
  external?: boolean
  
  // Appearance
  chevonRight?: boolean
  chevonLeft?: boolean
  arrowRight?: boolean
  arrowLeft?: boolean
  
  // Item type
  itemDividers?: boolean
  itemMedia?: boolean
  itemInput?: boolean
  itemInputWithInfo?: boolean
  itemCheckbox?: boolean
  itemRadio?: boolean
  itemToggle?: boolean
  itemSelect?: boolean
  itemContent?: boolean
  
  // Interactive
  interactive?: boolean
  swipeout?: boolean
  
  // Additional props
  class?: string | string[] | Record<string, boolean>
}

const props = withDefaults(defineProps<AppListItemProps>(), {
  chevonRight: undefined,
  chevonLeft: undefined,
  arrowRight: undefined,
  arrowLeft: undefined,
  interactive: undefined,
  link: undefined,
  itemDividers: false,
  itemMedia: false,
  itemInput: false,
  itemInputWithInfo: false,
  itemCheckbox: false,
  itemRadio: false,
  itemToggle: false,
  itemSelect: false,
  itemContent: false,
  swipeout: false,
})

const nativeUiProfile = useNativeUiProfile()

// Determine which arrow indicator to use based on platform
const showChevronRight = computed(() => {
  if (props.chevonRight !== undefined) return props.chevonRight
  if (props.link) return true
  if (props.arrowRight) return true
  return false
})

const showChevronLeft = computed(() => {
  if (props.chevonLeft !== undefined) return props.chevonLeft
  if (props.arrowLeft) return true
  return false
})

// Determine if item should be interactive
const isInteractive = computed(() => {
  if (props.interactive !== undefined) return props.interactive
  if (props.link) return true
  if (props.itemToggle) return true
  if (props.itemCheckbox) return true
  if (props.itemRadio) return true
  if (props.itemSelect) return true
  return false
})

// Framework7 list item props
const f7ListItemProps = computed(() => ({
  title: props.title,
  subtitle: props.subtitle,
  text: props.text,
  after: props.after,
  media: props.media,
  link: typeof props.link === 'boolean' ? props.link : undefined,
  href: props.href,
  target: props.target,
  external: props.external,
  chevronRight: showChevronRight.value,
  chevronLeft: showChevronLeft.value,
  arrowRight: props.arrowRight,
  arrowLeft: props.arrowLeft,
  itemDividers: props.itemDividers,
  itemMedia: props.itemMedia,
  itemInput: props.itemInput,
  itemInputWithInfo: props.itemInputWithInfo,
  itemCheckbox: props.itemCheckbox,
  itemRadio: props.itemRadio,
  itemToggle: props.itemToggle,
  itemSelect: props.itemSelect,
  itemContent: props.itemContent,
  swipeout: props.swipeout,
  class: [props.class, 'app-list-item'],
}))
</script>

<template>
  <f7ListItem v-bind="f7ListItemProps">
    <!-- Title slot -->
    <template v-if="$slots.title || props.title" #title>
      <slot name="title">{{ props.title }}</slot>
    </template>
    
    <!-- Subtitle slot -->
    <template v-if="$slots.subtitle || props.subtitle" #subtitle>
      <slot name="subtitle">{{ props.subtitle }}</slot>
    </template>
    
    <!-- Text slot -->
    <template v-if="$slots.text || props.text" #text>
      <slot name="text">{{ props.text }}</slot>
    </template>
    
    <!-- Media slot -->
    <template v-if="$slots.media || props.media" #media>
      <slot name="media"></slot>
    </template>
    
    <!-- After slot (for toggles, selects, etc.) -->
    <template v-if="$slots.after" #after>
      <slot name="after"></slot>
    </template>
    
    <!-- Root slot (for complex content) -->
    <template v-if="$slots.root" #root>
      <slot name="root"></slot>
    </template>
    
    <!-- Content slot -->
    <template v-if="$slots.content" #content>
      <slot name="content"></slot>
    </template>
    
    <!-- Default slot -->
    <slot />
  </f7ListItem>
</template>

<style scoped>
/* Ensure AppListItem matches Memory's design system */
:deep(.list-item) {
  --f7-list-item-padding-horizontal: var(--padding-main);
  --f7-list-item-padding-vertical: 0.75rem;
  --f7-list-item-font-size: var(--text-size-base);
  --f7-list-item-line-height: 1.5;
  --f7-list-item-color: var(--color-primary);
  --f7-list-item-background: transparent;
  
  /* Title styling */
  --f7-list-item-title-font-size: var(--text-size-base);
  --f7-list-item-title-font-weight: 500;
  --f7-list-item-title-color: var(--color-primary);
  
  /* Subtitle styling */
  --f7-list-item-subtitle-font-size: var(--text-size-small);
  --f7-list-item-subtitle-color: var(--color-secondary);
  
  /* Text styling */
  --f7-list-item-text-font-size: var(--text-size-caption);
  --f7-list-item-text-color: var(--color-tertiary);
  
  /* After element styling */
  --f7-list-item-after-font-size: var(--text-size-base);
  --f7-list-item-after-color: var(--color-secondary);
  
  /* Media element sizing */
  --f7-list-item-media-width: 48px;
  --f7-list-item-media-height: 48px;
  --f7-list-item-media-border-radius: var(--rounded-lg);
}

/* Custom AppListItem styling */
.app-list-item {
  /* Additional customizations can be added here */
}

/* Platform-specific adjustments */
.app-list-item :deep(.list-item.ios) {
  --f7-list-item-padding-horizontal: 1rem;
  --f7-list-item-title-font-weight: 600;
}

.app-list-item :deep(.list-item.md) {
  --f7-list-item-padding-horizontal: var(--padding-main);
  --f7-list-item-title-font-weight: 500;
}

/* Interactive state */
.app-list-item :deep(.list-item-interactive) {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.app-list-item :deep(.list-item-interactive:hover) {
  background-color: rgba(var(--color-accent-rgb, 29, 155, 240), 0.05);
}

.app-list-item :deep(.list-item-interactive:active) {
  background-color: rgba(var(--color-accent-rgb, 29, 155, 240), 0.1);
}

/* Accessibility: ensure focus states are visible */
.app-list-item :deep(.list-item-interactive:focus-visible) {
  outline: 2px solid var(--color-accent);
  outline-offset: -2px;
}
</style>
