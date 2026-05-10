<script setup lang="ts">
import AppIcon from '@/components/AppIcon.vue'
import type { AppIconName } from '@/components/AppIcon.types'

type Protocol = 'atproto' | 'activitypub'

const props = defineProps<{
  protocol: Protocol
}>()

const CONFIG: Record<Protocol, { icon: AppIconName; label: string; class: string }> = {
  atproto:     { icon: 'atproto',     label: 'AT Protocol', class: 'bg-indigo-50 text-indigo-600'  },
  activitypub: { icon: 'activitypub', label: 'ActivityPub', class: 'bg-emerald-50 text-emerald-600' },
}

const cfg = CONFIG[props.protocol]
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
    :class="cfg.class"
    :aria-label="cfg.label"
  >
    <AppIcon :name="cfg.icon" :size="11" color="currentColor" />
    {{ protocol === 'atproto' ? 'AT' : 'AP' }}
  </span>
</template>
