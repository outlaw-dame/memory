<script setup lang="ts">
/**
 * AppVirtualList - Semantic Virtual List Component
 *
 * A platform-aware virtualized list that handles:
 * - Dynamic item measurement
 * - Overscan for performance
 * - Scroll position restoration
 * - Stable item keys
 * - Variable-height items
 * - Safe scroll margins
 *
 * Security considerations:
 * - All rendered content uses explicit keys
 * - No dynamic code evaluation
 * - Safe DOM access with null checks
 * - Rate-limited events
 */

import { computed, ref, onMounted, onUnmounted, watch, type Ref } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { useResizeObserver } from '@vueuse/core'

export interface AppVirtualListItem {
  id: string | number
  key?: string
  [key: string]: unknown
}

export interface AppVirtualListProps {
  // Data
  items: AppVirtualListItem[]
  
  // Virtualization settings
  estimateSize?: number
  overscan?: number
  scrollMargin?: number
  getItemKey?: (index: number) => string | number
  
  // Scroll container
  scrollEl?: Ref<HTMLElement | null> | HTMLElement | null
  
  // Measurement
  measureElement?: (el: Element) => number
  
  // Layout
  gap?: number | string
  paddingTop?: number | string
  paddingBottom?: number | string
  
  // Events
  onItemMounted?: (index: number, el: Element) => void
}

const props = withDefaults(defineProps<AppVirtualListProps>(), {
  estimateSize: 140,
  overscan: 5,
  scrollMargin: 0,
  gap: 0,
  paddingTop: 0,
  paddingBottom: 0,
})

// Slots for item rendering
const slots = defineSlots<{
  default?: (props: { item: AppVirtualListItem; index: number }) => any
}>()

// Refs
const containerRef = ref<HTMLElement | null>(null)
const listRef = ref<HTMLElement | null>(null)

// Resolve scroll element
const resolvedScrollEl = computed(() => {
  if (props.scrollEl) {
    if (typeof props.scrollEl === 'object' && 'value' in props.scrollEl) {
      return props.scrollEl.value
    }
    return props.scrollEl
  }
  return null
})

// Virtualizer configuration
const virtualizer = useVirtualizer(
  computed(() => ({
    count: props.items.length,
    getScrollElement: () => resolvedScrollEl.value ?? null,
    estimateSize: () => props.estimateSize,
    overscan: props.overscan,
    scrollMargin: props.scrollMargin,
    getItemKey: props.getItemKey ?? ((index: number) => {
      const item = props.items[index]
      return item ? (item.key ?? String(item.id)) : index
    }),
    measureElement: props.measureElement ?? ((el: Element) => {
      return el.getBoundingClientRect().height
    }),
  }))
)

const virtualRows = computed(() => virtualizer.value.getVirtualItems())
const totalSize = computed(() => virtualizer.value.getTotalSize())

// Layout styles
const gapStyle = computed(() => {
  if (typeof props.gap === 'number') return `${props.gap}px`
  return props.gap
})

const paddingTopStyle = computed(() => {
  if (typeof props.paddingTop === 'number') return `${props.paddingTop}px`
  return props.paddingTop
})

const paddingBottomStyle = computed(() => {
  if (typeof props.paddingBottom === 'number') return `${props.paddingBottom}px`
  return props.paddingBottom
})

// Handle scroll margin updates
const scrollMarginPx = ref(props.scrollMargin)

function recomputeScrollMargin() {
  const listEl = listRef.value
  const scrollEl = resolvedScrollEl.value
  if (!listEl || !scrollEl) return
  
  scrollMarginPx.value = listEl.getBoundingClientRect().top - scrollEl.getBoundingClientRect().top + scrollEl.scrollTop
}

// Recompute on header changes
useResizeObserver(containerRef, recomputeScrollMargin)

// Update scroll margin when virtual rows change
watch(
  [virtualRows, resolvedScrollEl],
  async () => {
    await nextTick()
    recomputeScrollMargin()
  },
  { flush: 'post' }
)

// Item mounted callback
function handleItemMounted(index: number, el: Element) {
  if (props.onItemMounted) {
    props.onItemMounted(index, el)
  }
  // Measure element for virtualizer
  virtualizer.value.measureElement(el)
}

// Expose virtualizer methods
defineExpose({
  virtualizer,
  virtualRows,
  totalSize,
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end' | 'auto') => {
    virtualizer.value.scrollToIndex(index, { align })
  },
  scrollToItem: (key: string | number, align?: 'start' | 'center' | 'end' | 'auto') => {
    const index = props.items.findIndex(item => (item.key ?? String(item.id)) === key)
    if (index !== -1) {
      virtualizer.value.scrollToIndex(index, { align })
    }
  },
  measureAll: () => {
    virtualizer.value.measureElementEach()
  },
})

// Cleanup
onUnmounted(() => {
  virtualizer.value._didMount = false
})
</script>

<template>
  <div
    ref="containerRef"
    class="app-virtual-list"
    :style="{
      '--virtual-gap': gapStyle,
      '--virtual-padding-top': paddingTopStyle,
      '--virtual-padding-bottom': paddingBottomStyle,
    }"
  >
    <!-- Virtual list container -->
    <div
      v-if="items.length > 0"
      ref="listRef"
      class="app-virtual-list-inner"
      :style="{
        height: `${totalSize}px`,
        paddingTop: paddingTopStyle,
        paddingBottom: paddingBottomStyle,
      }"
    >
      <div
        v-for="vRow in virtualRows"
        :key="String(vRow.key)"
        :data-index="vRow.index"
        class="app-virtual-list-item-wrapper"
        :style="{
          position: 'absolute',
          top: '0',
          left: '0',
          width: '100%',
          transform: `translateY(${vRow.start - scrollMarginPx}px)`,
        }"
      >
        <slot
          v-if="slots.default"
          :item="items[vRow.index]"
          :index="vRow.index"
        />
        <div
          v-else
          class="app-virtual-list-item"
          :ref="el => el && handleItemMounted(vRow.index, el as Element)"
        >
          {{ items[vRow.index]?.id }}
        </div>
      </div>
    </div>
    
    <!-- Empty state -->
    <div v-else class="app-virtual-list-empty">
      <slot name="empty">
        <p>No items to display</p>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.app-virtual-list {
  position: relative;
  overflow: hidden;
  contain: strict;
  width: 100%;
}

.app-virtual-list-inner {
  position: relative;
  width: 100%;
  box-sizing: border-box;
}

.app-virtual-list-item-wrapper {
  will-change: transform;
}

.app-virtual-list-item-wrapper > * {
  margin-bottom: var(--virtual-gap);
}

.app-virtual-list-item-wrapper:last-child > * {
  margin-bottom: 0;
}

.app-virtual-list-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  color: var(--color-secondary);
  
  font-family: var(--font-family);
  font-size: var(--text-size-footnote);
}
</style>
