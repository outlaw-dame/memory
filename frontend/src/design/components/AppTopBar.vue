<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { kNavbar, kNavbarBackLink } from 'konsta/vue'
import { useI18n } from '@/i18n'
import { useLargeTitle } from '@/composables/useLargeTitle'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { largeTitleVisible } = useLargeTitle()

const AUTH_ROUTES = new Set(['signin', 'signup', 'welcome', 'experience', 'auth-callback'])
const ROOT_ROUTES = new Set(['home', 'explore', 'messages', 'notifications', 'profile'])

const show     = computed(() => !AUTH_ROUTES.has(String(route.name)))
const showBack = computed(() => !ROOT_ROUTES.has(String(route.name)) && show.value)

// On the Home route, suppress the inline navbar title while the large title
// in HomeView is still visible (IntersectionObserver drives largeTitleVisible).
const title = computed(() => {
  if (route.name === 'home') return largeTitleVisible.value ? '' : 'memory.'
  const key = typeof route.meta.titleKey === 'string' ? route.meta.titleKey : 'app.name'
  return t(key)
})
</script>

<template>
  <kNavbar v-if="show">
    <template v-if="showBack" #left>
      <kNavbarBackLink component="button" @click="router.back()" />
    </template>
    <template #title>
      <Transition name="topbar-title">
        <span :key="title" class="topbar-title-text">{{ title }}</span>
      </Transition>
    </template>
  </kNavbar>
</template>

<style scoped>
.topbar-title-enter-active,
.topbar-title-leave-active {
  transition: opacity 180ms ease;
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.topbar-title-enter-from,
.topbar-title-leave-to {
  opacity: 0;
}
</style>
