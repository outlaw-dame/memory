<script setup lang="ts">
/**
 * TrustBadge — Moderation / trust state indicator.
 *
 * Variants:
 *   trusted    — green; account is trusted / allowlisted
 *   flagged    — amber; account is flagged for review
 *   suspended  — red;   account is suspended
 *   unknown    — gray;  trust state not determined
 */
type TrustLevel = 'trusted' | 'flagged' | 'suspended' | 'unknown'

const props = defineProps<{
  level: TrustLevel
  label?: string
}>()

const CONFIG: Record<TrustLevel, { defaultLabel: string; class: string }> = {
  trusted:   { defaultLabel: 'Trusted',   class: 'bg-emerald-50 text-emerald-700' },
  flagged:   { defaultLabel: 'Flagged',   class: 'bg-amber-50   text-amber-700'   },
  suspended: { defaultLabel: 'Suspended', class: 'bg-red-50     text-red-600'     },
  unknown:   { defaultLabel: 'Unknown',   class: 'bg-gray-100   text-gray-500'    },
}

const cfg = CONFIG[props.level]
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
    :class="cfg.class"
  >
    {{ label ?? cfg.defaultLabel }}
  </span>
</template>
