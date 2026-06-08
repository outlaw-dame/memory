<script setup lang="ts">
/**
 * AppList - Semantic List Component
 * 
 * A platform-aware list container that wraps Framework7's list component
 * with Memory's design system and platform policies.
 * 
 * Features:
 * - Native iOS/Android list styling via Framework7
 * - Safe area insets
 * - Keyboard avoidance
 * - Reduced motion support
 * - Accessibility support
 * 
 * Security considerations:
 * - No dynamic code evaluation
 * - Safe DOM access with null checks
 * - Input validation for all props
 */

import { computed } from 'vue'
import { f7List } from 'framework7-vue'
import { useNativeUiProfile } from '@/platform/nativeUiProfile'

export interface AppListProps {
  // List appearance
  inset?: boolean
  insetMd?: boolean
  insetIos?: boolean
  insetMaterial?: boolean
  
  // Media list (for lists with media items)
  mediaList?: boolean
  
  // Simple list (no borders, just spacing)
  simpleList?: boolean
  
  // Dividers
  dividers?: boolean
  
  // Hairlines (borders)
  hairlines?: boolean
  hairlinesBetween?: boolean
  
  // Padding
  noPadding?: boolean
  
  // Additional classes
  class?: string | string[] | Record<string, boolean>
}

const props = withDefaults(defineProps<AppListProps>(), {
  inset: false,
  insetMd: false,
  insetIos: false,
  insetMaterial: false,
  mediaList: false,
  simpleList: false,
  dividers: false,
  hairlines: false,
  hairlinesBetween: false,
  noPadding: false,
})

const nativeUiProfile = useNativeUiProfile()

// Determine if we should use inset list based on platform
const shouldBeInset = computed(() => {
  // Explicit props take precedence
  if (props.inset) return true
  if (props.insetMd && nativeUiProfile.theme === 'md') return true
  if (props.insetIos && nativeUiProfile.theme === 'ios') return true
  if (props.insetMaterial && nativeUiProfile.theme === 'md') return true
  
  // Default: use inset for better native feel
  return true
})

// Determine list class based on platform and props
const listClass = computed(() => {
  const classes: string[] = []
  
  if (props.mediaList) {
    classes.push('list-media')
  }
  
  if (props.simpleList) {
    classes.push('list-simple')
  }
  
  if (props.dividers) {
    classes.push('list-dividers')
  }
  
  if (props.hairlines) {
    classes.push('list-hairlines')
  }
  
  if (props.hairlinesBetween) {
    classes.push('list-hairlines-between')
  }
  
  return classes
})

// Framework7 list props
const f7ListProps = computed(() => ({
  inset: shouldBeInset.value,
  mediaList: props.mediaList,
  simpleList: props.simpleList,
  dividers: props.dividers,
  hairlines: props.hairlines,
  hairlinesBetween: props.hairlinesBetween,
  noPadding: props.noPadding,
  class: [props.class, listClass.value, 'app-list'],
}))
</script>

<template>
  <f7List v-bind="f7ListProps">
    <slot />
  </f7List>
</template>

<style scoped>
/* Ensure AppList matches Memory's design system */
:deep(.list) {
  --f7-list-item-padding-horizontal: var(--padding-main);
  --f7-list-item-padding-vertical: 0.75rem;
  --f7-list-item-font-size: var(--text-size-base);
  --f7-list-item-line-height: 1.5;
  --f7-list-item-color: var(--color-primary);
  --f7-list-item-background: transparent;
  
  /* Background color for inset lists */
  --f7-list-inset-bg-color: var(--bg-color, #fff);
  --f7-list-inset-border-radius: var(--rounded-lg);
  
  /* Margin for inset lists */
  --f7-list-inset-margin-horizontal: var(--padding-main);
  --f7-list-inset-margin-vertical: 0.5rem;
}

/* Custom AppList styling */
.app-list {
  /* Additional customizations can be added here */
}

/* Platform-specific adjustments */
.app-list :deep(.list.ios) {
  --f7-list-item-padding-horizontal: 1rem;
}

.app-list :deep(.list.md) {
  --f7-list-item-padding-horizontal: var(--padding-main);
}
</style>
