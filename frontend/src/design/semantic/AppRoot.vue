<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, provide } from 'vue'
import { f7App, f7Views, f7View } from 'framework7-vue'
import { getNativeUiProfile } from '@/platform/nativeUiProfile'
import type { NativeUiProfile } from '@/platform/nativeUiProfile'
import type Framework7 from 'framework7'

export interface AppRootProps {
  // Allow explicit theme override (useful for testing)
  theme?: 'ios' | 'md' | 'auto'
}

const props = withDefaults(defineProps<AppRootProps>(), {
  theme: undefined
})

// Get the native UI profile for theme detection
const nativeUiProfile = ref(getNativeUiProfile())

// Use explicit prop if provided, otherwise fall back to detected theme
const effectiveTheme = computed(() => {
  return props.theme || nativeUiProfile.value.theme
})

// Framework7 app parameters - minimal configuration for now
const f7Params = computed(() => ({
  // Theme configuration
  theme: effectiveTheme.value,
  
  // Disable auto-dark mode for now to maintain consistency with Konsta
  dark: false,
  
  // Resize and layout behavior
  autoResize: true,
  
  // Touch behavior (respect reduced motion from profile)
  touch: {
    // Disable touch ripples if reduced motion is preferred
    ripple: !nativeUiProfile.value.prefersReducedMotion,
    // Use fast clicks for better performance
    fastClicks: true,
    // Disable active state for touch if reduced motion
    activeState: !nativeUiProfile.value.prefersReducedMotion
  },
  
  // Animation configuration (respect reduced motion)
  animate: !nativeUiProfile.value.prefersReducedMotion,
  
  // Dialog and popup defaults
  dialog: {
    animate: !nativeUiProfile.value.prefersReducedMotion,
  },
  
  // Page transition defaults
  pageTransition: {
    animate: !nativeUiProfile.value.prefersReducedMotion,
  },
  
  // Statusbar configuration (will be handled by existing Capacitor logic)
  statusbar: {
    overlay: false,
    iosOverlaysWebView: false,
  },
  
  // Allow swipe back navigation on touch devices
  swipeBack: nativeUiProfile.value.isTouchPrimary,
  
  // Allow panel swipe on touch devices
  panel: {
    swipe: nativeUiProfile.value.isTouchPrimary,
    animate: !nativeUiProfile.value.prefersReducedMotion,
  },
}))

// Handle reduced motion changes
let reducedMotionQuery: MediaQueryList | null = null

function handleReducedMotionChange(e: MediaQueryListEvent) {
  nativeUiProfile.value.prefersReducedMotion = e.matches
}

onMounted(() => {
  reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  reducedMotionQuery.addEventListener('change', handleReducedMotionChange)
})

onUnmounted(() => {
  reducedMotionQuery?.removeEventListener('change', handleReducedMotionChange)
})

// Provide the Framework7 app instance and profile to child components
const f7app = ref<InstanceType<typeof Framework7> | null>(null)

provide('f7app', f7app)
provide('nativeUiProfile', nativeUiProfile)
</script>

<template>
  <f7App ref="f7app" v-bind="f7Params">
    <!-- Default single view - this is where pages will be rendered -->
    <f7Views>
      <f7View main url="/">
        <!-- 
          The slot is where the existing App.vue content will be rendered.
          This preserves the current routing and layout structure while
          providing Framework7 context for components that need it.
        -->
        <slot />
      </f7View>
    </f7Views>
  </f7App>
</template>

<style scoped>
/* Ensure the Framework7 app fills the available space */
:deep(.framework7-root) {
  height: 100%;
  width: 100%;
  contain: layout size;
}
</style>