/**
 * Keyboard Policy
 * 
 * Industry-standard keyboard behavior for native mobile web apps.
 * Handles keyboard appearance, focus management, and safe area insets.
 * 
 * Security considerations:
 * - No dynamic code evaluation
 * - Safe DOM access with null checks
 * - Event listener cleanup to prevent memory leaks
 * - Input validation for all user-provided values
 */

import { ref, onMounted, onUnmounted, type Ref } from 'vue'
import { Capacitor } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'
import { useNativeUiProfile } from './nativeUiProfile'

export interface KeyboardConfig {
  // Keyboard type for mobile input
  type?: 'default' | 'ascii-capable' | 'decimal' | 'email' | 'numeric' | 'phone-pad' | 'search' | 'url'
  
  // Enter key hint for mobile keyboards
  enterKeyHint?: 'done' | 'enter' | 'go' | 'next' | 'previous' | 'search' | 'send'
  
  // Auto-capitalization behavior
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
  
  // Autocorrect behavior
  autoCorrect?: boolean
  
  // Spellcheck behavior
  spellCheck?: boolean
  
  // Autocomplete behavior
  autoComplete?: 'off' | 'on' | 'name' | 'email' | 'username' | 'password' | 'tel' | 'url' | 'address-line1' | 'address-line2' | 'city' | 'country' | 'postal-code'
  
  // Input mode for virtual keyboards
  inputMode?: 'text' | 'search' | 'email' | 'url' | 'numeric' | 'decimal' | 'tel' | 'password'
  
  // Whether to show keyboard accessory bar (iOS)
  showAccessoryBar?: boolean
  
  // Focus behavior
  autoFocus?: boolean
}

/**
 * Default keyboard configurations for common input types
 */
export const KEYBOARD_PRESETS: Record<string, KeyboardConfig> = {
  // Default text input
  text: {
    type: 'default',
    enterKeyHint: 'done',
    autoCapitalize: 'sentences',
    autoCorrect: true,
    spellCheck: true,
    autoComplete: 'on',
    inputMode: 'text',
  },
  
  // Search input - optimized for search queries
  search: {
    type: 'search',
    enterKeyHint: 'search',
    autoCapitalize: 'none',
    autoCorrect: false,
    spellCheck: false,
    autoComplete: 'off',
    inputMode: 'search',
  },
  
  // Email input
  email: {
    type: 'email',
    enterKeyHint: 'next',
    autoCapitalize: 'none',
    autoCorrect: false,
    spellCheck: false,
    autoComplete: 'email',
    inputMode: 'email',
  },
  
  // URL input
  url: {
    type: 'url',
    enterKeyHint: 'go',
    autoCapitalize: 'none',
    autoCorrect: false,
    spellCheck: false,
    autoComplete: 'url',
    inputMode: 'url',
  },
  
  // Numeric input
  numeric: {
    type: 'numeric',
    enterKeyHint: 'done',
    autoCapitalize: 'none',
    autoCorrect: false,
    spellCheck: false,
    autoComplete: 'off',
    inputMode: 'numeric',
  },
  
  // Phone input
  phone: {
    type: 'phone-pad',
    enterKeyHint: 'next',
    autoCapitalize: 'none',
    autoCorrect: false,
    spellCheck: false,
    autoComplete: 'tel',
    inputMode: 'tel',
  },
  
  // Password input
  password: {
    type: 'default',
    enterKeyHint: 'done',
    autoCapitalize: 'none',
    autoCorrect: false,
    spellCheck: false,
    autoComplete: 'current-password',
    inputMode: 'text',
  },
  
  // Username input
  username: {
    type: 'default',
    enterKeyHint: 'next',
    autoCapitalize: 'none',
    autoCorrect: false,
    spellCheck: false,
    autoComplete: 'username',
    inputMode: 'text',
  },
  
  // Composer/long text input
  composer: {
    type: 'default',
    enterKeyHint: 'default',
    autoCapitalize: 'sentences',
    autoCorrect: true,
    spellCheck: true,
    autoComplete: 'on',
    inputMode: 'text',
  },
  
  // Hashtag input
  hashtag: {
    type: 'default',
    enterKeyHint: 'done',
    autoCapitalize: 'none',
    autoCorrect: false,
    spellCheck: false,
    autoComplete: 'off',
    inputMode: 'text',
  },
  
  // Multiline text (textarea)
  multiline: {
    enterKeyHint: 'default',
    autoCapitalize: 'sentences',
    autoCorrect: true,
    spellCheck: true,
    autoComplete: 'on',
  },
}

/**
 * Get keyboard configuration for a specific input purpose
 */
export function getKeyboardConfig(purpose: keyof typeof KEYBOARD_PRESETS): KeyboardConfig {
  return { ...KEYBOARD_PRESETS.text, ...KEYBOARD_PRESETS[purpose] }
}

/**
 * Native keyboard state and management
 */
