<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  f7Navbar,
  f7NavLeft,
  f7NavRight,
  f7NavTitle,
  f7Link,
} from 'framework7-vue'
import { useI18n } from '@/i18n'
import { useLargeTitle } from '@/composables/useLargeTitle'
import { useNativeUiProfile } from '@/platform/nativeUiProfile'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { largeTitleVisible } = useLargeTitle()
const nativeUiProfile = useNativeUiProfile()

const AUTH_ROUTES = new Set(['signin', 'signup', 'welcome', 'experience', 'auth-callback'])
const ROOT_ROUTES = new Set(['home', 'explore', 'messages', 'notifications', 'profile'])

const show = computed(() => !AUTH_ROUTES.has(String(route.name)))
const showBack = computed(() => !ROOT_ROUTES.has(String(route.name)) && show.value)

// On the Home route, suppress the inline navbar title while the large title
// in HomeView is still visible (IntersectionObserver drives largeTitleVisible).
const title = computed(() => {
  if (route.name === 'home') return largeTitleVisible.value ? '' : 'memory.'
  const key = typeof route.meta.titleKey === 'string' ? route.meta.titleKey : 'app.name'
  return t(key)
})

// Determine icon for back button based on theme
const backIcon = computed(() => {
  // iOS theme uses chevron_back, MD/theme uses arrow_back
  return nativeUiProfile.theme === 'ios' ? 'chevron_back' : 'arrow_back'
})

function handleBack() {
  router.back()
}
</script>

<template>
  <f7Navbar v-if="show" no-shadow no-hairline>
    <!-- Left: Back button -->
    <template #left>
      <f7Link
        v-if="showBack"
        icon-only
        :icon="backIcon"
        @click="handleBack"
        class="app-topbar-back-link"
      />
    </template>

    <!-- Center: Title -->
    <f7NavTitle :title="title" class="app-topbar-title" />
  </f7Navbar>
</template>

<style scoped>
/*
 * Ensure navbar matches the existing styling from Konsta.
 * Framework7 navbar needs customization to match the app's design system.
 */
:deep(.navbar) {
  --f7-navbar-height: 44px;
  --f7-navbar-bg-color: transparent;
  --f7-navbar-border-color: transparent;
  --f7-navbar-text-color: var(--color-primary, #000);
  --f7-navbar-title-text-color: var(--color-primary, #000);
  background: transparent;
  height: 44px;
  min-height: 44px;
}

/* Custom back link styling to match Konsta behavior */
.app-topbar-back-link {
  --f7-link-color: var(--color-primary, #000);
  --f7-icon-size: 24px;
  --f7-icon-color: var(--color-primary, #000);
  cursor: pointer;
  padding: 0 12px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Title styling */
:deep(.navbar-title) {
  font-family: var(--font-family);
  font-size: var(--text-size-large);
  font-weight: 600;
  color: var(--color-primary, #000);
  text-align: center;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Ensure proper layout */
:deep(.navbar-inner) {
  height: 100%;
  padding: 0;
}

:deep(.navbar-inner:before) {
  content: none;
}

/* Nav center positioning */
:deep(.navbar-center) {
  position: absolute;
  left: 0;
  right: 0;
  pointer-events: none;
}

/* Respect safe areas */
:deep(.navbar:after) {
  content: none;
}
</style>

