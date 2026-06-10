/**
 * Platform Policies and Utilities
 * 
 * Exports all platform-specific functionality for consistent use across the app.
 */

// Native UI Profile
export {
  getNativeUiProfile,
  useNativeUiProfile,
  type NativePlatform,
  type NativeUiEnvironment,
  type NativeUiProfile,
} from './nativeUiProfile'

// Keyboard Policy
export {
  useKeyboard,
  getKeyboardConfig,
  getInputAttributes,
  hideKeyboard,
  showKeyboard,
  focusAndShowKeyboard,
  KEYBOARD_PRESETS,
  type KeyboardConfig,
} from './keyboardPolicy'

// Safe Area Policy
export {
  useSafeArea,
  getSafeAreaInsetsFromCSS,
  getSafeAreaInsetsWithKeyboard,
  injectSafeAreaStyles,
  hasNotch,
  getSafeAreaPaddingInline,
  useSafeAreaBottom,
  type SafeAreaInsets,
} from './safeAreaPolicy'

// Haptic Policy
export {
  useHaptics,
  hasHaptics,
  impact,
  notification,
  selectionChanged,
  vibrate,
  stopVibration,
  createHapticContext,
  resetHapticRateLimiter,
  HapticLevel,
  ImpactStyle,
  NotificationType,
  type HapticOptions,
} from './hapticPolicy'

// Re-export platform capabilities from nativeUiProfile for backwards compatibility
export {
  getPlatformCapabilities,
  applyPlatformCapabilities,
  type PlatformCapabilities,
  type PlatformOs,
} from './nativeUiProfile'
