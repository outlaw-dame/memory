import { profanity } from '@2toad/profanity'
import { describe, expect, it } from 'bun:test'

describe('Check profanity module', () => {
  it('should return false for strings without profanity', () => {
    const notProfane = [
      'Taiwan',
      'Taiwanese',
      'Taiwanese people',
      'Protestant',
      'Protestantism',
      'Transgender',
      'Hongkong',
      'Hong Kong',
      'Hong Kong people',
      'Taiwan is a free country'
    ]
    notProfane.forEach(word => {
      expect(profanity.exists(word)).toBe(false)
    })
  })
})
