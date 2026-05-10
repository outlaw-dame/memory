<script setup lang="ts">
import ProtocolLogo from '@/design/logos/ProtocolLogo.vue'
import type { ProtocolLogoName } from '@/design/logos/protocolLogoTypes'

type Protocol = 'atproto' | 'activitypub'

const props = defineProps<{
  protocol: Protocol
}>()

const CONFIG: Record<Protocol, { logo: ProtocolLogoName; label: string; class: string; short: string }> = {
  atproto:     { logo: 'atproto',     label: 'AT Protocol', class: 'bg-indigo-50 text-indigo-600',   short: 'AT' },
  activitypub: { logo: 'activitypub', label: 'ActivityPub', class: 'bg-emerald-50 text-emerald-600', short: 'AP' },
}

const cfg = CONFIG[props.protocol]
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
    :class="cfg.class"
    :aria-label="cfg.label"
  >
    <ProtocolLogo :name="cfg.logo" :size="11" color="currentColor" />
    {{ cfg.short }}
  </span>
</template>
