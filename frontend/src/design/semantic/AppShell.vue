<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppNavbar from './AppNavbar.vue'
import AppToolbar from './AppToolbar.vue'

const route = useRoute()

const AUTH_ROUTES = new Set(['signin', 'signup', 'welcome', 'experience', 'auth-callback'])
const ROOT_ROUTES = new Set(['home', 'explore', 'messages', 'notifications', 'profile'])

// Show shell (navbar + tabbar) for non-auth routes
const showShell = computed(() => !AUTH_ROUTES.has(String(route.name)))

// Show back button for non-root, non-auth routes
const showBack = computed(() => !ROOT_ROUTES.has(String(route.name)) && showShell.value)

// For auth routes, just render content without shell chrome
const isAuthRoute = computed(() => AUTH_ROUTES.has(String(route.name)))
</script>

<template>
  <!-- Auth routes: full-screen, no shell chrome -->
  <div v-if="isAuthRoute" class="flex flex-col h-full">
    <slot />
  </div>
  
  <!-- Non-auth routes: full shell with navbar and tabbar -->
  <div v-else class="flex flex-col h-full">
    <!-- Shell header with navbar -->
    <AppNavbar
      :show-back="showBack"
      class="app-shell-topbar"
    />
    
    <!-- Main content area -->
    <main class="app-shell-main min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-(--padding-main)">
      <slot />
    </main>
    
    <!-- Shell footer with tabbar -->
    <AppToolbar
      position="bottom"
      class="app-shell-tabbar"
    />
  </div>
</template>

<style scoped>
/* Shell layout - ensure navbar and toolbar work within flex container */
.app-shell-topbar {
  flex: 0 0 auto;
  width: 100%;
}

.app-shell-main {
  /* Account for navbar height at top */
  padding-top: 44px;
  /* Account for toolbar height at bottom */
  padding-bottom: 56px;
}

.app-shell-tabbar {
  flex: 0 0 auto;
  width: 100%;
}
</style>
