<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'

type FederationSource = 'atproto' | 'activitypods' | 'local'

const props = defineProps<{
  source: FederationSource
  /** Show the federation glyph alongside the source label. */
  showIcon?: boolean
}>()

const LABELS: Record<FederationSource, string> = {
  atproto:      'AT Protocol',
  activitypods: 'ActivityPods',
  local:        'Local',
}

const CLASSES: Record<FederationSource, string> = {
  atproto:      'bg-indigo-50 text-indigo-600',
  activitypods: 'bg-emerald-50 text-emerald-600',
  local:        'bg-gray-100 text-gray-500',
}
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
    :class="CLASSES[source]"
    :aria-label="LABELS[source]"
  >
    <AppIcon v-if="showIcon" name="federation" :size="11" color="currentColor" />
    {{ LABELS[source] }}
  </span>
</template>
