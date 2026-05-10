<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { usePlatform } from '@/composables/usePlatform'
import {
  APP_ICON_REGISTRY,
  type AppIconName,
  type CustomIconName,
  type IconSource,
  type PlatformIconDefinition,
} from './AppIcon.types'

// ── Ionicons raw SVGs (bundled — offline-safe on all platforms) ──────────────

import homeOutline               from 'ionicons/dist/svg/home-outline.svg?raw'
import homeFilled                from 'ionicons/dist/svg/home.svg?raw'
import searchOutline             from 'ionicons/dist/svg/search-outline.svg?raw'
import searchFilled              from 'ionicons/dist/svg/search.svg?raw'
import chatbubbleOutline         from 'ionicons/dist/svg/chatbubble-outline.svg?raw'
import chatbubbleFilled          from 'ionicons/dist/svg/chatbubble.svg?raw'
import notificationsOutline      from 'ionicons/dist/svg/notifications-outline.svg?raw'
import notificationsFilled       from 'ionicons/dist/svg/notifications.svg?raw'
import personCircleOutline       from 'ionicons/dist/svg/person-circle-outline.svg?raw'
import personCircleFilled        from 'ionicons/dist/svg/person-circle.svg?raw'
import arrowUndoOutline          from 'ionicons/dist/svg/arrow-undo-outline.svg?raw'
import repeatOutline             from 'ionicons/dist/svg/repeat-outline.svg?raw'
import chatbubbleEllipsesOutline from 'ionicons/dist/svg/chatbubble-ellipses-outline.svg?raw'
import heartOutline              from 'ionicons/dist/svg/heart-outline.svg?raw'
import heartFilled               from 'ionicons/dist/svg/heart.svg?raw'
import bookmarkOutline           from 'ionicons/dist/svg/bookmark-outline.svg?raw'
import bookmarkFilled            from 'ionicons/dist/svg/bookmark.svg?raw'
import shareOutline              from 'ionicons/dist/svg/share-outline.svg?raw'
import ellipsisHorizontalOutline from 'ionicons/dist/svg/ellipsis-horizontal-outline.svg?raw'
import addOutline                from 'ionicons/dist/svg/add-outline.svg?raw'
import checkmarkOutline          from 'ionicons/dist/svg/checkmark-outline.svg?raw'
import imageOutline              from 'ionicons/dist/svg/image-outline.svg?raw'
import trashOutline              from 'ionicons/dist/svg/trash-outline.svg?raw'
import copyOutline               from 'ionicons/dist/svg/copy-outline.svg?raw'
import chevronBackOutline        from 'ionicons/dist/svg/chevron-back-outline.svg?raw'
import chevronForwardOutline     from 'ionicons/dist/svg/chevron-forward-outline.svg?raw'
import chevronDownOutline        from 'ionicons/dist/svg/chevron-down-outline.svg?raw'
import closeOutline              from 'ionicons/dist/svg/close-outline.svg?raw'
import settingsOutline           from 'ionicons/dist/svg/settings-outline.svg?raw'

const IONICONS: Record<string, string> = {
  'home-outline':                  homeOutline,
  'home':                          homeFilled,
  'search-outline':                searchOutline,
  'search':                        searchFilled,
  'chatbubble-outline':            chatbubbleOutline,
  'chatbubble':                    chatbubbleFilled,
  'notifications-outline':         notificationsOutline,
  'notifications':                 notificationsFilled,
  'person-circle-outline':         personCircleOutline,
  'person-circle':                 personCircleFilled,
  'arrow-undo-outline':            arrowUndoOutline,
  'repeat-outline':                repeatOutline,
  'chatbubble-ellipses-outline':   chatbubbleEllipsesOutline,
  'heart-outline':                 heartOutline,
  'heart':                         heartFilled,
  'bookmark-outline':              bookmarkOutline,
  'bookmark':                      bookmarkFilled,
  'share-outline':                 shareOutline,
  'ellipsis-horizontal-outline':   ellipsisHorizontalOutline,
  'add-outline':                   addOutline,
  'checkmark-outline':             checkmarkOutline,
  'image-outline':                 imageOutline,
  'trash-outline':                 trashOutline,
  'copy-outline':                  copyOutline,
  'chevron-back-outline':          chevronBackOutline,
  'chevron-forward-outline':       chevronForwardOutline,
  'chevron-down-outline':          chevronDownOutline,
  'close-outline':                 closeOutline,
  'settings-outline':              settingsOutline,
}

// ── Custom protocol glyphs ───────────────────────────────────────────────────
// Glyph-only inline SVGs — no background, no text. Inherit currentColor.
// Replace with real brand assets when design delivers them.

