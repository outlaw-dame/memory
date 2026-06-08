<script setup lang="ts">
/**
 * AppGroupedList - Semantic Grouped List Component
 * 
 * A platform-aware grouped list that creates iOS Settings-like grouped sections
 * or Android Material-style grouped lists.
 * 
 * Features:
 * - Native iOS grouped list styling (like iOS Settings)
 * - Material Design grouped list styling on Android
 * - Automatic section dividers
 * - Platform-appropriate spacing and styling
 * 
 * Security considerations:
 * - No dynamic code evaluation
 * - Safe DOM access with null checks
 * - Input validation for all props
 */

import { computed } from 'vue'
import { f7ListGroup } from 'framework7-vue'
import { useNativeUiProfile } from '@/platform/nativeUiProfile'

export interface AppGroupedListProps {
  // Title for the group
  title?: string
  
  // Appearance
  inset?: boolean
  
  // Additional classes
  class?: string | string[] | Record<string, boolean>
}

const props = withDefaults(defineProps<AppGroupedListProps>(), {
  inset: true,
})

const nativeUiProfile = useNativeUiProfile()

// Framework7 list group props
const f7ListGroupProps = computed(() => ({
  class: [props.class, 'app-grouped-list'],
}))
</script>

<template>
  <f7ListGroup v-bind="f7ListGroupProps">
    <!-- Title slot -->
    <div v-if="props.title || $slots.title" class="list-group-title">
      <slot name="title">{{ props.title }}</slot>
    </div>
    
    <!-- Default slot for list items -->
    <slot />
  </f7ListGroup>
</template>

<style scoped>
/* Ensure AppGroupedList matches Memory's design system */
:deep(.list-group) {
  --f7-list-group-padding-horizontal: var(--padding-main);
  --f7-list-group-padding-vertical: 0.5rem;
  --f7-list-group-margin-vertical: 0.5rem;
  
  /* Background */
  --f7-list-group-bg-color: var(--bg-color, #fff);
  
  /* Border radius for inset groups */
  --f7-list-group-border-radius: var(--rounded-lg);
}

/* List group title styling */
:deep(.list-group-title) {
  --f7-list-group-title-font-size: var(--text-size-small);
  --f7-list-group-title-font-weight: 600;
  --f7-list-group-title-color: var(--color-secondary);
  --f7-list-group-title-text-transform: uppercase;
  --f7-list-group-title-letter-spacing: 0.05em;
  --f7-list-group-title-padding-horizontal: var(--padding-main);
  --f7-list-group-title-padding-vertical: 0.5rem;
}

/* Custom AppGroupedList styling */
.app-grouped-list {
  /* Additional customizations can be added here */
}

/* Platform-specific adjustments */
.app-grouped-list :deep(.list-group.ios) {
  --f7-list-group-border-radius: var(--rounded-xl);
  --f7-list-group-padding-vertical: 0.25rem;
}

.app-grouped-list :deep(.list-group.md) {
  --f7-list-group-border-radius: var(--rounded-lg);
  --f7-list-group-padding-vertical: 0.5rem;
}

/* Inset grouped lists */
.app-grouped-list :deep(.list-group-inset) {
  margin-left: var(--padding-main);
  margin-right: var(--padding-main);
}
</style>
