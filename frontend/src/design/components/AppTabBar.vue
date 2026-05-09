<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { kTabbar, kTabbarLink } from 'konsta/vue'
import { useI18n } from '@/i18n'
import { useNotificationsStore } from '@/stores/notificationsStore'
import { useHaptics, ImpactStyle } from '@/composables/useHaptics'
import AppIcon from '@/components/AppIcon.vue'
import type { IconName } from '@/components/AppIcon.types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const notificationsStore = useNotificationsStore()
const { impact } = useHaptics()

const HIDDEN_ROUTES = new Set(['signin', 'signup', 'welcome', 'experience', 'auth-callback'])
const show = computed(() => !HIDDEN_ROUTES.has(String(route.name)))

interface NavItem { name: string; route: string; label: string; icon: IconName }

const items = computed<NavItem[]>(() => [
  { name: 'home',          route: '/',              label: t('nav.home'),          icon: 'home'          },
  { name: 'explore',       route: '/explore',       label: t('nav.explore'),       icon: 'explore'       },
  { name: 'messages',      route: '/messages',      label: t('nav.messages'),      icon: 'messages'      },
  { name: 'notifications', route: '/notifications', label: t('nav.notifications'), icon: 'notifications' },
  { name: 'profile',       route: '/profile',       label: t('nav.profile'),       icon: 'profile'       },
])

function isActive(item: NavItem): boolean {
  if (item.name === 'home') return route.path === '/'
  return route.path.startsWith(item.route)
}

function navigate(item: NavItem) {
  impact(ImpactStyle.Light)
  router.push(item.route).catch(() => {})
}
</script>

<template>
  <kTabbar v-if="show" labels icons>
    <kTabbarLink
      v-for="item in items"
      :key="item.name"
      :active="isActive(item)"
      :label="item.label"
      component="button"
      :link-props="{ type: 'button' }"
      @click="navigate(item)"
    >
      <template #icon>
        <span class="relative inline-flex">
          <AppIcon :name="item.icon" :size="22" />
          <span
            v-if="item.name === 'notifications' && notificationsStore.totalUnreadCount > 0"
            class="absolute -top-1 -right-2 flex items-center justify-center rounded-full bg-red-500 text-white font-bold leading-none"
            style="min-width: 16px; height: 16px; font-size: 10px; padding: 0 3px;"
            aria-hidden="true"
          >{{ notificationsStore.totalUnreadCount > 99 ? '99+' : notificationsStore.totalUnreadCount }}</span>
        </span>
      </template>
    </kTabbarLink>
  </kTabbar>
</template>
