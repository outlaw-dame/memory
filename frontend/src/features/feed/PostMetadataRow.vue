<script setup lang="ts">
/**
 * PostMetadataRow — compact post provenance + timestamp.
 *
 * Feed cell (compact=true):   2m · [protocol logo]  · [visibility icon if non-public]
 * Thread/detail (compact=false): full label + timestamp + optional "via [client]"
 *
 * Visibility is only shown when it deviates from public (Apple minimalism).
 * Client app is only shown in detail mode and only when the appearance store enables it.
 */
import { computed } from 'vue'
import { useI18n } from '@/i18n'
import ProtocolLogo from '@/design/logos/ProtocolLogo.vue'
import PostVisibilityIcon from '@/design/components/PostVisibilityIcon.vue'
import ClientAppBadge from './ClientAppBadge.vue'
import { useAppearanceStore } from '@/stores/appearanceStore'
import type { PostSourceMetadata } from './postSourceMetadata'

const props = defineProps<{
  metadata: PostSourceMetadata
  createdAt: string | null
  compact?: boolean
}>()

const { formatRelativeTime, formatDateTime } = useI18n()
const appearance = useAppearanceStore()

const timeLabel = computed(() => {
  if (!props.createdAt) return ''
  return props.compact
    ? formatRelativeTime(props.createdAt)
    : formatDateTime(props.createdAt, { dateStyle: 'medium', timeStyle: 'short' })
})

const showVisibility = computed(() =>
  appearance.showVisibilityIndicator &&
  props.metadata.visibility !== 'public' &&
  props.metadata.visibility !== 'unknown'
)
</script>

<template>
  <!-- Compact (feed cell): timestamp · logo · [lock] -->
  <div v-if="compact" class="flex items-center gap-1 text-caption text-dark-50">
    <span>{{ timeLabel }}</span>
    <span class="text-dark-20" aria-hidden="true">·</span>
    <ProtocolLogo
      v-if="appearance.showProtocolBadge"
      :name="metadata.software"
      :size="13"
      color="currentColor"
      :aria-label="metadata.label"
    />
    <PostVisibilityIcon
      v-if="showVisibility"
      :visibility="metadata.visibility"
      :size="12"
    />
  </div>

  <!-- Detail (thread view): full label + absolute time + optional client -->
  <div v-else class="flex flex-col gap-0.5">
    <div class="flex items-center gap-1.5 text-caption text-dark-50">
      <ProtocolLogo
        v-if="appearance.showProtocolBadge"
        :name="metadata.software"
        :size="14"
        color="currentColor"
      />
      <span class="font-medium">{{ metadata.label }}</span>
      <PostVisibilityIcon
        v-if="showVisibility"
        :visibility="metadata.visibility"
        :size="12"
      />
      <ClientAppBadge
        v-if="appearance.showClientApp && metadata.client"
        :client="metadata.client"
      />
    </div>
    <span class="text-caption text-dark-50">{{ timeLabel }}</span>
  </div>
</template>
