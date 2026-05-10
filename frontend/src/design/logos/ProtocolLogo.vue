<script setup lang="ts">
import { computed } from 'vue'
import type { ProtocolLogoName } from './protocolLogoTypes'

/**
 * ProtocolLogo — renders a platform/protocol brand glyph.
 *
 * These are simplified logo representations for use in compact UI contexts
 * (metadata rows, badges, protocol pills). They are NOT generic UI icons —
 * do not use this component for navigation or action icons.
 *
 * Placeholder SVGs are used where real brand assets haven't been sourced yet.
 * Replace individual entries in PROTOCOL_LOGO_SVGS with final assets when ready.
 * All originals should be verified for license compatibility before shipping.
 */

const props = defineProps<{
  name: ProtocolLogoName
  size?: number
  color?: string
}>()

// ── SVG registry ─────────────────────────────────────────────────────────────
// viewBox="0 0 24 24", inherits currentColor. No fills or strokes hardcoded.

const PROTOCOL_LOGO_SVGS: Record<ProtocolLogoName, string> = {
  // Generic Fediverse — three distributed nodes in a triangle.
  fediverse: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="4.5" r="2.5" fill="currentColor"/><circle cx="4" cy="19.5" r="2.5" fill="currentColor"/><circle cx="20" cy="19.5" r="2.5" fill="currentColor"/><path d="M12 7L4 17M12 7L20 17M4 19.5h16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,

  // ActivityPub protocol — broadcast arcs emanating from a central point.
  activitypub: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M5 17.5a9 9 0 0 1 0-11M19 6.5a9 9 0 0 1 0 11M8.5 14.5a4.5 4.5 0 0 1 0-5M15.5 9.5a4.5 4.5 0 0 1 0 5"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>`,

  // ActivityPods — pod on a stand (data pod / personal server concept).
  activitypods: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="10" r="5.5"/><path d="M12 15.5v4M8.5 19.5h7"/></svg>`,

  // AT Protocol — @ symbol (standard at-sign composed of circle + arc).
  atproto: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1A10 10 0 1 0 12 22"/></svg>`,

  // Bluesky — simplified butterfly / cloud wings shape.
  bluesky: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8C9.5 4.5 4 4.5 3.5 9c-.5 4 2.5 5.5 5 5.5 1.5 0 2.5-.5 3.5-2 1 1.5 2 2 3.5 2 2.5 0 5.5-1.5 5-5.5C20 4.5 14.5 4.5 12 8z"/><path d="M12 8v12"/></svg>`,

  // Mastodon — simplified elephant head profile.
  mastodon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9a8 8 0 0 1 16 0v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9z"/><path d="M4 12h16"/><path d="M16 15v1a2 2 0 0 0 4 0v-1"/></svg>`,

  // Akkoma — simplified diamond / gemstone (Akkoma's jewel motif).
  akkoma: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 5v8l-8 5-8-5V8l8-5z"/><path d="M12 3v13M4 8l8 5 8-5"/></svg>`,

  // Pleroma — four connected squares / modules.
  pleroma: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,

  // Misskey / Calckey — shooting star / sparkle.
  misskey: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.09 6.26H21l-5.47 3.97 2.09 6.26L12 14.43l-5.62 4.06 2.09-6.26L3 8.26h6.91L12 2z"/></svg>`,

  // Lemmy — community L (simple serif-less L, clean at small sizes).
  lemmy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M8 5v14h8"/></svg>`,

  // Pixelfed — camera with aperture.
  pixelfed: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><circle cx="12" cy="14" r="3.5"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,

  // PeerTube — circle with play triangle.
  peertube: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M10 8l6 4-6 4V8z" fill="currentColor" stroke="none"/></svg>`,

  // Fedify — lightning bolt (fast relay/framework).
  fedify: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,

  // Unknown — question mark in circle.
  unknown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="none"/></svg>`,
}

// ── Computed ─────────────────────────────────────────────────────────────────

const px = computed(() => props.size ?? 20)

function sizedSvg(svg: string, size: number): string {
  return svg.replace(/^<svg /, `<svg width="${size}" height="${size}" `)
}

const svgHtml = computed(() => sizedSvg(PROTOCOL_LOGO_SVGS[props.name], px.value))
</script>

<template>
  <span
    class="inline-flex items-center justify-center shrink-0"
    :style="{ width: `${px}px`, height: `${px}px`, color: color ?? 'currentColor' }"
    v-html="svgHtml"
    aria-hidden="true"
  />
</template>
