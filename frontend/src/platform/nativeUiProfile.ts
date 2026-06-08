import { Capacitor } from '@capacitor/core'

export type NativePlatform = 'ios' | 'android' | 'desktop'

export type NativeUiEnvironment = 'capacitor-native' | 'pwa-installed' | 'browser'

export interface NativeUiProfile {
  // Platform detection
  platform: NativePlatform
  
  // Environment detection
  environment: NativeUiEnvironment
  
  // Input method
  isTouchPrimary: boolean
  
  // Installation state
  isStandalone: boolean
  
  // User preferences
  prefersReducedMotion: boolean
  
  // Native capabilities
  hasHaptics: boolean
  hasKeyboardPlugin: boolean
  hasNativeShare: boolean
  
  // Framework7 theme mapping
  theme: 'ios' | 'md' | 'auto'
}

/**
 * Detect the native platform based on user agent and Capacitor
 */
function detectPlatform(): NativePlatform {
  // Check Capacitor first for native platforms
  if (Capacitor.isNativePlatform()) {
    const platform = Capacitor.getPlatform()
    if (platform === 'ios') return 'ios'
    if (platform === 'android') return 'android'
  }
  
  // Fallback to user agent detection for browser/PWA
  const userAgent = navigator.userAgent || ''
  const platform = navigator.platform || ''
  const touchPoints = navigator.maxTouchPoints || 0
  
  // iOS detection (including iPad, iPhone, iPod)
  if (/iPad|iPhone|iPod/i.test(userAgent)) return 'ios'
  // iPad on MacOS platform with touch points
  if (/Mac/i.test(platform) && touchPoints > 1) return 'ios'
  // Android detection
  if (/android/i.test(userAgent.toLowerCase()) || /android/i.test(platform.toLowerCase())) return 'android'
  
  // Desktop fallback
  return 'desktop'
}

/**
 * Detect the UI environment (native app, installed PWA, or browser)
 */
function detectEnvironment(): NativeUiEnvironment {
  // Check if running in Capacitor native context
  if (Capacitor.isNativePlatform()) {
    return 'capacitor-native'
  }
  
  // Check for standalone/PWA mode - safely check for window/navigator
  if (typeof window !== 'undefined') {
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }
    
    // Check if matchMedia is available
    if (window.matchMedia) {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      if (isStandalone || navigatorWithStandalone.standalone === true) {
        return 'pwa-installed'
      }
    } else if (navigatorWithStandalone.standalone === true) {
      return 'pwa-installed'
    }
  }
  
  return 'browser'
}

/**
 * Detect if touch is the primary input method
 */
function detectTouchPrimary(): boolean {
  // On mobile platforms, assume touch is primary
  const platform = detectPlatform()
  if (platform === 'ios' || platform === 'android') return true
  
  // Check for touch support
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  
  // Check for pointer fine (mouse) - if we have fine pointer, it's likely not touch-primary
  if ('pointerEnabled' in navigator || window.matchMedia('(pointer: fine)').matches) {
    const hasFinePointer = window.matchMedia('(pointer: fine)').matches
    const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches
    
    if (hasFinePointer && !hasCoarsePointer) {
      return false
    }
  }
  
  return hasTouch
}

/**
 * Check for reduced motion preference
 */
function detectReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Check for haptics availability
 */
function detectHaptics(): boolean {
  // Check Capacitor Haptics plugin
  try {
    // @ts-ignore - Check if Haptics plugin is available
    const Haptics = Capacitor.Plugins.Haptics
    if (Haptics && typeof Haptics.impact === 'function') {
      return true
    }
  } catch {
    // Haptics plugin not available
  }
  
  // Check for Web Haptics API (experimental)
  if ('vibrate' in navigator) {
    return true
  }
  
  return false
}

/**
 * Check for keyboard plugin availability
 */
function detectKeyboardPlugin(): boolean {
  // Check Capacitor Keyboard plugin
  try {
    // @ts-ignore - Check if Keyboard plugin is available
    const Keyboard = Capacitor.Plugins.Keyboard
    if (Keyboard && typeof Keyboard.show === 'function') {
      return true
    }
  } catch {
    // Keyboard plugin not available
  }
  
  return false
}

/**
 * Check for native share availability
 */
function detectNativeShare(): boolean {
  // Check for Web Share API
  if ('share' in navigator) {
    return true
  }
  
  // Check Capacitor Share plugin
  try {
    // @ts-ignore - Check if Share plugin is available
    const Share = Capacitor.Plugins.Share
    if (Share && typeof Share.share === 'function') {
      return true
    }
  } catch {
    // Share plugin not available
  }
  
  return false
}

/**
 * Map platform to Framework7 theme
 */
function getFramework7Theme(platform: NativePlatform): 'ios' | 'md' | 'auto' {
  switch (platform) {
    case 'ios':
      return 'ios'
    case 'android':
      return 'md'
    case 'desktop':
      // For desktop, use 'auto' which will let Framework7 decide based on user agent
      // or use a safe desktop mode
      return 'auto'
    default:
      return 'auto'
  }
}

/**
 * Get standalone detection result
 */
function detectStandalone(): boolean {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }
  return isStandalone || navigatorWithStandalone.standalone === true
}

/**
 * Get the complete native UI profile
 */
export function getNativeUiProfile(): NativeUiProfile {
  const platform = detectPlatform()
  const environment = detectEnvironment()
  const isTouchPrimary = detectTouchPrimary()
  const isStandalone = detectStandalone()
  const prefersReducedMotion = detectReducedMotion()
  const hasHaptics = detectHaptics()
  const hasKeyboardPlugin = detectKeyboardPlugin()
  const hasNativeShare = detectNativeShare()
  const theme = getFramework7Theme(platform)
  
  return {
    platform,
    environment,
    isTouchPrimary,
    isStandalone,
    prefersReducedMotion,
    hasHaptics,
    hasKeyboardPlugin,
    hasNativeShare,
    theme
  }
}

/**
 * Reactive version for use in Vue components
 */
export function useNativeUiProfile() {
  const profile = getNativeUiProfile()
  
  // Reduced motion can change during the session
  const reducedMotionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  const updateReducedMotion = () => {
    profile.prefersReducedMotion = reducedMotionMediaQuery.matches
  }
  
  reducedMotionMediaQuery.addEventListener('change', updateReducedMotion)
  
  return {
    ...profile,
    // Cleanup function
    cleanup: () => {
      reducedMotionMediaQuery.removeEventListener('change', updateReducedMotion)
    }
  }
}

