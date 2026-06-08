/**
 * Safe Area Policy
 * 
 * Industry-standard safe area handling for mobile web apps.
 * Ensures content is not obscured by notches, rounded corners, or system UI.
 * 
 * Security considerations:
 * - No dynamic code evaluation
 * - Safe DOM access with null checks
 * - CSS-only approach where possible (no runtime calculations)
 * - Proper unit handling (px, rem, etc.)
 */

import { computed, ref, onMounted, onUnmounted } from 'vue'
import { Capacitor } from '@capacitor/core'
import { useNativeUiProfile } from './nativeUiProfile'
import { useKeyboard } from './keyboardPolicy'

/**
 * Safe area insets configuration
 * All values in pixels (px) for precision
 */
export interface SafeAreaInsets {
  top: number
  right: number
  bottom: number
  left: number
}

/**
 * Default safe area insets for different environments
 * These are fallback values when CSS env() is not available
 */
const DEFAULT_INSETS: Record<string, SafeAreaInsets> = {
  // Default for desktop/browser
  browser: { top: 0, right: 0, bottom: 0, left: 0 },
  
  // iOS with notch (iPhone X and later)
  iosNotch: { top: 44, right: 0, bottom: 34, left: 0 },
  
  // iOS without notch (older iPhones)
  iosClassic: { top: 20, right: 0, bottom: 0, left: 0 },
  
  // Android with gesture navigation
  androidGesture: { top: 0, right: 0, bottom: 0, left: 0 },
  
  // Android with buttons
  androidButtons: { top: 0, right: 0, bottom: 0, left: 0 },
}

/**
 * Get safe area insets from CSS environment variables
 * This is the preferred method as it uses the browser's own safe area detection
 */
export function getSafeAreaInsetsFromCSS(): SafeAreaInsets {
  if (typeof window === 'undefined' || !window.getComputedStyle) {
    return { top: 0, right: 0, bottom: 0, left: 0 }
  }
  
  try {
    const root = document.documentElement
    const style = window.getComputedStyle(root)
    
    return {
      top: parseFloat(style.getPropertyValue('env(safe-area-inset-top)')) || 0,
      right: parseFloat(style.getPropertyValue('env(safe-area-inset-right)')) || 0,
      bottom: parseFloat(style.getPropertyValue('env(safe-area-inset-bottom)')) || 0,
      left: parseFloat(style.getPropertyValue('env(safe-area-inset-left)')) || 0,
    }
  } catch {
    return { top: 0, right: 0, bottom: 0, left: 0 }
  }
}

/**
 * Get safe area insets with keyboard consideration
 */
export function getSafeAreaInsetsWithKeyboard(): SafeAreaInsets {
  const cssInsets = getSafeAreaInsetsFromCSS()
  const { keyboardHeight, isKeyboardOpen } = useKeyboard()
  
  // When keyboard is open, adjust bottom inset
  const bottom = isKeyboardOpen.value && keyboardHeight.value > 0
    ? Math.max(cssInsets.bottom, keyboardHeight.value)
    : cssInsets.bottom
  
  return {
    ...cssInsets,
    bottom,
  }
}

/**
 * Reactive safe area insets for Vue components
 */
export function useSafeArea() {
  const nativeUiProfile = useNativeUiProfile()
  const { keyboardHeight, isKeyboardOpen } = useKeyboard()
  const insets = ref<SafeAreaInsets>(getSafeAreaInsetsFromCSS())
  
  // Update insets on keyboard state change
  onMounted(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      // Listen for viewport changes (orientation, etc.)
      const mediaQuery = window.matchMedia('(max-width: 1024px)')
      const updateInsets = () => {
        insets.value = getSafeAreaInsetsFromCSS()
      }
      
      mediaQuery.addEventListener('change', updateInsets)
      onUnmounted(() => mediaQuery.removeEventListener('change', updateInsets))
      
      // Initial update
      updateInsets()
    }
  })
  
  // Computed insets with keyboard consideration
  const insetsWithKeyboard = computed<SafeAreaInsets>(() => {
    const keyboardAdjustment = isKeyboardOpen.value && keyboardHeight.value > 0
      ? keyboardHeight.value
      : 0
    
    return {
      top: insets.value.top,
      right: insets.value.right,
      bottom: Math.max(insets.value.bottom, keyboardAdjustment),
      left: insets.value.left,
    }
  })
  
  // CSS string representations
  const css = computed(() => ({
    top: `${insetsWithKeyboard.value.top}px`,
    right: `${insetsWithKeyboard.value.right}px`,
    bottom: `${insetsWithKeyboard.value.bottom}px`,
    left: `${insetsWithKeyboard.value.left}px`,
  }))
  
  // Total padding for each edge
  const padding = computed(() => ({
    top: `${insetsWithKeyboard.value.top}px`,
    right: `${insetsWithKeyboard.value.right}px`,
    bottom: `${insetsWithKeyboard.value.bottom}px`,
    left: `${insetsWithKeyboard.value.left}px`,
  }))
  
  // Safe area classes for Tailwind
  const classes = computed(() => ({
    top: `pt-[${insetsWithKeyboard.value.top}px]`,
    right: `pr-[${insetsWithKeyboard.value.right}px]`,
    bottom: `pb-[${insetsWithKeyboard.value.bottom}px]`,
    left: `pl-[${insetsWithKeyboard.value.left}px]`,
  }))
  
  return {
    insets: insetsWithKeyboard,
    css,
    padding,
    classes,
    // Convenience getters
    top: computed(() => insetsWithKeyboard.value.top),
    right: computed(() => insetsWithKeyboard.value.right),
    bottom: computed(() => insetsWithKeyboard.value.bottom),
    left: computed(() => insetsWithKeyboard.value.left),
    // Total height available for content
    contentHeight: computed(() => {
      const totalHeight = typeof window !== 'undefined' ? window.innerHeight : 0
      return totalHeight - insetsWithKeyboard.value.top - insetsWithKeyboard.value.bottom
    }),
  }
}

