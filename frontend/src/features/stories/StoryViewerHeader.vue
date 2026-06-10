/**
 * StoryViewerHeader - Header for story viewer
 *
 * Responsibilities:
 * - Display actor information
 * - Show expiry timer
 * - Delete button (when viewerCanDelete)
 * - Close button
 * - Native-safe layout
 */

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import type { StoryGroup, StoryItem } from '@/stores/atBridgeStore'

export interface StoryViewerHeaderProps {
  group: StoryGroup
  item: StoryItem
  isDeleting?: boolean
  onDelete?: () => void
  onClose?: () => void
}

const props = defineProps<StoryViewerHeaderProps>()

const emit = defineEmits<{
  (e: 'delete'): void
  (e: 'close'): void
}>()

const displayName = computed(() => {
  return props.group.actor.displayName || props.group.actor.handle || props.group.actor.did
})

const avatarInitials = computed(() => {
  const label = displayName.value
  return label
    .trim()
    .split(/\s+/)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'ME'
})

const expiryLabel = computed(() => {
  const hours = Math.floor(props.item.expiresInSeconds / 3600)
  const minutes = Math.max(1, Math.floor((props.item.expiresInSeconds % 3600) / 60))
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
})

const viewerCanDelete = computed(() => {
  return props.item.viewerCanDelete
})

function handleDelete() {
  props.onDelete?.()
  emit('delete')
}

function handleClose() {
  props.onClose?.()
  emit('close')
}
</script>

<template>
  <header
    class="story-viewer-header absolute left-3 right-3 top-7 z-20 flex items-center justify-between gap-3"
    role="banner"
  >
    <div class="story-viewer-header__author flex min-w-0 items-center gap-2">
      <!-- Avatar -->
      <span
        class="story-viewer-header__avatar grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-white/15 text-xs font-bold"
      >
        <img
          v-if="group.actor.avatarUrl"
          :src="group.actor.avatarUrl"
          :alt="`${displayName}'s avatar`"
          class="h-full w-full object-cover"
        />
        <span v-else>{{ avatarInitials }}</span>
      </span>

      <!-- Info -->
      <div class="story-viewer-header__info min-w-0">
        <p class="story-viewer-header__name truncate text-sm font-bold text-white">
          {{ group.actor.isViewer ? 'You' : displayName }}
        </p>
        <p class="story-viewer-header__expiry text-xs text-white/70">
          {{ expiryLabel }}
        </p>
      </div>
    </div>

    <!-- Actions -->
    <div class="story-viewer-header__actions flex shrink-0 items-center gap-2">
      <!-- Delete button (only if viewer can delete) -->
      <button
        v-if="viewerCanDelete"
        type="button"
        class="story-viewer-header__action grid h-9 w-9 place-items-center rounded-full bg-white/15"
        aria-label="Delete story"
        :disabled="isDeleting"
        @click="handleDelete"
      >
        <AppIcon :name="isDeleting ? 'loader' : 'trash'" :size="18" :class="{ 'animate-spin': isDeleting }" />
      </button>

      <!-- Close button -->
      <button
        type="button"
        class="story-viewer-header__action grid h-9 w-9 place-items-center rounded-full bg-white/15"
        aria-label="Close story viewer"
        @click="handleClose"
      >
        <AppIcon name="close" :size="20" />
      </button>
    </div>
  </header>
</template>

<style scoped>
.story-viewer-header {
  /* Safe area insets for notched devices */
  padding-top: env(safe-area-inset-top);
}

.story-viewer-header__author {
  /* Prevent text overflow */
  max-width: 70%;
}

.story-viewer-header__avatar {
  /* Shadow for visibility on dark background */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.story-viewer-header__name {
  /* Ensure readability */
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.story-viewer-header__action {
  cursor: pointer;
  transition: opacity 0.2s ease;
  /* Prevent double-tap zoom on mobile */
  touch-action: manipulation;
}

.story-viewer-header__action:hover {
  opacity: 0.8;
}

.story-viewer-header__action:active {
  opacity: 0.6;
  transform: scale(0.9);
}

.story-viewer-header__action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
