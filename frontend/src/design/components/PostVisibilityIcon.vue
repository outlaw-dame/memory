<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'

export type PostVisibility = 'public' | 'unlisted' | 'followers' | 'direct' | 'local' | 'unknown'

const props = defineProps<{
  visibility: PostVisibility
  size?: number
}>()
</script>

<template>
  <!--
    Public and unknown are the default / most-permissive states — no icon needed.
    Only surface visibility when a post deviates from public (Apple minimalism rule).
  -->
  <AppIcon
    v-if="visibility === 'followers' || visibility === 'unlisted'"
    name="lock"
    :size="size ?? 12"
    color="currentColor"
    :aria-label="visibility === 'followers' ? 'Followers only' : 'Unlisted'"
  />
  <AppIcon
    v-else-if="visibility === 'direct'"
    name="mail"
    :size="size ?? 12"
    color="currentColor"
    aria-label="Direct message"
  />
  <AppIcon
    v-else-if="visibility === 'local'"
    name="home"
    :size="size ?? 12"
    color="currentColor"
    aria-label="Local only"
  />
  <!-- public / unknown: renders nothing -->
</template>
