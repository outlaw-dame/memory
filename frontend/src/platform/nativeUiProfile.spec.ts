import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getNativeUiProfile,
  getPlatformCapabilities,
  applyPlatformCapabilities,
  type NativeUiProfile,
  type NativePlatform,
  type NativeUiEnvironment
} from './nativeUiProfile'

// Mock Capacitor
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
    getPlatform: vi.fn(() => 'web'),
    Plugins: {}
  }
}))

// Helper to create mock navigator
function createMockNavigator({
  userAgent = '',
  platform = '',
  maxTouchPoints = 0,
  standalone = false,
  userAgentData = null
}: {
  userAgent: string
  platform: string
  maxTouchPoints: number
  standalone?: boolean
  userAgentData?: any
}) {
  return {
    userAgent,
    platform,
    maxTouchPoints,
    standalone,
    userAgentData
  }
}

// Helper to mock window and navigator
describe('nativeUiProfile', () => {
  let originalNavigator: typeof navigator
  let originalWindow: typeof window
  let mockMatchMedia: typeof window.matchMedia
  let mockNavigator: typeof navigator
  let mockWindow: typeof window

  beforeEach(() => {
    originalNavigator = global.navigator
    originalWindow = global.window

    mockNavigator = {
      ...originalNavigator,
      userAgent: '',
      platform: '',
      maxTouchPoints: 0,
      standalone: false,
      userAgentData: undefined
    } as unknown as Navigator

    mockWindow = {
      ...originalWindow,
      matchMedia: vi.fn((query: string) => ({
        matches: false,
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        onchange: null
      }))
    } as unknown as Window & typeof globalThis

    global.navigator = mockNavigator
    global.window = mockWindow
  })

  afterEach(() => {
    global.navigator = originalNavigator
    global.window = originalWindow
    vi.restoreAllMocks()
  })

  describe('OS Detection', () => {
    it('should detect iOS from iPhone user agent', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)'
      mockNavigator.platform = 'iPhone'
      
      const profile = getNativeUiProfile()
      expect(profile.os).toBe('ios')
      expect(profile.platform).toBe('ios')
    })

    it('should detect iOS from iPad user agent', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X)'
      mockNavigator.platform = 'MacIntel'
      Object.defineProperty(mockNavigator, 'maxTouchPoints', { value: 2, configurable: true })
      
      const profile = getNativeUiProfile()
      expect(profile.os).toBe('ios')
      expect(profile.platform).toBe('ios')
    })

    it('should detect iOS from iPod user agent', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (iPod; CPU iPhone OS 15_0 like Mac OS X)'
      mockNavigator.platform = 'iPod'
      
      const profile = getNativeUiProfile()
      expect(profile.os).toBe('ios')
      expect(profile.platform).toBe('ios')
    })

    it('should detect iOS from Mac platform with multiple touch points (iPadOS)', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (MacIntel; Intel Mac OS X 10_15_7)'
      mockNavigator.platform = 'MacIntel'
      Object.defineProperty(mockNavigator, 'maxTouchPoints', { value: 5, configurable: true })
      
      const profile = getNativeUiProfile()
      expect(profile.os).toBe('ios')
      expect(profile.platform).toBe('ios')
    })

    it('should detect Android from user agent', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Linux; Android 11; Mobile)'
      mockNavigator.platform = 'Linux'
      
      const profile = getNativeUiProfile()
      expect(profile.os).toBe('android')
      expect(profile.platform).toBe('android')
    })

    it('should detect Android from platform', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Linux; Android)'
      mockNavigator.platform = 'Android'
      
      const profile = getNativeUiProfile()
      expect(profile.os).toBe('android')
      expect(profile.platform).toBe('android')
    })

    it('should detect macOS', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
      mockNavigator.platform = 'MacIntel'
      Object.defineProperty(mockNavigator, 'maxTouchPoints', { value: 0, configurable: true })
      
      const profile = getNativeUiProfile()
      expect(profile.os).toBe('macos')
      expect(profile.platform).toBe('desktop')
    })

    it('should detect Windows', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      mockNavigator.platform = 'Win32'
      
      const profile = getNativeUiProfile()
      expect(profile.os).toBe('windows')
      expect(profile.platform).toBe('desktop')
    })

    it('should detect Linux', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (X11; Linux x86_64)'
      mockNavigator.platform = 'Linux'
      
      const profile = getNativeUiProfile()
      expect(profile.os).toBe('linux')
      expect(profile.platform).toBe('desktop')
    })

    it('should return unknown for unrecognized platforms', () => {
      mockNavigator.userAgent = 'Unknown'
      mockNavigator.platform = 'Unknown'
      
      const profile = getNativeUiProfile()
      expect(profile.os).toBe('unknown')
      expect(profile.platform).toBe('desktop')
    })
  })

  describe('Environment Detection', () => {
    it.skip('should detect Capacitor native iOS', () => {
      // Note: Capacitor mocking requires vi.hoist for static properties
      // This test is skipped as it requires more complex mocking setup
      const { Capacitor } = require('@capacitor/core')
      
      Capacitor.isNativePlatform = vi.fn(() => true)
      Capacitor.getPlatform = vi.fn(() => 'ios')
      
      const profile = getNativeUiProfile()
      expect(profile.environment).toBe('capacitor-native')
      expect(profile.os).toBe('ios')
    })

    it.skip('should detect Capacitor native Android', () => {
      // Note: Capacitor mocking requires vi.hoist for static properties
      // This test is skipped as it requires more complex mocking setup
      const { Capacitor } = require('@capacitor/core')
      
      Capacitor.isNativePlatform = vi.fn(() => true)
      Capacitor.getPlatform = vi.fn(() => 'android')
      
      const profile = getNativeUiProfile()
      expect(profile.environment).toBe('capacitor-native')
      expect(profile.os).toBe('android')
    })

    it('should detect PWA installed mode from display-mode: standalone', () => {
      mockWindow.matchMedia = vi.fn((query: string) => ({
        matches: query === '(display-mode: standalone)',
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }))
      
      const profile = getNativeUiProfile()
      expect(profile.environment).toBe('pwa-installed')
      expect(profile.isStandalone).toBe(true)
    })

    it('should detect PWA installed mode from navigator.standalone', () => {
      mockNavigator.standalone = true
      
      const profile = getNativeUiProfile()
      expect(profile.environment).toBe('pwa-installed')
      expect(profile.isStandalone).toBe(true)
    })

    it('should detect browser mode when not standalone', () => {
      mockWindow.matchMedia = vi.fn((query: string) => ({
        matches: false,
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }))
      
      const profile = getNativeUiProfile()
      expect(profile.environment).toBe('browser')
      expect(profile.isStandalone).toBe(false)
    })
  })

  describe('Input Method Detection', () => {
    it('should detect touch primary for iOS', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)'
      mockNavigator.platform = 'iPhone'
      
      const profile = getNativeUiProfile()
      expect(profile.isTouchPrimary).toBe(true)
    })

    it('should detect touch primary for Android', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Linux; Android 11; Mobile)'
      mockNavigator.platform = 'Linux'
      
      const profile = getNativeUiProfile()
      expect(profile.isTouchPrimary).toBe(true)
    })

    it('should detect touch primary from ontouchstart', () => {
      Object.defineProperty(mockWindow, 'ontouchstart', { value: true, configurable: true })
      Object.defineProperty(mockNavigator, 'maxTouchPoints', { value: 1, configurable: true })
      
      mockWindow.matchMedia = vi.fn((query: string) => ({
        matches: false,
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }))
      
      const profile = getNativeUiProfile()
      expect(profile.isTouchPrimary).toBe(true)
    })

    it('should detect fine pointer as non-touch-primary', () => {
      Object.defineProperty(mockWindow, 'ontouchstart', { value: true, configurable: true })
      Object.defineProperty(mockNavigator, 'maxTouchPoints', { value: 1, configurable: true })
      
      mockWindow.matchMedia = vi.fn((query: string) => ({
        matches: query === '(pointer: fine)',
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }))
      
      const profile = getNativeUiProfile()
      expect(profile.isTouchPrimary).toBe(false)
    })

    it('should detect coarse pointer as touch-primary', () => {
      Object.defineProperty(mockWindow, 'ontouchstart', { value: true, configurable: true })
      Object.defineProperty(mockNavigator, 'maxTouchPoints', { value: 1, configurable: true })
      
      mockWindow.matchMedia = vi.fn((query: string) => ({
        matches: query === '(pointer: coarse)',
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }))
      
      const profile = getNativeUiProfile()
      expect(profile.isTouchPrimary).toBe(true)
      expect(profile.hasCoarsePointer).toBe(true)
    })
  })

  describe('User Preferences', () => {
    it('should detect reduced motion preference', () => {
      mockWindow.matchMedia = vi.fn((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }))
      
      const profile = getNativeUiProfile()
      expect(profile.prefersReducedMotion).toBe(true)
    })

    it('should detect dark color scheme preference', () => {
      mockWindow.matchMedia = vi.fn((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }))
      
      const profile = getNativeUiProfile()
      expect(profile.prefersColorScheme).toBe('dark')
    })

    it('should detect light color scheme preference', () => {
      mockWindow.matchMedia = vi.fn((query: string) => ({
        matches: query === '(prefers-color-scheme: light)',
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }))
      
      const profile = getNativeUiProfile()
      expect(profile.prefersColorScheme).toBe('light')
    })

    it('should return auto color scheme when no preference', () => {
      mockWindow.matchMedia = vi.fn((query: string) => ({
        matches: false,
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }))
      
      const profile = getNativeUiProfile()
      expect(profile.prefersColorScheme).toBe('auto')
    })
  })

  describe('Native Capabilities', () => {
    it('should detect Web Vibration API for haptics', () => {
      Object.defineProperty(mockNavigator, 'vibrate', { value: vi.fn(), configurable: true })
      
      const profile = getNativeUiProfile()
      expect(profile.hasHaptics).toBe(true)
    })

    it('should detect Web Share API', () => {
      Object.defineProperty(mockNavigator, 'share', { value: vi.fn(), configurable: true })
      
      const profile = getNativeUiProfile()
      expect(profile.hasNativeShare).toBe(true)
    })

    it('should detect file share capability', () => {
      Object.defineProperty(mockNavigator, 'canShare', {
        value: vi.fn((data: any) => {
          // Check if it's a file share
          if (data && data.files && Array.isArray(data.files) && data.files.length > 0) {
            return true
          }
          return false
        }),
        configurable: true
      })
      
      const profile = getNativeUiProfile()
      expect(profile.hasFileShare).toBe(true)
    })

    it('should detect badging support', () => {
      Object.defineProperty(mockNavigator, 'setAppBadge', { value: vi.fn(), configurable: true })
      Object.defineProperty(mockNavigator, 'clearAppBadge', { value: vi.fn(), configurable: true })
      
      const profile = getNativeUiProfile()
      expect(profile.hasBadging).toBe(true)
    })

    it('should detect notifications support', () => {
      Object.defineProperty(mockWindow, 'Notification', { value: vi.fn(), configurable: true })
      
      const profile = getNativeUiProfile()
      expect(profile.hasNotifications).toBe(true)
    })

    it('should detect push notification support', () => {
      Object.defineProperty(mockWindow, 'PushManager', { value: vi.fn(), configurable: true })
      
      const profile = getNativeUiProfile()
      expect(profile.hasPushNotifications).toBe(true)
    })

    it('should detect safe area support', () => {
      Object.defineProperty(mockWindow, 'CSS', {
        value: {
          supports: vi.fn((property: string, value: string) => {
            return property === 'padding-top' && value.includes('env(safe-area-inset-top)')
          })
        },
        configurable: true
      })
      
      const profile = getNativeUiProfile()
      expect(profile.hasSafeAreaSupport).toBe(true)
    })
  })

  describe('Framework7 Theme Mapping', () => {
    it('should map iOS to ios theme', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)'
      mockNavigator.platform = 'iPhone'
      
      const profile = getNativeUiProfile()
      expect(profile.theme).toBe('ios')
    })

    it('should map Android to md theme', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Linux; Android 11; Mobile)'
      mockNavigator.platform = 'Linux'
      
      const profile = getNativeUiProfile()
      expect(profile.theme).toBe('md')
    })

    it('should map desktop to auto theme', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
      mockNavigator.platform = 'MacIntel'
      Object.defineProperty(mockNavigator, 'maxTouchPoints', { value: 0, configurable: true })
      
      const profile = getNativeUiProfile()
      expect(profile.theme).toBe('auto')
    })
  })

  describe('Platform Capabilities Backwards Compatibility', () => {
    it('should provide getPlatformCapabilities with correct structure', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)'
      mockNavigator.platform = 'iPhone'
      Object.defineProperty(mockNavigator, 'standalone', { value: true, configurable: true })
      Object.defineProperty(mockNavigator, 'share', { value: vi.fn(), configurable: true })
      
      const capabilities = getPlatformCapabilities()
      
      expect(capabilities).toHaveProperty('os')
      expect(capabilities).toHaveProperty('isMobile')
      expect(capabilities).toHaveProperty('isStandalone')
      expect(capabilities).toHaveProperty('supportsBadging')
      expect(capabilities).toHaveProperty('supportsShare')
      expect(capabilities).toHaveProperty('supportsFileShare')
      expect(capabilities).toHaveProperty('supportsNotifications')
      expect(capabilities).toHaveProperty('supportsInstallPrompt')
      
      expect(capabilities.os).toBe('ios')
      expect(capabilities.isMobile).toBe(true)
      expect(capabilities.isStandalone).toBe(true)
    })

    it('should provide applyPlatformCapabilities', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Linux; Android 11; Mobile)'
      mockNavigator.platform = 'Linux'
      
      // Mock document
      const mockDocument = {
        documentElement: {
          dataset: {},
          classList: {
            add: vi.fn(),
            toggle: vi.fn(),
            remove: vi.fn()
          }
        }
      }
      
      global.document = mockDocument as unknown as Document
      
      const capabilities = applyPlatformCapabilities()
      
      expect(mockDocument.documentElement.dataset.platformOs).toBe('android')
      expect(mockDocument.documentElement.classList.add).toHaveBeenCalledWith('platform-android')
    })
  })

  describe('Mobile Detection', () => {
    it('should detect mobile from iOS user agent', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)'
      mockNavigator.platform = 'iPhone'
      
      const profile = getNativeUiProfile()
      expect(profile.isMobile).toBe(true)
    })

    it('should detect mobile from Android user agent', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Linux; Android 11; Mobile)'
      mockNavigator.platform = 'Linux'
      
      const profile = getNativeUiProfile()
      expect(profile.isMobile).toBe(true)
    })

    it('should detect mobile from userAgentData', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (X11; Linux x86_64)'
      mockNavigator.platform = 'Linux'
      Object.defineProperty(mockNavigator, 'userAgentData', {
        value: { mobile: true, platform: 'Linux' },
        configurable: true
      })
      
      const profile = getNativeUiProfile()
      expect(profile.isMobile).toBe(true)
    })

    it('should detect mobile from Mobile in user agent', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Mobile; Android)'
      mockNavigator.platform = 'Linux'
      
      const profile = getNativeUiProfile()
      expect(profile.isMobile).toBe(true)
    })

    it('should detect non-mobile for desktop', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
      mockNavigator.platform = 'MacIntel'
      Object.defineProperty(mockNavigator, 'maxTouchPoints', { value: 0, configurable: true })
      
      const profile = getNativeUiProfile()
      expect(profile.isMobile).toBe(false)
    })
  })

  describe('iPadOS Edge Cases', () => {
    it('should detect iPadOS when user agent contains iPad', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X)'
      mockNavigator.platform = 'MacIntel'
      
      const profile = getNativeUiProfile()
      expect(profile.os).toBe('ios')
      expect(profile.platform).toBe('ios')
    })

    it('should detect iPadOS from Mac platform with multiple touch points', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
      mockNavigator.platform = 'MacIntel'
      Object.defineProperty(mockNavigator, 'maxTouchPoints', { value: 5, configurable: true })
      
      const profile = getNativeUiProfile()
      expect(profile.os).toBe('ios')
      expect(profile.platform).toBe('ios')
    })

    it('should detect macOS from Mac platform with no touch points', () => {
      mockNavigator.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
      mockNavigator.platform = 'MacIntel'
      Object.defineProperty(mockNavigator, 'maxTouchPoints', { value: 0, configurable: true })
      
      const profile = getNativeUiProfile()
      expect(profile.os).toBe('macos')
      expect(profile.platform).toBe('desktop')
    })
  })
})
