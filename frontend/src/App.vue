<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watchEffect, provide } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import AppRoot from '@/design/semantic/AppRoot.vue'
import AppShell from '@/design/semantic/AppShell.vue'
import AppPage from '@/design/semantic/AppPage.vue'
import {
  initCapacitorStatusBar,
  initCapacitorBackButton,
  initNetwork,
  initKeyboard,
  useKeyboardHeight,
} from '@/platform'
import { useI18n } from '@/i18n'

const mainRef = ref<HTMLElement | null>(null)
provide('scrollEl', mainRef)

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

// Initialize Capacitor platform utilities
initCapacitorStatusBar()
initCapacitorBackButton((canGoBack) => {
  if (canGoBack) {
    router.back()
  }
})
initNetwork().catch(() => {})
initKeyboard().catch(() => {})

// Initialize keyboard height (needed for safe area calculations)
useKeyboardHeight()

// ── Route transition ────────────────────────────────────────────────────────

// Depth 0 = root tabs (no slide animation), depth 1+ = push routes (slide).
const ROUTE_DEPTH: Record<string, number> = {
  home: 0, explore: 0, messages: 0, notifications: 0, profile: 0,
}

const AUTH_ROUTES = new Set(['signin', 'signup', 'welcome', 'experience', 'auth-callback'])

// 'tab-switch' = instant, 'slide-left' = push, 'slide-right' = pop, 'route-fade' = auth/reduced-motion
const transitionName = ref('tab-switch')
const reducedMotion = ref(false)

let motionMq: MediaQueryList | null = null
function onMotionChange(e: MediaQueryListEvent) { reducedMotion.value = e.matches }

onMounted(() => {
  motionMq = window.matchMedia('(prefers-reduced-motion: reduce)')
  reducedMotion.value = motionMq.matches
  motionMq.addEventListener('change', onMotionChange)
})

onUnmounted(() => {
  motionMq?.removeEventListener('change', onMotionChange)
})

// Capacitor initialization is now handled by platform utilities in the imports above
// The status bar, back button, network, and keyboard are all set up

router.beforeEach((to, from) => {
  // Initial page load — no animation
  if (!from.name) {
    transitionName.value = 'tab-switch'
    return
  }

  const toName = String(to.name ?? '')
  const fromName = String(from.name ?? '')

  // Auth flows — simple fade
  if (AUTH_ROUTES.has(toName) || AUTH_ROUTES.has(fromName) || reducedMotion.value) {
    transitionName.value = 'route-fade'
    return
  }

  const toDepth = ROUTE_DEPTH[toName] ?? 1
  const fromDepth = ROUTE_DEPTH[fromName] ?? 1

  // Root tab switch — instant
  if (toDepth === 0 && fromDepth === 0) {
    transitionName.value = 'tab-switch'
    return
  }

  // Push deeper → new page slides in from right
  // Pop back   → old page slides out to right
  transitionName.value = toDepth >= fromDepth ? 'slide-left' : 'slide-right'
})

// Reset scroll on push navigation so the new page starts at the top.
// beforeEach guard (in useScrollRestore) saves the position before this fires.
router.afterEach(() => {
  if (transitionName.value === 'slide-left' && mainRef.value) {
    mainRef.value.scrollTop = 0
  }
})

// ── App shell ───────────────────────────────────────────────────────────────

const documentTitle = computed(() => {
  const titleKey = typeof route.meta.titleKey === 'string' ? route.meta.titleKey : 'app.name'
  return `${t(titleKey)} · ${t('app.name')}`
})

watchEffect(() => {
  document.title = documentTitle.value
})
</script>

<template>
  <AppRoot>
    <AppPage>
      <AppShell>
        <!-- Main content area with RouterView -->
        <RouterView v-slot="{ Component }">
          <Transition :name="transitionName" mode="out-in">
            <component :is="Component" :key="route.path" />
          </Transition>
        </RouterView>
      </AppShell>
    </AppPage>
  </AppRoot>
</template>

<style scoped>
/* Ensure AppShell fills the page container */
:deep(.app-shell-main) {
  padding-top: 44px;
  padding-bottom: 56px;
}
</style>
