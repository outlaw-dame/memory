<script setup lang="ts">
import { onMounted, shallowRef, type Component } from 'vue'
import {
  House, Globe, MessageCircle, Bell, LayoutGrid,
  ArrowLeft, ChevronLeft, ChevronDown, X, Check, Copy, Trash2,
  CircleUser, Loader2,
} from '@lucide/vue'
import { usePlatform } from '@/composables/usePlatform'
import type { IconName } from './AppIcon.types'

const LUCIDE_MAP: Record<IconName, Component> = {
  'home':          House,
  'explore':       Globe,
  'messages':      MessageCircle,
  'notifications': Bell,
  'dashboard':     LayoutGrid,
  'arrow-left':    ArrowLeft,
  'chevron-left':  ChevronLeft,
  'chevron-down':  ChevronDown,
  'close':         X,
  'check':         Check,
  'copy':          Copy,
  'trash':         Trash2,
  'user-circle':   CircleUser,
  'loader':        Loader2,
}

// Material Symbols Outlined names — Android system icon font
const MATERIAL_MAP: Record<IconName, string> = {
  'home':          'home',
  'explore':       'explore',
  'messages':      'chat_bubble',
  'notifications': 'notifications',
  'dashboard':     'grid_view',
  'arrow-left':    'arrow_back',
  'chevron-left':  'chevron_left',
  'chevron-down':  'expand_more',
  'close':         'close',
  'check':         'check',
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
  strokeWidth?: number
}>()

const platform = usePlatform()
const isAndroid = platform.os === 'android'

// SF Symbols Regular ≈ 1.75 stroke weight; Material / web default ≈ 2
const resolvedStrokeWidth = props.strokeWidth ?? (
  platform.os === 'ios' || platform.os === 'macos' ? 1.75 : 2
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
    // Network unavailable (offline Capacitor run) — Lucide remains as fallback
  }
})
</script>

<template>
  <!--
    Android + font ready → Material Symbols (system-native)
    Everyone else (and Android before font loads) → Lucide
    This mirrors how emoji defaults to system fonts per platform.
  -->
  <span
    v-if="isAndroid && materialFontReady"
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

  <component
    :is="LUCIDE_MAP[name]"
    v-else
    :size="size ?? 20"
    :color="color"
    :stroke-width="resolvedStrokeWidth"
    aria-hidden="true"
  />
</template>
