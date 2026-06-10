/**
 * Haptic Policy
 * 
 * Industry-standard haptic feedback for mobile web apps.
 * Provides consistent, accessible, and safe haptic feedback across platforms.
 * 
 * Security considerations:
 * - All haptic calls are wrapped in try-catch
 * - Capability checks prevent errors on unsupported platforms
 * - Exponential backoff for rate limiting
 * - No user data collected or logged
 */

import { ref, computed, onUnmounted, type Ref } from 'vue'
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { getNativeUiProfile } from './nativeUiProfile'

// Re-export types for convenience
export { ImpactStyle, NotificationType }

/**
 * Haptic feedback types with intensity levels
 */
export interface HapticOptions {
  // Impact feedback style (iOS)
  impactStyle?: ImpactStyle
  
  // Notification feedback type (iOS)
  notificationType?: NotificationType
  
  // Vibration duration in ms (Android/Web)
  duration?: number
  
  // Vibration pattern (Android)
  pattern?: number[]
}

/**
 * Rate limiting configuration to prevent excessive haptics
 */
const RATE_LIMIT_CONFIG = {
  // Maximum haptics per second
  maxPerSecond: 10,
  
  // Cooldown period after hitting limit (ms)
  cooldownMs: 1000,
  
  // Exponential backoff base
  backoffBase: 2,
  
  // Maximum backoff time (ms)
  maxBackoffMs: 5000,
}

/**
 * Rate limiter state
 */
let lastHapticTime = 0
let consecutiveFailures = 0
let isInCooldown = false
let cooldownEndTime = 0

/**
 * Check if haptics are currently rate limited
 */
function isRateLimited(): boolean {
  const now = Date.now()
  
  // Check if we're in cooldown period
  if (isInCooldown && now < cooldownEndTime) {
    return true
  }
  
  // Reset cooldown if expired
  if (isInCooldown && now >= cooldownEndTime) {
    isInCooldown = false
    consecutiveFailures = 0
  }
  
  // Check rate limit (max per second)
  const timeSinceLast = now - lastHapticTime
  if (timeSinceLast < 1000 / RATE_LIMIT_CONFIG.maxPerSecond) {
    return true
  }
  
  return false
}

/**
 * Record a haptic feedback attempt
 */
function recordHapticAttempt(success: boolean) {
  const now = Date.now()
  lastHapticTime = now
  
  if (!success) {
    consecutiveFailures++
    
    // Enter cooldown if we hit failure threshold
    if (consecutiveFailures >= 3) {
      isInCooldown = true
      cooldownEndTime = now + Math.min(
        RATE_LIMIT_CONFIG.cooldownMs * Math.pow(
          RATE_LIMIT_CONFIG.backoffBase,
          consecutiveFailures - 3
        ),
        RATE_LIMIT_CONFIG.maxBackoffMs
      )
    }
  } else {
    // Reset on success
    consecutiveFailures = 0
  }
}

/**
 * Check if haptics are available on this platform
 */
export function hasHaptics(): boolean {
  // Check Capacitor native
  if (Capacitor.isNativePlatform()) {
    return true
  }
  
  // Check Web Vibration API
  if ('vibrate' in navigator) {
    return true
  }
  
  return false
}

/**
 * Impact feedback - for discrete user interactions
 * 
 * Usage:
 * - Button presses
 * - Toggle switches
 * - Tab changes
 * - Selection confirmations
 */
export function impact(
  style: ImpactStyle = ImpactStyle.Light,
  options?: HapticOptions
): Promise<void> {
  // Check rate limiting
  if (isRateLimited()) {
    return Promise.resolve()
  }
  
  return new Promise((resolve, reject) => {
    try {
      // Capacitor native haptics
      if (Capacitor.isNativePlatform()) {
        Haptics.impact({ style })
          .then(() => {
            recordHapticAttempt(true)
            resolve()
          })
          .catch(error => {
            recordHapticAttempt(false)
            // Silently fail - haptics are non-critical
            resolve()
          })
        return
      }
      
      // Web Vibration API fallback
      if ('vibrate' in navigator) {
        const duration = options?.duration || getDurationForImpactStyle(style)
        const pattern = options?.pattern || [duration]
        
        navigator.vibrate(pattern)
          .then(() => {
            recordHapticAttempt(true)
            resolve()
          })
          .catch(error => {
            recordHapticAttempt(false)
            resolve()
          })
        return
      }
      
      // No haptics available
      recordHapticAttempt(false)
      resolve()
    } catch (error) {
      recordHapticAttempt(false)
      resolve()
    }
  })
}

