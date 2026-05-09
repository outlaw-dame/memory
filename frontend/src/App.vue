<script setup lang="ts">
import { computed, onMounted, watchEffect } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'
import { kApp } from 'konsta/vue'
import AppTopBar from '@/design/components/AppTopBar.vue'
import AppTabBar from '@/design/components/AppTabBar.vue'
import { useKonstaTheme } from '@/design/composables/useKonstaTheme'
import { useNetworkStatus } from '@/composables/useNetworkStatus'
import { useKeyboard } from '@/composables/useKeyboard'
import { useI18n } from '@/i18n'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const konstaTheme = useKonstaTheme()

// Initialize application-wide singletons
useNetworkStatus()
useKeyboard()

const AUTH_ROUTES = new Set(['signin', 'signup', 'welcome', 'experience', 'auth-callback'])
const isAuthRoute = computed(() => AUTH_ROUTES.has(String(route.name)))

const documentTitle = computed(() => {
  const titleKey = typeof route.meta.titleKey === 'string' ? route.meta.titleKey : 'app.name'
  return `${t(titleKey)} · ${t('app.name')}`
})

watchEffect(() => {
  document.title = documentTitle.value
})

onMounted(() => {
  if (!Capacitor.isNativePlatform()) return

  // Configure status bar for a full-bleed native feel
  StatusBar.setStyle({ style: Style.Light }).catch(() => {})
  StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {})

  // Handle Android hardware back button
  if (Capacitor.getPlatform() === 'android') {
    CapApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        router.back()
      } else {
        CapApp.exitApp()
      }
    }).catch(() => {})
  }
})
</script>

<template>
  <!--
    kApp sets the Konsta theme context (ios or material) for all child
    components. dark=false keeps Memory in its default light-mode palette.
    The flex-col + h-lvh layout gives us a three-row shell:
      top bar (shrink-0) / scrollable content (flex-1) / tab bar (shrink-0)
  -->
  <kApp
    :theme="konstaTheme"
    :dark="false"
    component="div"
    class="flex flex-col overflow-hidden bg-background h-lvh"
  >
    <!-- Auth routes: full-screen, no shell -->
    <RouterView v-if="isAuthRoute" class="flex-1" />

    <!-- App shell: top bar + scrollable content + tab bar -->
    <template v-else>
      <AppTopBar class="shrink-0" />
      <main class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-(--padding-main)">
        <RouterView />
      </main>
      <AppTabBar class="shrink-0" />
    </template>
  </kApp>
</template>
