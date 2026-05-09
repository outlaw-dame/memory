<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'
import { Loader2 } from '@lucide/vue'
import { usePlatform } from '@/composables/usePlatform'
import type { IconName } from './AppIcon.types'

// Ionicons SVGs — outline variants; all use currentColor (stroke or fill)
import homeOutline from 'ionicons/dist/svg/home-outline.svg?raw'
import searchOutline from 'ionicons/dist/svg/search-outline.svg?raw'
import chatbubbleOutline from 'ionicons/dist/svg/chatbubble-outline.svg?raw'
import notificationsOutline from 'ionicons/dist/svg/notifications-outline.svg?raw'
import personCircleOutline from 'ionicons/dist/svg/person-circle-outline.svg?raw'
import arrowBackOutline from 'ionicons/dist/svg/arrow-back-outline.svg?raw'
import chevronBackOutline from 'ionicons/dist/svg/chevron-back-outline.svg?raw'
import chevronForwardOutline from 'ionicons/dist/svg/chevron-forward-outline.svg?raw'
import chevronDownOutline from 'ionicons/dist/svg/chevron-down-outline.svg?raw'
import closeOutline from 'ionicons/dist/svg/close-outline.svg?raw'
import checkmarkOutline from 'ionicons/dist/svg/checkmark-outline.svg?raw'
import addOutline from 'ionicons/dist/svg/add-outline.svg?raw'
import imageOutline from 'ionicons/dist/svg/image-outline.svg?raw'
import copyOutline from 'ionicons/dist/svg/copy-outline.svg?raw'
import trashOutline from 'ionicons/dist/svg/trash-outline.svg?raw'

const IONICONS_MAP: Record<Exclude<IconName, 'loader'>, string> = {
  'home':          homeOutline,
  'explore':       searchOutline,
  'messages':      chatbubbleOutline,
  'notifications': notificationsOutline,
  'profile':       personCircleOutline,
  'arrow-left':    arrowBackOutline,
  'chevron-left':  chevronBackOutline,
  'chevron-right': chevronForwardOutline,
  'chevron-down':  chevronDownOutline,
  'close':         closeOutline,
  'check':         checkmarkOutline,
  'add':           addOutline,
  'image':         imageOutline,
  'copy':          copyOutline,
  'trash':         trashOutline,
  'user-circle':   personCircleOutline,
}

// Material Symbols Outlined names — Android system icon font
const MATERIAL_MAP: Record<IconName, string> = {
  'home':          'home',
  'explore':       'explore',
  'messages':      'chat_bubble',
  'notifications': 'notifications',
  'profile':       'account_circle',
  'arrow-left':    'arrow_back',
  'chevron-left':  'chevron_left',
  'chevron-right': 'chevron_right',
  'chevron-down':  'expand_more',
  'close':         'close',
  'check':         'check',
  'add':           'add',
  'image':         'image',
  'copy':          'content_copy',
  'trash':         'delete',
  'user-circle':   'account_circle',
  'loader':        'progress_activity',
}

const MATERIAL_FONT_LINK_ID = 'app-material-symbols'

const props = defineProps<{
  name: IconName
  size?: number
  color?: string
}>()

const platform = usePlatform()
const isAndroid = platform.os === 'android'

// Inject explicit width/height so the SVG renders at the requested pixel size
function sizedSvg(svg: string, px: number): string {
  return svg.replace(/^<svg /, `<svg width="${px}" height="${px}" `)
}

const ionSvg = computed(() =>
  props.name !== 'loader'
    ? sizedSvg(IONICONS_MAP[props.name], props.size ?? 20)
    : ''
)

// True only after the Material Symbols font is confirmed ready via Font Loading API
const materialFontReady = shallowRef(false)

onMounted(async () => {
  if (!isAndroid) return

  if (!document.getElementById(MATERIAL_FONT_LINK_ID)) {
    const link = document.createElement('link')
    link.id = MATERIAL_FONT_LINK_ID
    link.rel = 'stylesheet'
    // display=block: invisible until ready, preventing FOUT
    link.href =
      'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined' +
      ':opsz,wght,FILL,GRAD@24,400,0,0&display=block'
    document.head.appendChild(link)
  }

  try {
    // Font Loading API — resolves only when the font is actually usable
    await document.fonts.load('24px "Material Symbols Outlined"')
    materialFontReady.value = true
  } catch {
    // Network unavailable (offline Capacitor run) — Ionicons SVG remains as fallback
  }
})
</script>

<template>
  <!--
    loader                → Lucide Loader2 (no good Ionicons spinner)
    Android + font ready  → Material Symbols (system-native)
    iOS / macOS / unknown → Ionicons inline SVG (bundled, offline-safe)
    Android before ready  → Ionicons inline SVG fallback
  -->

  <Loader2
    v-if="name === 'loader'"
    :size="size ?? 20"
    :color="color"
    :stroke-width="1.75"
    aria-hidden="true"
  />

  <span
    v-else-if="isAndroid && materialFontReady"
    class="material-symbols-outlined"
    :style="{
      fontSize: `${size ?? 20}px`,
      color,
      lineHeight: '1',
      userSelect: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontVariationSettings: `'opsz' ${size ?? 20}, 'wght' 400, 'FILL' 0, 'GRAD' 0`,
    }"
    aria-hidden="true"
  >{{ MATERIAL_MAP[name] }}</span>

  <span
    v-else
    class="inline-flex items-center justify-center"
    :style="{ width: `${size ?? 20}px`, height: `${size ?? 20}px`, color, flexShrink: '0' }"
    v-html="ionSvg"
    aria-hidden="true"
  />
</template>
