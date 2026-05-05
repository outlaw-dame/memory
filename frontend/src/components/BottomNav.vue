<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '@/i18n'
import { useNotificationsStore } from '@/stores/notificationsStore'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const notificationsStore = useNotificationsStore()

const hiddenRoutes = new Set(['signin', 'signup', 'welcome', 'experience'])
// Hide bottom nav entirely on dashboard routes (they have their own sidebar)
const show = computed(() => !hiddenRoutes.has(String(route.name)) && !route.path.startsWith('/dashboard'))

interface NavItem { name: string; route: string; label: string }
const items = computed<NavItem[]>(() => [
  { name: 'home', route: '/', label: t('nav.home') },
  { name: 'explore', route: '/explore', label: t('nav.explore') },
  { name: 'messages', route: '/messages', label: t('nav.messages') },
  { name: 'notifications', route: '/notifications', label: t('nav.notifications') },
  { name: 'dashboard', route: '/dashboard', label: 'Dashboard' },
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
      <!-- Home -->
      <svg v-if="item.name === 'home'" class="w-5 h-5" :style="isActive(item) ? 'color:rgb(99,100,246)' : 'color:rgba(55,55,55,0.5)'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
      <!-- Explore / globe -->
      <svg v-else-if="item.name === 'explore'" class="w-5 h-5" :style="isActive(item) ? 'color:rgb(99,100,246)' : 'color:rgba(55,55,55,0.5)'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
      </svg>
      <!-- Messages -->
      <svg v-else-if="item.name === 'messages'" class="w-5 h-5" :style="isActive(item) ? 'color:rgb(99,100,246)' : 'color:rgba(55,55,55,0.5)'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
      <!-- Notifications / bell -->
      <span v-else-if="item.name === 'notifications'" class="relative inline-flex items-center justify-center w-5 h-5">
        <svg class="w-5 h-5" :style="isActive(item) ? 'color:rgb(99,100,246)' : 'color:rgba(55,55,55,0.5)'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        <span
          v-if="notificationsStore.totalUnreadCount > 0"
          class="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full bg-red-500 text-white font-bold leading-none"
          style="min-width: 16px; height: 16px; font-size: 10px; padding: 0 3px;"
          aria-label="unread notifications"
        >{{ notificationsStore.totalUnreadCount > 99 ? '99+' : notificationsStore.totalUnreadCount }}</span>
      </span>
      <!-- Profile -->
      <svg v-else-if="item.name === 'profile'" class="w-5 h-5" :style="isActive(item) ? 'color:rgb(99,100,246)' : 'color:rgba(55,55,55,0.5)'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
      <!-- Dashboard / grid -->
      <svg v-else-if="item.name === 'dashboard'" class="w-5 h-5" :style="isActive(item) ? 'color:rgb(99,100,246)' : 'color:rgba(55,55,55,0.5)'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    </button>
  </nav>
</template>