/**
 * Notification feedback - for system notifications and alerts
 * 
 * Usage:
 * - Success/error notifications
 * - Warning alerts
 * - System events
 */
export function notification(
  type: NotificationType = NotificationType.Success,
  options?: HapticOptions
): Promise<void> {
  // Check rate limiting
  if (isRateLimited()) {
    return Promise.resolve()
  }
  
  return new Promise((resolve) => {
    try {
      // Capacitor native haptics
      if (Capacitor.isNativePlatform()) {
        Haptics.notification({ type })
          .then(() => {
            recordHapticAttempt(true)
            resolve()
          })
          .catch(() => {
            recordHapticAttempt(false)
            resolve()
          })
        return
      }
      
      // Web Vibration API fallback
      if ('vibrate' in navigator) {
        const duration = options?.duration || getDurationForNotificationType(type)
        const pattern = options?.pattern || [duration]
        
        navigator.vibrate(pattern)
          .then(() => {
            recordHapticAttempt(true)
            resolve()
          })
          .catch(() => {
            recordHapticAttempt(false)
            resolve()
          })
        return
      }
      
      // No haptics available
      recordHapticAttempt(false)
      resolve()
    } catch {
      recordHapticAttempt(false)
      resolve()
    }
  })
}

/**
 * Selection changed feedback - for selection changes
 * 
 * Usage:
 * - List item selection
 * - Picker value changes
 * - Text selection changes
 */
export function selectionChanged(options?: HapticOptions): Promise<void> {
  return notification(NotificationType.SelectionChanged, options)
}

/**
 * Vibration feedback - for custom vibration patterns
 * 
 * Usage:
 * - Custom feedback patterns
 * - Game-like feedback
 * - Complex interactions
 */
export function vibrate(
  pattern: number[],
  options?: HapticOptions
): Promise<void> {
  // Check rate limiting
  if (isRateLimited()) {
    return Promise.resolve()
  }
  
  return new Promise((resolve) => {
    try {
      // Capacitor native haptics don't support custom patterns
      if (Capacitor.isNativePlatform()) {
        // Fall back to impact feedback
        Haptics.impact({ style: ImpactStyle.Heavy })
          .then(() => {
            recordHapticAttempt(true)
            resolve()
          })
          .catch(() => {
            recordHapticAttempt(false)
            resolve()
          })
        return
      }
      
      // Web Vibration API
      if ('vibrate' in navigator) {
        navigator.vibrate(pattern)
          .then(() => {
            recordHapticAttempt(true)
            resolve()
          })
          .catch(() => {
            recordHapticAttempt(false)
            resolve()
          })
        return
      }
      
      // No haptics available
      recordHapticAttempt(false)
      resolve()
    } catch {
      recordHapticAttempt(false)
      resolve()
    }
  })
}

/**
 * Stop all vibration
 */
