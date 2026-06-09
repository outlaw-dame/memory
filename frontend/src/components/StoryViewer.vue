/**
 * StoryViewer - Wrapper component that delegates to StoryViewerOverlay
 * 
 * Preserves existing API contract:
 * - Props: groups, initialGroupIndex
 * - Emits: @close, @deleted
 * 
 * Uses the new composed structure:
 * - StoryViewerOverlay (container with gestures)
 * - StoryProgressBar (progress indicators)
 * - StoryViewerHeader (actor info, actions)
 * - StoryViewerFooter (text, links)
 * 
 * This is a compatibility wrapper. Consumers should migrate to StoryViewerOverlay directly.
 */

<script setup lang="ts">
import { StoryViewerOverlay } from '@/features/stories'
import type { StoryGroup } from '@/stores/atBridgeStore'

const props = defineProps<{
  groups: StoryGroup[]
  initialGroupIndex: number
}>()

const emit = defineEmits<{
  close: []
  deleted: []
}>()

// Handle close event from StoryViewerOverlay
function handleClose() {
  emit('close')
}

// Handle deleted event from StoryViewerOverlay
function handleDeleted() {
  emit('deleted')
}
</script>

<template>
  <StoryViewerOverlay
    :groups="props.groups"
    :initial-group-index="props.initialGroupIndex"
    @close="handleClose"
    @deleted="handleDeleted"
  />
</template>
