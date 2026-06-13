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

// Capacitor App utilities
export {
  initCapacitorStatusBar,
  initCapacitorBackButton,
  isNativePlatform,
  getPlatform,
  exitApp,
  setStatusBarStyle,
  setStatusBarOverlaysWebView,
  type Style,
} from './capacitorApp'

// Capacitor Keyboard utilities
export {
  initKeyboard,
  useKeyboardHeight,
  isKeyboardVisible,
  getKeyboardHeight,
  hideKeyboard,
  showKeyboard,
  setAccessoryBarVisible,
} from './capacitorKeyboard'

// Capacitor Network utilities
export {
  initNetwork,
  useNetworkStatus,
  getIsOnline,
  getOnlineRef,
  getNetworkStatus,
  type ConnectionType,
} from './capacitorNetwork'
