import { Capacitor } from '@capacitor/core'

export type NativePlatform = 'ios' | 'android' | 'macos' | 'windows' | 'linux' | 'desktop' | 'unknown'

export type NativeUiEnvironment = 'capacitor-native' | 'pwa-installed' | 'browser'

export interface NativeUiProfile {
  // Platform detection
  platform: NativePlatform
  os: NativePlatform
  
  // Environment detection
  environment: NativeUiEnvironment
  
  // Input method
  isTouchPrimary: boolean
  isMobile: boolean
  
  // Installation state
  isStandalone: boolean
  
  // User preferences
  prefersReducedMotion: boolean
  prefersColorScheme: 'light' | 'dark' | 'auto'
  
  // Native capabilities
  hasHaptics: boolean
  hasKeyboardPlugin: boolean
  hasNativeShare: boolean
  hasFileShare: boolean
  hasBadging: boolean
  hasNotifications: boolean
  hasInstallPrompt: boolean
  hasSafeAreaSupport: boolean
  hasPushNotifications: boolean
  hasLocalNotifications: boolean
  
  // Pointer characteristics
  hasCoarsePointer: boolean
  hasFinePointer: boolean
  
  // Framework7 theme mapping
  theme: 'ios' | 'md' | 'auto'
}

interface UserAgentDataLike {
  platform?: string
  mobile?: boolean
}

function getUserAgentData(): UserAgentDataLike | undefined {
  return (navigator as Navigator & { userAgentData?: UserAgentDataLike }).userAgentData
}

/**
 * Detect the OS/platform with comprehensive detection including iPadOS
 * Priority: Capacitor > userAgentData > userAgent > platform
 */
function detectOs(): NativePlatform {
  // Check Capacitor first for native platforms
  if (Capacitor.isNativePlatform()) {
    const platform = Capacitor.getPlatform()
    if (platform === 'ios') return 'ios'
    if (platform === 'android') return 'android'
  }
  
  const userAgentData = getUserAgentData()
  const platform = userAgentData?.platform || navigator.platform || ''
  const userAgent = navigator.userAgent || ''
  const touchPoints = navigator.maxTouchPoints || 0

  // iOS detection (including iPad, iPhone, iPod)
  // iPad can report Mac-like platform, so check touch points
  if (/iPad|iPhone|iPod/i.test(userAgent)) return 'ios'
  if (/Mac/i.test(platform) && touchPoints > 1) return 'ios'
  
  // Android detection
  if (/android/i.test(userAgent.toLowerCase()) || /android/i.test(platform.toLowerCase())) return 'android'
  
  // macOS detection
  if (/Mac/i.test(platform) && touchPoints <= 1) return 'macos'
  
  // Windows detection
  if (/Win/i.test(platform)) return 'windows'
  
  // Linux detection
  if (/Linux/i.test(platform)) return 'linux'
  
  // If we couldn't determine, return unknown
  return 'unknown'
}

/**
 * Map OS to NativePlatform for simpler classification
 */
function getPlatformFromOs(os: NativePlatform): NativePlatform {
  switch (os) {
    case 'ios':
      return 'ios'
    case 'android':
      return 'android'
    case 'macos':
    case 'windows':
    case 'linux':
    case 'unknown':
      return 'desktop'
    default:
      return 'desktop'
  }
}

/**
 * Detect the UI environment (native app, installed PWA, or browser)
 */
function detectEnvironment(): NativeUiEnvironment {
  // Check if running in Capacitor native context
  if (Capacitor.isNativePlatform()) {
    return 'capacitor-native'
  }
  
  // Check for standalone/PWA mode
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
  const os = detectOs()
  
  // On mobile platforms, assume touch is primary
  if (os === 'ios' || os === 'android') return true
  
  // Check for touch support
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  
  if (!hasTouch) return false
  
  // Check for pointer type - if we have fine pointer, it's likely not touch-primary
  const hasFinePointer = window.matchMedia('(pointer: fine)').matches
  const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches
  
  if (hasFinePointer && !hasCoarsePointer) {
    return false
  }
  
  return hasTouch
}

/**
 * Detect if running in mobile environment
 */
function detectIsMobile(): boolean {
  const userAgentData = getUserAgentData()
  const os = detectOs()
  
  // Mobile OS are always mobile
  if (os === 'ios' || os === 'android') return true
  
  // Check userAgentData mobile hint
  if (userAgentData?.mobile) return true
  
  // Additional user agent checks for mobile browsers
  const userAgent = navigator.userAgent || ''
  if (/Mobile|Android|iP(hone|od|ad)|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(userAgent)) {
    return true
  }
  
  return false
}

/**
 * Check for standalone display mode
 */
function detectStandalone(): boolean {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }
  return (
    navigatorWithStandalone.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  )
}

/**
 * Check for reduced motion preference
 */
function detectReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Check for color scheme preference
 */
function detectColorScheme(): 'light' | 'dark' | 'auto' {
  const darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
  const lightMode = window.matchMedia('(prefers-color-scheme: light)').matches
  
  if (darkMode) return 'dark'
  if (lightMode) return 'light'
  return 'auto'
}

/**
 * Check for coarse pointer (touch)
 */
function detectCoarsePointer(): boolean {
  return window.matchMedia('(pointer: coarse)').matches
}

/**
 * Check for fine pointer (mouse)
 */
