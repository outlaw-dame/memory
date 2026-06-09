<script setup lang="ts">
/**
 * StoryRail - Wrapper component that delegates to StoryAvatarRail
 * 
 * Preserves existing API contract:
 * - Props: groups, loading, error
 * - Emits: @compose, @open(groupIndex)
 * 
 * This is a compatibility wrapper. Consumers should migrate to StoryAvatarRail directly.
 */

import { StoryAvatarRail } from '@/features/stories'
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

// Handle compose event from StoryAvatarRail
function handleCompose() {
  emit('compose')
}

// Handle open event from StoryAvatarRail
// StoryAvatarRail emits the correct group index already
function handleOpen(groupIndex: number) {
  emit('open', groupIndex)
}
</script>

<template>
  <StoryAvatarRail
    :groups="groups"
    :loading="loading"
    :error="error"
    @compose="handleCompose"
    @open="handleOpen"
  />
</template>