export function stopVibration(): void {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate(0).catch(() => {})
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Map impact style to vibration duration (ms)
 */
function getDurationForImpactStyle(style: ImpactStyle): number {
  switch (style) {
    case ImpactStyle.Light:
      return 10
    case ImpactStyle.Medium:
      return 20
    case ImpactStyle.Heavy:
      return 40
    default:
      return 20
  }
}

/**
 * Map notification type to vibration duration (ms)
 */
function getDurationForNotificationType(type: NotificationType): number {
  switch (type) {
    case NotificationType.Success:
    case NotificationType.Warning:
    case NotificationType.Error:
      return 40
    case NotificationType.SelectionChanged:
      return 10
    default:
      return 20
  }
}

/**
 * Haptic feedback levels for semantic actions
 */
export const HapticLevel = {
  // Subtle feedback for lightweight interactions
  Light: { impact: ImpactStyle.Light, duration: 10 },
  
  // Standard feedback for typical interactions
  Medium: { impact: ImpactStyle.Medium, duration: 20 },
  
  // Strong feedback for important interactions
  Heavy: { impact: ImpactStyle.Heavy, duration: 40 },
  
  // Success notification
  Success: { notification: NotificationType.Success, duration: 40 },
  
  // Warning notification
  Warning: { notification: NotificationType.Warning, duration: 40 },
  
  // Error notification
  Error: { notification: NotificationType.Error, duration: 60 },
  
  // Selection changed
  Selection: { notification: NotificationType.SelectionChanged, duration: 10 },
} as const

/**
 * Semantic haptic feedback functions
 * 
 * Usage guidelines:
 * - useHaptics().light() - Button presses, list item taps
 * - useHaptics().medium() - Toggle switches, tab changes
 * - useHaptics().heavy() - Destructive actions, confirmations
 * - useHaptics().success() - Success notifications
 * - useHaptics().warning() - Warning notifications
 * - useHaptics().error() - Error notifications
 */
export function useHaptics() {
  return {
    // Capability check
    available: computed(() => getNativeUiProfile().hasHaptics),
    
    // Impact feedback with semantic levels
    light: (options?: HapticOptions) => impact(ImpactStyle.Light, options),
    medium: (options?: HapticOptions) => impact(ImpactStyle.Medium, options),
    heavy: (options?: HapticOptions) => impact(ImpactStyle.Heavy, options),
    
    // Raw impact with style
    impact: (style: ImpactStyle = ImpactStyle.Light, options?: HapticOptions) => impact(style, options),
    
    // Notification feedback
    success: (options?: HapticOptions) => notification(NotificationType.Success, options),
    warning: (options?: HapticOptions) => notification(NotificationType.Warning, options),
    error: (options?: HapticOptions) => notification(NotificationType.Error, options),
    notify: (type: NotificationType = NotificationType.Success, options?: HapticOptions) => notification(type, options),
    
    // Selection feedback
    selectionChanged: (options?: HapticOptions) => selectionChanged(options),
    
    // Custom vibration
    vibrate: (pattern: number[], options?: HapticOptions) => vibrate(pattern, options),
    
    // Stop vibration
    stop: () => stopVibration(),
  }
}

/**
 * Create a haptic context for a specific component
 * Handles rate limiting at the component level
 */
export function createHapticContext() {
  let lastHapticTime = 0
  const MIN_INTERVAL = 100 // Minimum 100ms between haptics
  
  return {
    light: () => {
      const now = Date.now()
      if (now - lastHapticTime >= MIN_INTERVAL) {
        lastHapticTime = now
        return impact(ImpactStyle.Light)
      }
      return Promise.resolve()
    },
    
    medium: () => {
      const now = Date.now()
      if (now - lastHapticTime >= MIN_INTERVAL) {
        lastHapticTime = now
        return impact(ImpactStyle.Medium)
      }
      return Promise.resolve()
    },
    
    heavy: () => {
      const now = Date.now()
      if (now - lastHapticTime >= MIN_INTERVAL) {
        lastHapticTime = now
        return impact(ImpactStyle.Heavy)
      }
      return Promise.resolve()
    },
    
    reset: () => {
      lastHapticTime = 0
    },
  }
}

/**
 * Reset the global rate limiter
 * Useful for testing or after page navigation
 */
export function resetHapticRateLimiter(): void {
  lastHapticTime = 0
  consecutiveFailures = 0
  isInCooldown = false
  cooldownEndTime = 0
}

// Auto-reset on page navigation
if (typeof window !== 'undefined') {
  window.addEventListener('pageshow', resetHapticRateLimiter)
  window.addEventListener('beforeunload', resetHapticRateLimiter)
}