function detectFinePointer(): boolean {
  return window.matchMedia('(pointer: fine)').matches
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
  
  // Check for Web Vibration API
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
 * Check for file share capability
 */
function detectFileShare(): boolean {
  if (!('canShare' in navigator)) return false
  
  try {
    const file = new File([''], 'memory.txt', { type: 'text/plain' })
    return navigator.canShare?.({ files: [file] }) === true
  } catch {
    return false
  }
}

/**
 * Check for badging support (app badge)
 */
function detectBadgingSupport(): boolean {
  return 'setAppBadge' in navigator && 'clearAppBadge' in navigator
}

/**
 * Check for notifications support
 */
function detectNotificationsSupport(): boolean {
  return 'Notification' in window
}

/**
 * Check for install prompt support
 */
function detectInstallPromptSupport(os: NativePlatform): boolean {
  return os === 'android' || os === 'windows' || os === 'linux' || os === 'macos'
}

/**
 * Check for push notification support
 */
function detectPushNotificationSupport(): boolean {
  return 'PushManager' in window
}

/**
 * Check for local notification support (via service worker or Capacitor)
 */
function detectLocalNotificationSupport(): boolean {
  if ('Notification' in window && 'serviceWorker' in navigator) {
    return true
  }
  
  try {
    // @ts-ignore - Check if LocalNotifications plugin is available
    const LocalNotifications = Capacitor.Plugins.LocalNotifications
    if (LocalNotifications && typeof LocalNotifications.schedule === 'function') {
      return true
    }
  } catch {
    // LocalNotifications plugin not available
  }
  
  return false
}

/**
 * Check for safe area support
 */
function detectSafeAreaSupport(): boolean {
  if (typeof window !== 'undefined' && window.CSS && window.CSS.supports) {
    return window.CSS.supports('padding-top', 'env(safe-area-inset-top)')
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
    case 'macos':
    case 'windows':
    case 'linux':
    case 'desktop':
    case 'unknown':
      return 'auto'
    default:
      return 'auto'
  }
}

/**
 * Get the complete native UI profile
 */
export function getNativeUiProfile(): NativeUiProfile {
  const os = detectOs()
  const platform = getPlatformFromOs(os)
  const environment = detectEnvironment()
  const isTouchPrimary = detectTouchPrimary()
  const isMobile = detectIsMobile()
  const isStandalone = detectStandalone()
  const prefersReducedMotion = detectReducedMotion()
  const prefersColorScheme = detectColorScheme()
  const hasHaptics = detectHaptics()
  const hasKeyboardPlugin = detectKeyboardPlugin()
  const hasNativeShare = detectNativeShare()
  const hasFileShare = detectFileShare()
  const hasBadging = detectBadgingSupport()
  const hasNotifications = detectNotificationsSupport()
  const hasInstallPrompt = detectInstallPromptSupport(os)
  const hasPushNotifications = detectPushNotificationSupport()
  const hasLocalNotifications = detectLocalNotificationSupport()
  const hasSafeAreaSupport = detectSafeAreaSupport()
  const hasCoarsePointer = detectCoarsePointer()
  const hasFinePointer = detectFinePointer()
  const theme = getFramework7Theme(platform)
  
  return {
    platform,
    os,
    environment,
    isTouchPrimary,
    isMobile,
    isStandalone,
    prefersReducedMotion,
    prefersColorScheme,
    hasHaptics,
    hasKeyboardPlugin,
    hasNativeShare,
    hasFileShare,
    hasBadging,
    hasNotifications,
    hasInstallPrompt,
    hasSafeAreaSupport,
    hasPushNotifications,
    hasLocalNotifications,
    hasCoarsePointer,
    hasFinePointer,
    theme
  }
}

/**
 * Get platform capabilities (backwards compatibility with capabilities.ts)
 */
export interface PlatformCapabilities {
  os: NativePlatform
  isMobile: boolean
  isStandalone: boolean
  supportsBadging: boolean
  supportsShare: boolean
  supportsFileShare: boolean
  supportsNotifications: boolean
  supportsInstallPrompt: boolean
}

export function getPlatformCapabilities(): PlatformCapabilities {
  const profile = getNativeUiProfile()
  
  return {
    os: profile.os,
    isMobile: profile.isMobile,
    isStandalone: profile.isStandalone,
    supportsBadging: profile.hasBadging,
    supportsShare: profile.hasNativeShare,
    supportsFileShare: profile.hasFileShare,
    supportsNotifications: profile.hasNotifications,
    supportsInstallPrompt: profile.hasInstallPrompt
  }
}

/**
 * Apply platform capabilities to DOM (backwards compatibility with capabilities.ts)
 */
export function applyPlatformCapabilities(): PlatformCapabilities {
  const capabilities = getPlatformCapabilities()
  const root = document.documentElement

  root.dataset.platformOs = capabilities.os
  root.dataset.platformMobile = String(capabilities.isMobile)
  root.dataset.platformStandalone = String(capabilities.isStandalone)
  root.classList.add(`platform-${capabilities.os}`)
  root.classList.toggle('platform-mobile', capabilities.isMobile)
  root.classList.toggle('platform-standalone', capabilities.isStandalone)

  return capabilities
}

export type PlatformOs = NativePlatform

/**
 * Reactive version for use in Vue components
 */
export function useNativeUiProfile() {
  const profile = getNativeUiProfile()
  
  const reducedMotionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  const colorSchemeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  
  const updateReducedMotion = () => {
    profile.prefersReducedMotion = reducedMotionMediaQuery.matches
  }
  
  const updateColorScheme = () => {
    profile.prefersColorScheme = colorSchemeMediaQuery.matches ? 'dark' : 'light'
  }
  
  reducedMotionMediaQuery.addEventListener('change', updateReducedMotion)
  colorSchemeMediaQuery.addEventListener('change', updateColorScheme)
  
  return {
    ...profile,
    cleanup: () => {
      reducedMotionMediaQuery.removeEventListener('change', updateReducedMotion)
      colorSchemeMediaQuery.removeEventListener('change', updateColorScheme)
    }
  }
}

