import { describe, expect, it, vi } from 'vitest'
import {
  STATUS_CHAR_LIMIT,
  buildActorStatusPayload,
  clearActorStatusDraft,
  countStatusCharacters,
  parseActorStatusDraft,
  validateActorStatusDraft
} from './profileStatus'

describe('profile status helpers', () => {
  it('counts emoji as grapheme clusters', () => {
    expect(countStatusCharacters('🔥')).toBe(1)
    expect(countStatusCharacters('👨‍👩‍👧‍👦')).toBe(1)
  })

  it('parses a current status into form fields', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2029-12-31T00:00:00.000Z'))
    const isoValue = '2030-01-01T12:00:00.000Z'
    const expectedLocal = new Date(new Date(isoValue).getTime() - new Date(isoValue).getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 16)

    const draft = parseActorStatusDraft({
      content: 'Listening to the build pipeline',
      endTime: isoValue,
      attachment: {
        type: 'Link',
        name: 'Now playing',
        href: 'https://example.com/track'
      }
    })

    expect(draft).toMatchObject({
      content: 'Listening to the build pipeline',
      endTimeLocal: expectedLocal,
      linkName: 'Now playing',
      linkUrl: 'https://example.com/track'
    })

    vi.useRealTimers()
  })

  it('validates required content, expiration, and URL safety', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2029-12-31T00:00:00.000Z'))

    expect(
      validateActorStatusDraft({
        content: '',
        endTimeLocal: '',
        linkName: '',
        linkUrl: 'https://example.com'
      })
    ).toBe('settings.profile.status.errors.required')

    expect(
      validateActorStatusDraft({
        content: 'x'.repeat(STATUS_CHAR_LIMIT + 1),
        endTimeLocal: '',
        linkName: '',
        linkUrl: ''
      })
    ).toBe('settings.profile.status.errors.tooLong')

    expect(
      validateActorStatusDraft({
        content: 'Valid text',
        endTimeLocal: '2029-01-01T12:00',
        linkName: '',
        linkUrl: ''
      })
    ).toBe('settings.profile.status.errors.invalidExpiration')

    expect(
      validateActorStatusDraft({
        content: 'Valid text',
        endTimeLocal: '2030-01-01T12:00',
        linkName: '',
        linkUrl: 'javascript:alert(1)'
      })
    ).toBe('settings.profile.status.errors.invalidLink')

    vi.useRealTimers()
  })

  it('builds a safe payload for the API route', () => {
    const expectedEndTime = new Date('2030-01-01T12:00').toISOString()
    const payload = buildActorStatusPayload({
      content: 'Heads down shipping',
      endTimeLocal: '2030-01-01T12:00',
      linkName: 'Sprint board',
      linkUrl: 'https://example.com/sprint'
    })

    expect(payload).toEqual({
      content: 'Heads down shipping',
      endTime: expectedEndTime,
      attachment: {
        type: 'Link',
        name: 'Sprint board',
        href: 'https://example.com/sprint'
      }
    })
  })

  it('returns an empty draft for clear operations', () => {
    expect(clearActorStatusDraft()).toEqual({
      content: '',
      endTimeLocal: '',
      linkName: '',
      linkUrl: ''
    })
  })
})
