/**
 * StoryAvatarItem - Individual story avatar in the rail
 *
 * Responsibilities:
 * - Display actor avatar with initials fallback
 * - Show seen/unseen state with visual indicators
 * - Accessible button with proper labels
 * - Native touch feedback
 */

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import type { StoryGroup } from '@/stores/atBridgeStore'

export interface StoryAvatarItemProps {
  group: StoryGroup
  index: number
  isViewer?: boolean
}

const props = defineProps<StoryAvatarItemProps>()

const emit = defineEmits<{
  (e: 'open', index: number): void
}>()

const actorLabel = computed(() => {
  return props.group.actor.displayName || props.group.actor.handle || props.group.actor.did
})

const initials = computed(() => {
  const label = actorLabel.value
  return label
    .trim()
    .split(/\s+/)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'ME'
})

const displayName = computed(() => {
  if (props.isViewer) return 'You'
  return props.group.actor.displayName || props.group.actor.handle || props.group.actor.did
})

function handleOpen() {
  emit('open', props.index)
}
</script>

<template>
  <button
    type="button"
    class="story-avatar-item flex w-16 shrink-0 flex-col items-center gap-1 text-center"
    :class="{
      'story-avatar-item--seen': group.seen,
      'story-avatar-item--unseen': !group.seen
    }"
    :aria-label="`Open ${actorLabel} story`"
    @click="handleOpen"
  >
    <span
      class="story-avatar-item__avatar grid h-14 w-14 place-items-center overflow-hidden rounded-full border-2 bg-tertiary-system-background text-sm font-bold text-label"
      :class="{
        'border-separator opacity-75': group.seen,
        'border-system-blue': !group.seen
      }"
    >
      <img
        v-if="group.actor.avatarUrl"
        :src="group.actor.avatarUrl"
        :alt="`${actorLabel}'s avatar`"
        class="h-full w-full object-cover"
        loading="lazy"
      />
      <span v-else>{{ initials }}</span>
    </span>
    <span class="story-avatar-item__label max-w-16 truncate text-[0.72rem] font-medium text-secondary-label">
      {{ displayName }}
    </span>
  </button>
</template>

<style scoped>
.story-avatar-item {
  /* Native touch feedback */
  -webkit-tap-highlight-color: transparent;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.story-avatar-item:hover {
  opacity: 0.8;
}

.story-avatar-item:active {
  opacity: 0.6;
  transform: scale(0.95);
}

.story-avatar-item__avatar {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
</style>
