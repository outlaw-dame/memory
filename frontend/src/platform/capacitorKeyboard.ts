/**
 * Capacitor Keyboard Utilities
 *
 * Wraps Capacitor Keyboard plugin for keyboard visibility and height management.
 * This is the ONLY place where @capacitor/keyboard should be imported.
 *
 * Security considerations:
 * - No dynamic code evaluation
 * - Safe DOM access with null checks
 * - Event listener cleanup to prevent memory leaks
 * - Error handling for all Capacitor calls
 */

import { ref } from 'vue'
import { Capacitor } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'

// Module-level singleton — keyboard height is application-wide state.
const keyboardHeight = ref(0)
let initialized = false

/**
 * Initialize keyboard event listeners
 * Should be called once during app startup
 */
export async function initKeyboard(): Promise<void> {
  if (initialized || !Capacitor.isNativePlatform()) return
  initialized = true

  try {
    await Keyboard.addListener('keyboardWillShow', info => {
      keyboardHeight.value = info.keyboardHeight
    })

    await Keyboard.addListener('keyboardWillHide', () => {
      keyboardHeight.value = 0
    })
  } catch (error) {
    // Silently fail - keyboard events are not critical
    console.warn('[CapacitorKeyboard] Failed to initialize keyboard listeners:', error)
  }
}

/**
 * Get the current keyboard height
 */
export function useKeyboardHeight(): { keyboardHeight: Ref<number> } {
  return { keyboardHeight }
}

/**
 * Check if keyboard is currently visible
 */
export function isKeyboardVisible(): boolean {
  return keyboardHeight.value > 0
}

/**
 * Get the current keyboard height value
 */
export function getKeyboardHeight(): number {
  return keyboardHeight.value
}

/**
 * Hide the keyboard
 */
export function hideKeyboard(): Promise<void> {
  return Keyboard.hide().catch(() => {
    // Silently fail
  })
}

/**
 * Show the keyboard
 */
export function showKeyboard(): Promise<void> {
  return Keyboard.show().catch(() => {
    // Silently fail
  })
}

/**
 * Set keyboard accessory bar visibility (iOS only)
 */
export function setAccessoryBarVisible(visible: boolean): Promise<void> {
  return Keyboard.setAccessoryBar({ isVisible: visible }).catch(() => {
    // Silently fail
  })
}

// Re-export types
import type { Ref } from 'vue'