/**
 * CSS custom properties for safe area
 * These should be injected into the document head or via a style tag
 */
export function injectSafeAreaStyles() {
  if (typeof document === 'undefined') return
  
  const styleId = 'safe-area-styles'
  if (document.getElementById(styleId)) return
  
  const style = document.createElement('style')
  style.id = styleId
  style.textContent = `
    @supports (top: env(safe-area-inset-top)) {
      .safe-area-top { top: env(safe-area-inset-top) !important; }
      .safe-area-right { right: env(safe-area-inset-right) !important; }
      .safe-area-bottom { bottom: env(safe-area-inset-bottom) !important; }
      .safe-area-left { left: env(safe-area-inset-left) !important; }
      
      .safe-area-pt { padding-top: env(safe-area-inset-top) !important; }
      .safe-area-pr { padding-right: env(safe-area-inset-right) !important; }
      .safe-area-pb { padding-bottom: env(safe-area-inset-bottom) !important; }
      .safe-area-pl { padding-left: env(safe-area-inset-left) !important; }
      
      .safe-area-inset-all {
        top: env(safe-area-inset-top);
        right: env(safe-area-inset-right);
        bottom: env(safe-area-inset-bottom);
        left: env(safe-area-inset-left);
      }
    }
    
    /* Fallback for browsers without safe-area support */
    .safe-area-top { top: 0 !important; }
    .safe-area-right { right: 0 !important; }
    .safe-area-bottom { bottom: 0 !important; }
    .safe-area-left { left: 0 !important; }
    
    .safe-area-pt { padding-top: 0 !important; }
    .safe-area-pr { padding-right: 0 !important; }
    .safe-area-pb { padding-bottom: 0 !important; }
    .safe-area-pl { padding-left: 0 !important; }
  `
  
  document.head.appendChild(style)
}

/**
 * Check if the device has a notch or rounded corners
 */
export function hasNotch(): boolean {
  if (typeof window === 'undefined') return false
  
  // iOS 11+ with safe-area support
  if (window.matchMedia('(min-width: 375px) and (min-height: 812px)').matches) return true
  if (window.matchMedia('(min-width: 414px) and (min-height: 896px)').matches) return true
  if (window.matchMedia('(min-width: 390px) and (min-height: 844px)').matches) return true
  if (window.matchMedia('(min-width: 393px) and (min-height: 852px)').matches) return true
  
  // Android with cutout
  if (window.matchMedia('(min-width: 360px) and (max-width: 720px)').matches) {
    // Many Android devices have notches
    return true
  }
  
  // Check for CSS safe-area support
  if (window.matchMedia('(top: env(safe-area-inset-top))').matches) {
    const insets = getSafeAreaInsetsFromCSS()
    return insets.top > 0 || insets.bottom > 0
  }
  
  return false
}

/**
 * Get safe area padding as a CSS string for inline styles
 */
export function getSafeAreaPaddingInline(extraPadding: number = 0): string {
  const insets = getSafeAreaInsetsFromCSS()
  const bottom = Math.max(insets.bottom, extraPadding)
  return `${insets.top}px ${insets.right}px ${bottom}px ${insets.left}px`
}

/**
 * Safe area bottom padding that accounts for both safe area and keyboard
 */
export function useSafeAreaBottom() {
  const { bottom: safeAreaBottom } = useSafeArea()
  const { keyboardHeight, isKeyboardOpen } = useKeyboard()
  
  return computed(() => {
    if (isKeyboardOpen.value && keyboardHeight.value > 0) {
      return keyboardHeight.value
    }
    return safeAreaBottom.value
  })
}
