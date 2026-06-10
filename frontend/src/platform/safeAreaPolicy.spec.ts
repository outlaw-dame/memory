import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DEFAULT_INSETS, getSafeAreaInsetsFromCSS, type SafeAreaInsets } from './safeAreaPolicy'

/**
 * Safe Area Policy Unit Tests
 * 
 * Tests for safe area inset handling and CSS environment variable parsing.
 * These tests ensure proper safe area detection across different devices.
 */

describe('safeAreaPolicy', () => {
  describe('DEFAULT_INSETS', () => {
    it('should have default insets for browser environment', () => {
      expect(DEFAULT_INSETS.browser).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
    })

    it('should have correct insets for iOS with notch', () => {
      expect(DEFAULT_INSETS.iosNotch).toEqual({ top: 44, right: 0, bottom: 34, left: 0 })
    })

    it('should have correct insets for iOS classic', () => {
      expect(DEFAULT_INSETS.iosClassic).toEqual({ top: 20, right: 0, bottom: 0, left: 0 })
    })

    it('should have correct insets for Android with gesture navigation', () => {
      expect(DEFAULT_INSETS.androidGesture).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
    })

    it('should have correct insets for Android with buttons', () => {
      expect(DEFAULT_INSETS.androidButtons).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
    })
  })

  describe('getSafeAreaInsetsFromCSS', () => {
    // Mock window and document for testing
    beforeEach(() => {
      global.window = {
        getComputedStyle: vi.fn()
      } as any
      global.document = {
        documentElement: {}
      } as any
    })

    afterEach(() => {
      vi.restoreAllMocks()
      delete global.window
      delete global.document
    })

    it('should return zero insets when window is undefined', () => {
      delete global.window
      delete global.document
      
      const insets = getSafeAreaInsetsFromCSS()
      expect(insets).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
    })

    it('should return zero insets when getComputedStyle is not available', () => {
      global.window = { getComputedStyle: undefined } as any
      global.document = { documentElement: {} } as any
      
      const insets = getSafeAreaInsetsFromCSS()
      expect(insets).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
    })

    it('should parse CSS safe area insets correctly', () => {
      const mockStyle = {
        getPropertyValue: vi.fn((property: string) => {
          switch (property) {
            case 'env(safe-area-inset-top)': return '44px'
            case 'env(safe-area-inset-right)': return '0px'
            case 'env(safe-area-inset-bottom)': return '34px'
            case 'env(safe-area-inset-left)': return '0px'
            default: return '0px'
          }
        })
      }
      
      global.window = { getComputedStyle: () => mockStyle } as any
      global.document = { documentElement: {} } as any
      
      const insets = getSafeAreaInsetsFromCSS()
      expect(insets).toEqual({ top: 44, right: 0, bottom: 34, left: 0 })
    })

    it('should handle missing CSS variables gracefully', () => {
      const mockStyle = {
        getPropertyValue: vi.fn((property: string) => {
          // Return empty strings for some properties to test fallback
          switch (property) {
            case 'env(safe-area-inset-top)': return ''
            case 'env(safe-area-inset-right)': return '10px'
            case 'env(safe-area-inset-bottom)': return ''
            case 'env(safe-area-inset-left)': return '5px'
            default: return '0px'
          }
        })
      }
      
      global.window = { getComputedStyle: () => mockStyle } as any
      global.document = { documentElement: {} } as any
      
      const insets = getSafeAreaInsetsFromCSS()
      expect(insets).toEqual({ top: 0, right: 10, bottom: 0, left: 5 })
    })

    it('should handle non-numeric CSS values gracefully', () => {
      const mockStyle = {
        getPropertyValue: vi.fn((property: string) => {
          return 'auto' // Non-numeric value
        })
      }
      
      global.window = { getComputedStyle: () => mockStyle } as any
      global.document = { documentElement: {} } as any
      
      const insets = getSafeAreaInsetsFromCSS()
      expect(insets).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
    })

    it('should handle errors gracefully', () => {
      global.window = { getComputedStyle: () => { throw new Error('CSS error') } } as any
      global.document = { documentElement: {} } as any
      
      const insets = getSafeAreaInsetsFromCSS()
      expect(insets).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
    })

    it('should handle fractional pixel values correctly', () => {
      const mockStyle = {
        getPropertyValue: vi.fn((property: string) => {
          switch (property) {
            case 'env(safe-area-inset-top)': return '44.5px'
            case 'env(safe-area-inset-right)': return '0.1px'
            case 'env(safe-area-inset-bottom)': return '34.9px'
            case 'env(safe-area-inset-left)': return '0.9px'
            default: return '0px'
          }
        })
      }
      
      global.window = { getComputedStyle: () => mockStyle } as any
      global.document = { documentElement: {} } as any
      
      const insets = getSafeAreaInsetsFromCSS()
      expect(insets.top).toBeCloseTo(44.5, 0.001)
      expect(insets.right).toBeCloseTo(0.1, 0.001)
      expect(insets.bottom).toBeCloseTo(34.9, 0.001)
      expect(insets.left).toBeCloseTo(0.9, 0.001)
    })
  })

  describe('safe area utility functions', () => {
    it('should create safe area insets object with expected structure', () => {
      const insets: SafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 }
      expect(insets).toHaveProperty('top')
      expect(insets).toHaveProperty('right')
      expect(insets).toHaveProperty('bottom')
      expect(insets).toHaveProperty('left')
    })

    it('should allow negative values (for edge cases)', () => {
      const insets: SafeAreaInsets = { top: -10, right: -5, bottom: -10, left: -5 }
      expect(insets.top).toBe(-10)
      expect(insets.right).toBe(-5)
      expect(insets.bottom).toBe(-10)
      expect(insets.left).toBe(-5)
    })
  })
})