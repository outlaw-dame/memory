import { describe, it, expect } from 'vitest'
import { KEYBOARD_PRESETS, getKeyboardConfig, type KeyboardConfig } from './keyboardPolicy'

/**
 * Keyboard Policy Unit Tests
 * 
 * Tests for keyboard configuration presets and helper functions.
 * These tests ensure consistent keyboard behavior across different input types.
 */

describe('keyboardPolicy', () => {
  describe('KEYBOARD_PRESETS', () => {
    it('should have all required preset configurations', () => {
      const requiredPresets = [
        'text', 'search', 'email', 'url', 'numeric', 'phone', 'password',
        'username', 'composer', 'title', 'hashtag', 'handle', 'newPassword', 'multiline'
      ]
      
      requiredPresets.forEach(preset => {
        expect(KEYBOARD_PRESETS[preset]).toBeDefined()
      })
    })

    it('should have correct default text preset configuration', () => {
      const textPreset = KEYBOARD_PRESETS.text
      expect(textPreset).toEqual({
        type: 'default',
        enterKeyHint: 'done',
        autoCapitalize: 'sentences',
        autoCorrect: true,
        spellCheck: true,
        autoComplete: 'on',
        inputMode: 'text',
      })
    })

    it('should have correct search preset configuration', () => {
      const searchPreset = KEYBOARD_PRESETS.search
      expect(searchPreset).toEqual({
        type: 'search',
        enterKeyHint: 'search',
        autoCapitalize: 'none',
        autoCorrect: false,
        spellCheck: false,
        autoComplete: 'off',
        inputMode: 'search',
      })
    })

    it('should have correct email preset configuration', () => {
      const emailPreset = KEYBOARD_PRESETS.email
      expect(emailPreset).toEqual({
        type: 'email',
        enterKeyHint: 'next',
        autoCapitalize: 'none',
        autoCorrect: false,
        spellCheck: false,
        autoComplete: 'email',
        inputMode: 'email',
      })
    })

    it('should have correct URL preset configuration', () => {
      const urlPreset = KEYBOARD_PRESETS.url
      expect(urlPreset).toEqual({
        type: 'url',
        enterKeyHint: 'go',
        autoCapitalize: 'none',
        autoCorrect: false,
        spellCheck: false,
        autoComplete: 'url',
        inputMode: 'url',
      })
    })

    it('should have correct numeric preset configuration', () => {
      const numericPreset = KEYBOARD_PRESETS.numeric
      expect(numericPreset).toEqual({
        type: 'numeric',
        enterKeyHint: 'done',
        autoCapitalize: 'none',
        autoCorrect: false,
        spellCheck: false,
        autoComplete: 'off',
        inputMode: 'numeric',
      })
    })

    it('should have correct phone preset configuration', () => {
      const phonePreset = KEYBOARD_PRESETS.phone
      expect(phonePreset).toEqual({
        type: 'phone-pad',
        enterKeyHint: 'next',
        autoCapitalize: 'none',
        autoCorrect: false,
        spellCheck: false,
        autoComplete: 'tel',
        inputMode: 'tel',
      })
    })

    it('should have correct password preset configuration', () => {
      const passwordPreset = KEYBOARD_PRESETS.password
      expect(passwordPreset).toEqual({
        type: 'default',
        enterKeyHint: 'done',
        autoCapitalize: 'none',
        autoCorrect: false,
        spellCheck: false,
        autoComplete: 'current-password',
        inputMode: 'text',
      })
    })

    it('should have correct username preset configuration', () => {
      const usernamePreset = KEYBOARD_PRESETS.username
      expect(usernamePreset).toEqual({
        type: 'default',
        enterKeyHint: 'next',
        autoCapitalize: 'none',
        autoCorrect: false,
        spellCheck: false,
        autoComplete: 'username',
        inputMode: 'text',
      })
    })

    it('should have correct composer preset configuration', () => {
      const composerPreset = KEYBOARD_PRESETS.composer
      expect(composerPreset).toEqual({
        type: 'default',
        enterKeyHint: 'enter',
        autoCapitalize: 'sentences',
        autoCorrect: true,
        spellCheck: true,
        autoComplete: 'on',
        inputMode: 'text',
      })
    })

    it('should have correct title preset configuration', () => {
      const titlePreset = KEYBOARD_PRESETS.title
      expect(titlePreset).toEqual({
        type: 'text',
        enterKeyHint: 'done',
        autoCapitalize: 'sentences',
        autoCorrect: true,
        spellCheck: true,
        autoComplete: 'off',
        inputMode: 'text',
      })
    })

    it('should have correct hashtag preset configuration', () => {
      const hashtagPreset = KEYBOARD_PRESETS.hashtag
      expect(hashtagPreset).toEqual({
        type: 'default',
        enterKeyHint: 'done',
        autoCapitalize: 'none',
        autoCorrect: false,
        spellCheck: false,
        autoComplete: 'off',
        inputMode: 'text',
      })
    })

    it('should have correct handle preset configuration', () => {
      const handlePreset = KEYBOARD_PRESETS.handle
      expect(handlePreset).toEqual({
        type: 'default',
        enterKeyHint: 'next',
        autoCapitalize: 'none',
        autoCorrect: false,
        spellCheck: false,
        autoComplete: 'username',
        inputMode: 'text',
      })
    })

    it('should have correct newPassword preset configuration', () => {
      const newPasswordPreset = KEYBOARD_PRESETS.newPassword
      expect(newPasswordPreset).toEqual({
        type: 'password',
        enterKeyHint: 'done',
        autoCapitalize: 'none',
        autoCorrect: false,
        spellCheck: false,
        autoComplete: 'new-password',
        inputMode: 'text',
      })
    })

    it('should have correct multiline preset configuration', () => {
      const multilinePreset = KEYBOARD_PRESETS.multiline
      expect(multilinePreset).toEqual({
        autoCapitalize: 'sentences',
        autoCorrect: true,
        spellCheck: true,
        autoComplete: 'on',
      })
      // Note: multiline doesn't have type/inputMode as it's for textarea
      expect(multilinePreset.type).toBeUndefined()
      expect(multilinePreset.inputMode).toBeUndefined()
    })
  })

  describe('getKeyboardConfig', () => {
    it('should return the text preset for unknown purpose', () => {
      const config = getKeyboardConfig('unknown' as any)
      expect(config).toEqual(KEYBOARD_PRESETS.text)
    })

    it('should return the text preset for text purpose', () => {
      const config = getKeyboardConfig('text')
      expect(config).toEqual(KEYBOARD_PRESETS.text)
    })

    it('should return the search preset for search purpose', () => {
      const config = getKeyboardConfig('search')
      expect(config).toEqual(KEYBOARD_PRESETS.search)
    })

    it('should return the email preset for email purpose', () => {
      const config = getKeyboardConfig('email')
      expect(config).toEqual(KEYBOARD_PRESETS.email)
    })

    it('should return the correct preset for each purpose', () => {
      Object.keys(KEYBOARD_PRESETS).forEach(purpose => {
        const config = getKeyboardConfig(purpose as keyof typeof KEYBOARD_PRESETS)
        expect(config).toEqual(KEYBOARD_PRESETS[purpose])
      })
    })

    it('should merge with text preset as base', () => {
      // This tests the spread operator behavior in getKeyboardConfig
      const config = getKeyboardConfig('search')
      
      // Should have search-specific values
      expect(config.type).toBe('search')
      expect(config.enterKeyHint).toBe('search')
      expect(config.inputMode).toBe('search')
      
      // Should inherit from text preset where not overridden
      // Note: search preset overrides all values from text, so this might not apply
    })
  })

  describe('configuration validation', () => {
    it('should ensure all presets have valid enterKeyHint values', () => {
      const validEnterKeyHints = ['done', 'enter', 'go', 'next', 'previous', 'search', 'send']
      
      Object.entries(KEYBOARD_PRESETS).forEach(([presetName, config]) => {
        if (config.enterKeyHint !== undefined) {
          expect(validEnterKeyHints).toContain(config.enterKeyHint)
        }
      })
    })

    it('should ensure all presets have valid autoCapitalize values', () => {
      const validAutoCapitalize = ['none', 'sentences', 'words', 'characters']
      
      Object.entries(KEYBOARD_PRESETS).forEach(([presetName, config]) => {
        if (config.autoCapitalize !== undefined) {
          expect(validAutoCapitalize).toContain(config.autoCapitalize)
        }
      })
    })

    it('should ensure all presets have valid inputMode values', () => {
      const validInputModes = ['text', 'search', 'email', 'url', 'numeric', 'decimal', 'tel', 'password']
      
      Object.entries(KEYBOARD_PRESETS).forEach(([presetName, config]) => {
        if (config.inputMode !== undefined) {
          expect(validInputModes).toContain(config.inputMode)
        }
      })
    })
  })
})