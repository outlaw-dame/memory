<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { f7Toolbar, f7Link } from 'framework7-vue'
import { useI18n } from '@/i18n'
import { useNotificationsStore } from '@/stores/notificationsStore'
import { useHaptics, ImpactStyle } from '@/platform/hapticPolicy'
import { useNativeUiProfile } from '@/platform/nativeUiProfile'
import AppIcon from '@/components/AppIcon.vue'
import type { AppIconName } from '@/components/AppIcon.types'

export interface AppToolbarProps {
  position?: 'top' | 'bottom'
}

const props = withDefaults(defineProps<AppToolbarProps>(), {
  position: 'bottom',
})

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const notificationsStore = useNotificationsStore()
const { impact } = useHaptics()
const nativeUiProfile = useNativeUiProfile()

const HIDDEN_ROUTES = new Set(['signin', 'signup', 'welcome', 'experience', 'auth-callback'])
const show = computed(() => !HIDDEN_ROUTES.has(String(route.name)))

interface NavItem { name: string; route: string; label: string; icon: AppIconName }

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
  // Safe navigation with error handling
  try {
    impact(ImpactStyle.Light).catch(() => {})
    router.push(item.route).catch(() => {})
  } catch (error) {
    console.error('[AppToolbar] Navigation error:', error)
  }
}

// Get icon fill state based on active state and theme
// Nav items only use icons that have filled variants: home, explore, messages, notifications, profile
function getIconName(item: NavItem): AppIconName {
  if (!isActive(item)) return item.icon
  
  // Type-safe mapping for nav icons only
  switch (item.icon) {
    case 'home': return 'home-filled'
    case 'explore': return 'explore-filled'
    case 'messages': return 'messages-filled'
    case 'notifications': return 'notifications-filled'
    case 'profile': return 'profile-filled'
    default: return item.icon
  }
}
</script>

<template>
  <f7Toolbar
    v-if="show"
    :no-shadow="true"
    :no-hairline="true"
    :position="position"
    class="app-tabbar"
  >
    <f7Link
      v-for="item in items"
      :key="item.name"
      :class="{ 'tab-link-active': isActive(item) }"
      icon-only
      @click="navigate(item)"
      class="app-tabbar-link"
    >
      <!-- Icon with badge -->
      <span class="relative inline-flex app-tabbar-icon-wrapper">
        <AppIcon :name="getIconName(item)" :size="22" />
        <span
          v-if="item.name === 'notifications' && notificationsStore.totalUnreadCount > 0"
          class="absolute -top-1 -right-2 flex items-center justify-center rounded-full bg-red-500 text-white font-bold leading-none"
          style="min-width: 16px; height: 16px; font-size: 10px; padding: 0 3px;"
          aria-hidden="true"
        >{{ notificationsStore.totalUnreadCount > 99 ? '99+' : notificationsStore.totalUnreadCount }}</span>
      </span>
      
      <!-- Label -->
      <span class="app-tabbar-label">{{ item.label }}</span>
    </f7Link>
  </f7Toolbar>
</template>

<style scoped>
/*
 * Customize Framework7 Toolbar to match Konsta Tabbar behavior
 * and the app's design system.
 */
:deep(.toolbar) {
  --f7-toolbar-height: 56px;
  --f7-toolbar-bg-color: var(--bg-color, #fff);
  --f7-toolbar-border-color: transparent;
  --f7-toolbar-text-color: var(--color-secondary, #666);
  --f7-toolbar-link-color: var(--color-secondary, #666);
  --f7-toolbar-link-active-color: var(--color-primary, #000);
  --f7-toolbar-link-highlight-bg-color: transparent;
  background: var(--bg-color, #fff);
  height: 56px;
  min-height: 56px;
  padding: 0 8px;
  display: flex;
  justify-content: space-around;
  align-items: center;
}

/* Toolbar inner customization */
:deep(.toolbar-inner) {
  height: 100%;
  padding: 0;
  display: flex;
  justify-content: space-around;
  align-items: center;
  gap: 0;
}

/* Individual tab link styling */
.app-tabbar-link {
  --f7-link-color: var(--color-secondary, #666);
  --f7-link-active-color: var(--color-primary, #000);
  --f7-link-highlight-bg-color: transparent;
  color: var(--color-secondary, #666);
  height: 100%;
  min-width: 64px;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 4px 8px;
  cursor: pointer;
}

.app-tabbar-link.tab-link-active {
  color: var(--color-primary, #000);
}

/* Icon wrapper */
.app-tabbar-icon-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Label styling */
.app-tabbar-label {
  font-family: var(--font-family);
  font-size: var(--text-size-small);
  font-weight: 500;
  color: inherit;
  text-align: center;
  line-height: 1;
}

/* Active state label color */
.app-tabbar-link.tab-link-active .app-tabbar-label {
  color: var(--color-primary, #000);
}

/* Remove default Framework7 hover effects */
:deep(.link-highlight) {
  display: none;
}

/* Safe area handling */
:deep(.toolbar:after) {
  content: none;
}

/* Add safe area padding at the bottom for devices with home indicator */
:deep(.toolbar) {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
</style>
