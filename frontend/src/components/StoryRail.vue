<script setup lang="ts">
import AppIcon from './AppIcon.vue'
import type { StoryGroup } from '@/stores/atBridgeStore'

defineProps<{
  groups: StoryGroup[]
  loading?: boolean
  error?: string | null
}>()

const emit = defineEmits<{
  compose: []
  open: [groupIndex: number]
}>()

function actorLabel(group: StoryGroup): string {
  return group.actor.displayName || group.actor.handle || group.actor.did
}

function initials(label: string): string {
  return label
    .trim()
    .split(/\s+/)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'ME'
}
</script>

<template>
  <section class="-mx-4 border-y border-separator bg-secondary-system-background/80 px-4 py-3">
    <div class="flex items-center gap-3 overflow-x-auto pb-1">
      <button
        type="button"
        class="flex w-16 shrink-0 flex-col items-center gap-1 text-center"
        aria-label="Create story"
        @click="emit('compose')"
      >
        <span class="grid h-14 w-14 place-items-center rounded-full border border-separator bg-tertiary-system-background text-label shadow-sm">
          <AppIcon name="add" :size="24" />
        </span>
        <span class="max-w-16 truncate text-[0.72rem] font-medium text-secondary-label">Your story</span>
      </button>

      <div v-if="loading" class="flex min-w-32 items-center gap-2 text-sm text-secondary-label">
        <AppIcon name="loader" :size="18" class="animate-spin" />
        <span>Loading</span>
      </div>

      <p v-else-if="error" class="min-w-48 text-sm text-system-red">{{ error }}</p>

      <button
        v-for="(group, index) in groups"
        :key="group.actor.did"
        type="button"
        class="flex w-16 shrink-0 flex-col items-center gap-1 text-center"
        :aria-label="`Open ${actorLabel(group)} story`"
        @click="emit('open', index)"
      >
        <span
          class="grid h-14 w-14 place-items-center overflow-hidden rounded-full border-2 bg-tertiary-system-background text-sm font-bold text-label"
          :class="group.seen ? 'border-separator opacity-75' : 'border-system-blue'"
        >
          <img
            v-if="group.actor.avatarUrl"
            :src="group.actor.avatarUrl"
            alt=""
            class="h-full w-full object-cover"
          >
          <span v-else>{{ initials(actorLabel(group)) }}</span>
        </span>
        <span class="max-w-16 truncate text-[0.72rem] font-medium text-secondary-label">
          {{ group.actor.isViewer ? 'You' : actorLabel(group) }}
        </span>
      </button>
    </div>
  </section>
</template>
