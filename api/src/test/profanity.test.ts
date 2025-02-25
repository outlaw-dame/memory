import { describe, expect, it } from 'bun:test'
import { getProfanity } from '@/util'

describe('Check profanity module', () => {
  it('should return false for strings without profanity', () => {
    const notProfane = [
      'Taiwan',
      'Taiwanese',
      'Taiwanesepeople',
      'Protestant',
      'Protestantism',
      'Transgender',
      'Hongkong',
      'HongKong',
      'HongKongpeople',
      'Taiwanisafreecountry'
    ]

    const profanity = getProfanity()

    notProfane.forEach(word => {
      expect(profanity.exists(word)).toBe(false)
    })
  })
})
