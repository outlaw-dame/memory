/**
 * StoryAvatarRail - Horizontal rail of story avatars
 *
 * Responsibilities:
 * - Display horizontal scrollable rail
 * - Show create story button first
 * - Show loading/error states
 * - Native touch scrolling
 * - Keyboard accessible
 * - Emit events for compose and open
 */

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import StoryAvatarItem from './StoryAvatarItem.vue'
import type { StoryGroup } from '@/stores/atBridgeStore'

export interface StoryAvatarRailProps {
  groups: StoryGroup[]
  loading?: boolean
  error?: string | null
  showCompose?: boolean
}

const props = defineProps<StoryAvatarRailProps>()

const emit = defineEmits<{
  (e: 'compose'): void
  (e: 'open', groupIndex: number): void
}>()

const viewerGroup = computed(() => {
  return props.groups.find(g => g.actor.isViewer) ?? null
})

const otherGroups = computed(() => {
  return props.groups.filter(g => !g.actor.isViewer)
})

function handleCompose() {
  emit('compose')
}

function handleOpen(index: number) {
  // Need to account for viewer group position
  const viewerIdx = props.groups.findIndex(g => g.actor.isViewer)
  if (viewerIdx >= 0 && index >= viewerIdx) {
    emit('open', index + 1) // Skip viewer group in emit
  } else {
    emit('open', index)
  }
}

function handleKeyDown(event: KeyboardEvent, index: number) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    handleOpen(index)
  }
}
</script>

<template>
  <section
    class="story-avatar-rail -mx-4 border-y border-separator bg-secondary-system-background/80 px-4 py-3"
    role="region"
    aria-label="Stories"
  >
    <div
      class="story-avatar-rail__track flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide"
      role="list"
    >
      <!-- Create story button -->
      <button
        v-if="showCompose !== false"
        type="button"
        class="story-avatar-rail__create flex w-16 shrink-0 flex-col items-center gap-1 text-center"
        aria-label="Create story"
        @click="handleCompose"
      >
        <span class="grid h-14 w-14 place-items-center rounded-full border border-separator bg-tertiary-system-background text-label shadow-sm">
          <AppIcon name="add" :size="24" />
        </span>
        <span class="max-w-16 truncate text-[0.72rem] font-medium text-secondary-label">Your story</span>
      </button>

      <!-- Loading state -->
      <div
        v-if="loading"
        class="story-avatar-rail__loading flex min-w-32 items-center gap-2 text-sm text-secondary-label"
        role="status"
        aria-live="polite"
      >
        <AppIcon name="loader" :size="18" class="animate-spin" />
        <span>Loading</span>
      </div>

      <!-- Error state -->
      <p
        v-else-if="error"
        class="story-avatar-rail__error min-w-48 text-sm text-system-red"
        role="alert"
      >
        {{ error }}
      </p>

      <!-- Viewer's story (if exists and not first) -->
      <StoryAvatarItem
        v-if="viewerGroup && showCompose !== false"
        :group="viewerGroup"
        :index="0"
        :is-viewer="true"
        @open="handleOpen"
      />

      <!-- Other groups -->
      <StoryAvatarItem
        v-for="(group, index) in otherGroups"
        :key="group.actor.did"
        :group="group"
        :index="viewerGroup && showCompose !== false ? index + 1 : index"
        @open="handleOpen"
      />
    </div>
  </section>
</template>

<style scoped>
.story-avatar-rail {
  /* Native overflow scrolling */
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.story-avatar-rail::-webkit-scrollbar {
  display: none;
}

.story-avatar-rail__track {
  /* Prevent accidental selection during scroll */
  user-select: none;
  -webkit-user-select: none;
}

.story-avatar-rail__create,
.story-avatar-rail__create * {
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.story-avatar-rail__create:hover {
  opacity: 0.8;
}

.story-avatar-rail__create:active {
  opacity: 0.6;
  transform: scale(0.95);
}

/* Hide scrollbar for cleaner look */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