const CUSTOM_ICONS: Record<CustomIconName, string> = {
  'verified-mark': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l6 6L20 6"/></svg>`,

  // Three nodes connected by lines — represents a federated network graph.
  'federation': `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="4.5" r="2.5" fill="currentColor"/><circle cx="4" cy="19.5" r="2.5" fill="currentColor"/><circle cx="20" cy="19.5" r="2.5" fill="currentColor"/><path d="M12 7L4 17M12 7L20 17M4 19.5h16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,

  // Concentric broadcast arcs + anchor dot — ActivityPub broadcasting concept.
  'activitypub': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M5 17.5a9 9 0 0 1 0-11M19 6.5a9 9 0 0 1 0 11M8.5 14.5a4.5 4.5 0 0 1 0-5M15.5 9.5a4.5 4.5 0 0 1 0 5"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>`,

  // @ glyph — AT Protocol identity.
  'atproto': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1A10 10 0 1 0 12 22"/></svg>`,
}

// ── Props ────────────────────────────────────────────────────────────────────

const props = defineProps<{
  name: AppIconName
  size?: number
  color?: string
}>()

// ── Platform ─────────────────────────────────────────────────────────────────

const platform = usePlatform()
const isAndroid = platform.os === 'android'

// ── Material Symbols font loading (Android only) ──────────────────────────────
// Loaded on-demand; invisible until ready (display=block prevents FOUT).
// Never injected on iOS — no Google Fonts network call on iOS.

const MATERIAL_FONT_LINK_ID = 'app-material-symbols'
const materialFontReady = shallowRef(false)

onMounted(async () => {
  if (!isAndroid) return

  if (!document.getElementById(MATERIAL_FONT_LINK_ID)) {
    const link = document.createElement('link')
    link.id = MATERIAL_FONT_LINK_ID
    link.rel = 'stylesheet'
    link.href =
      'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined' +
      ':opsz,wght,FILL,GRAD@24,400,0,0&display=block'
    document.head.appendChild(link)
  }

  try {
    await document.fonts.load('24px "Material Symbols Outlined"')
    materialFontReady.value = true
  } catch {
    // Offline Capacitor run — Ionicons bundled SVG remains as fallback.
  }
})

// ── Source resolution ─────────────────────────────────────────────────────────

function resolveSource(name: AppIconName): IconSource {
  // Cast through PlatformIconDefinition so optional `fallback` is accessible.
  // The satisfies guard in types.ts still enforces exhaustiveness at definition time.
  const def = APP_ICON_REGISTRY[name] as PlatformIconDefinition
  if (isAndroid) {
    if (materialFontReady.value) return def.material
    return def.fallback ?? def.ios
  }
  return def.ios
}

const source = computed((): IconSource => resolveSource(props.name))

// ── Rendering helpers ─────────────────────────────────────────────────────────

function sizedSvg(svg: string, px: number): string {
  return svg.replace(/^<svg /, `<svg width="${px}" height="${px}" `)
}

const px = computed(() => props.size ?? 20)

const ionSvg = computed(() => {
  const s = source.value
  if (s.type !== 'ionicon') return ''
  const raw = IONICONS[s.name]
  if (import.meta.env.DEV && !raw) {
    console.warn(`[AppIcon] Missing Ionicons SVG for "${s.name}" (icon: "${props.name}")`)
  }
  return raw ? sizedSvg(raw, px.value) : ''
})

const customSvg = computed(() => {
  const s = source.value
  if (s.type !== 'custom') return ''
  return sizedSvg(CUSTOM_ICONS[s.name], px.value)
})

const materialIconName = computed(() => {
  const s = source.value
  return s.type === 'material' ? s.name : ''
})

const materialFill = computed(() => {
  const s = source.value
  return s.type === 'material' ? (s.fill ?? 0) : 0
})

const lucideComponent = computed(() => {
  const s = source.value
  return s.type === 'lucide' ? s.component : null
})
</script>

<template>
  <!--
    Render priority:
      1. Lucide     — explicit mapping only (currently: loader on iOS/default)
      2. Material   — Android, font confirmed loaded
      3. Custom     — protocol identity glyphs (platform-independent)
      4. Ionicons   — iOS / macOS / web default; Android fallback before font ready
  -->

  <component
    v-if="lucideComponent"
    :is="lucideComponent"
    :size="px"
    :color="color"
    :stroke-width="1.75"
    aria-hidden="true"
  />

  <span
    v-else-if="source.type === 'material'"
    class="material-symbols-outlined"
    :style="{
      fontSize: `${px}px`,
      color,
      lineHeight: '1',
      userSelect: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontVariationSettings: `'opsz' ${px}, 'wght' 400, 'FILL' ${materialFill}, 'GRAD' 0`,
    }"
    aria-hidden="true"
  >{{ materialIconName }}</span>

  <span
    v-else-if="source.type === 'custom'"
    class="inline-flex items-center justify-center"
    :style="{ width: `${px}px`, height: `${px}px`, color, flexShrink: '0' }"
    v-html="customSvg"
    aria-hidden="true"
  />

  <span
    v-else
    class="inline-flex items-center justify-center"
    :style="{ width: `${px}px`, height: `${px}px`, color, flexShrink: '0' }"
    v-html="ionSvg"
    aria-hidden="true"
  />
</template>
