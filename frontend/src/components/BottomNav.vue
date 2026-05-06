<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '@/i18n'
import { useNotificationsStore } from '@/stores/notificationsStore'
import AppIcon from '@/components/AppIcon.vue'
import type { IconName } from '@/components/AppIcon.types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const notificationsStore = useNotificationsStore()

const hiddenRoutes = new Set(['signin', 'signup', 'welcome', 'experience'])
const show = computed(() => !hiddenRoutes.has(String(route.name)) && !route.path.startsWith('/dashboard'))

interface NavItem { name: string; route: string; label: string; icon: IconName }

const items = computed<NavItem[]>(() => [
  { name: 'home',          route: '/',              label: t('nav.home'),          icon: 'home'          },
  { name: 'explore',       route: '/explore',       label: t('nav.explore'),       icon: 'explore'       },
  { name: 'messages',      route: '/messages',      label: t('nav.messages'),      icon: 'messages'      },
  { name: 'notifications', route: '/notifications', label: t('nav.notifications'), icon: 'notifications' },
  { name: 'dashboard',     route: '/dashboard',     label: 'Dashboard',            icon: 'dashboard'     },
])

function isActive(item: NavItem): boolean {
  if (item.name === 'home') return route.path === '/'
  return route.path.startsWith(item.route)
}

function navigate(item: NavItem) {
  router.push(item.route).catch(() => {/* route may not exist yet */})
}
</script>

<template>
  <nav
    v-if="show"
    class="fixed bottom-0 inset-x-0 z-50 flex items-center justify-around px-4 pb-safe"
    style="background: rgba(250,247,243,0.92); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-top: 1px solid rgba(55,55,55,0.08); height: 72px;"
  >
    <button
      v-for="item in items"
      :key="item.name"
      type="button"
      class="flex items-center justify-center w-12 h-12 rounded-2xl transition-colors"
      :style="isActive(item) ? 'background: rgba(99,100,246,0.15);' : ''"
      :aria-label="item.label"
      @click="navigate(item)"
    >
      <span class="relative inline-flex items-center justify-center">
        <AppIcon
          :name="item.icon"
          :size="20"
          :color="isActive(item) ? 'rgb(99,100,246)' : 'rgba(55,55,55,0.5)'"
        />
        <span
          v-if="item.name === 'notifications' && notificationsStore.totalUnreadCount > 0"
          class="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full bg-red-500 text-white font-bold leading-none"
          style="min-width: 16px; height: 16px; font-size: 10px; padding: 0 3px;"
          aria-label="unread notifications"
        >{{ notificationsStore.totalUnreadCount > 99 ? '99+' : notificationsStore.totalUnreadCount }}</span>
      </span>
    </button>
  </nav>
</template>