export function useKeyboard() {
  const nativeUiProfile = useNativeUiProfile()
  const isKeyboardOpen = ref(false)
  const keyboardHeight = ref(0)
  const focusedElement = ref<HTMLElement | null>(null)
  
  // Track keyboard height changes (Capacitor)
  function handleKeyboardHeightChange() {
    if (Capacitor.isNativePlatform()) {
      Keyboard.getInfo().then(info => {
        const height = info.keyboardHeight
        keyboardHeight.value = height
        isKeyboardOpen.value = height > 0
      }).catch(() => {
        // Keyboard plugin might not be available
        keyboardHeight.value = 0
        isKeyboardOpen.value = false
      })
    }
  }
  
  // Track focus changes
  function handleFocusIn(event: FocusEvent) {
    focusedElement.value = event.target as HTMLElement
    isKeyboardOpen.value = true
    if (Capacitor.isNativePlatform()) {
      handleKeyboardHeightChange()
    }
  }
  
  function handleFocusOut() {
    focusedElement.value = null
    isKeyboardOpen.value = false
  }
  
  // Scroll focused element into view when keyboard opens
  function scrollIntoView(element: HTMLElement | null, scrollEl?: HTMLElement | null) {
    if (!element || !scrollEl) return
    
    // Use requestAnimationFrame for smooth scrolling
    requestAnimationFrame(() => {
      const elementRect = element.getBoundingClientRect()
      const containerRect = scrollEl.getBoundingClientRect()
      
      // Calculate if element is hidden by keyboard
      const keyboardTop = window.innerHeight - keyboardHeight.value
      const elementBottom = elementRect.bottom
      
      if (elementBottom > keyboardTop) {
        // Element is hidden by keyboard, scroll it into view
        const scrollAmount = elementBottom - keyboardTop + 20 // +20px margin
        scrollEl.scrollBy({
          top: scrollAmount,
          left: 0,
          behavior: 'smooth',
        })
      }
      
      // Also ensure element is visible within container
      if (elementRect.top < containerRect.top) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else if (elementRect.bottom > containerRect.bottom) {
        element.scrollIntoView({ behavior: 'smooth', block: 'end' })
      }
    })
  }
  
  // Setup focus tracking
  onMounted(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('focusin', handleFocusIn as EventListener)
      window.addEventListener('focusout', handleFocusOut as EventListener)
      
      if (Capacitor.isNativePlatform()) {
        // Listen for keyboard height changes
        Keyboard.addListener('keyboardHeightWillChange', handleKeyboardHeightChange)
        Keyboard.addListener('keyboardDidShow', handleKeyboardHeightChange)
        Keyboard.addListener('keyboardDidHide', handleKeyboardHeightChange)
      }
    }
  })
  
  onUnmounted(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('focusin', handleFocusIn as EventListener)
      window.removeEventListener('focusout', handleFocusOut as EventListener)
      
      if (Capacitor.isNativePlatform()) {
        Keyboard.removeAllListeners().catch(() => {})
      }
    }
  })
  
  return {
    isKeyboardOpen,
    keyboardHeight,
    focusedElement,
    scrollIntoView,
    // Helper to get keyboard-safe bottom padding
    getSafeBottomPadding: () => {
      // Add extra padding when keyboard is open
      if (isKeyboardOpen.value && keyboardHeight.value > 0) {
        return keyboardHeight.value + 20 // 20px margin
      }
      // Default safe area padding
      return nativeUiProfile.isTouchPrimary ? 20 : 0
    },
    // Helper to check if we should adjust layout for keyboard
    shouldAdjustForKeyboard: () => {
      return isKeyboardOpen.value && keyboardHeight.value > 0
    },
  }
}

/**
 * Get input attributes for proper keyboard behavior
 * Sanitizes all values to prevent XSS
 */
export function getInputAttributes(config: KeyboardConfig): Record<string, string> {
  const attributes: Record<string, string> = {}
  
  // Sanitize and set attributes
  const sanitize = (value: string | undefined): string | undefined => {
    if (value === undefined) return undefined
    // Only allow alphanumeric, hyphens, and specific characters
    if (/^[a-zA-Z0-9\- _]+$/.test(value)) {
      return value
    }
    return undefined
  }
  
  if (config.autoCapitalize) {
    const value = sanitize(config.autoCapitalize)
    if (value) attributes.autocapitalize = value
  }
  
  if (config.autoComplete !== undefined) {
    const value = sanitize(config.autoComplete)
    if (value) attributes.autocomplete = value
  }
  
  if (config.autoCorrect !== undefined) {
    attributes.autocorrect = config.autoCorrect ? 'on' : 'off'
  }
  
  if (config.spellCheck !== undefined) {
    attributes.spellcheck = config.spellCheck ? 'true' : 'false'
  }
  
  if (config.inputMode) {
    const value = sanitize(config.inputMode)
    if (value) attributes.inputmode = value
  }
  
  if (config.enterKeyHint) {
    const value = sanitize(config.enterKeyHint)
    if (value) attributes.enterkeyhint = value
  }
  
  return attributes
}

/**
 * Hide the keyboard programmatically
 */
export async function hideKeyboard(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Keyboard.hide().catch(() => {})
  } else if (typeof document !== 'undefined') {
    // Blur the active element
    const activeElement = document.activeElement as HTMLElement | null
    activeElement?.blur?.()
  }
}

/**
 * Show the keyboard for a specific element
 */
export async function showKeyboard(element: HTMLElement): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Keyboard.show().catch(() => {})
  }
  element.focus()
}

/**
 * Focus an element and show keyboard
 */
export async function focusAndShowKeyboard(
  elementRef: Ref<HTMLElement | null>,
  options?: FocusOptions
): Promise<void> {
  const element = elementRef.value
  if (!element) return
  
  try {
    element.focus(options)
    if (Capacitor.isNativePlatform()) {
      await Keyboard.show().catch(() => {})
    }
  } catch (error) {
    console.error('[keyboardPolicy] Focus error:', error)
  }
}
