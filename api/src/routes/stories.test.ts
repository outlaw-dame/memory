import { describe, expect, it } from 'bun:test'
import { normalizeStoryExpiresAt, normalizeSubmittedStoryLinks } from './stories'

describe('stories route validation helpers', () => {
  it('caps story TTL at 24 hours and requires valid future expiry', () => {
    const createdAt = new Date()
    const defaultExpiry = normalizeStoryExpiresAt(undefined, createdAt)

    expect(defaultExpiry.getTime() - createdAt.getTime()).toBe(24 * 60 * 60 * 1000)
    expect(() => normalizeStoryExpiresAt(new Date(createdAt.getTime() + 24 * 60 * 60 * 1000 + 1000).toISOString(), createdAt)).toThrow(/24 hours/)
    expect(() => normalizeStoryExpiresAt(new Date(createdAt.getTime() - 60_000).toISOString(), createdAt)).toThrow(/future/)
    expect(() => normalizeStoryExpiresAt('not-a-date', createdAt)).toThrow(/valid ISO/)
  })

  it('accepts only unique http(s) story links', () => {
    expect(normalizeSubmittedStoryLinks([
      { uri: 'https://example.com/story', title: 'Story' },
      { uri: 'http://example.net/more' },
    ])).toEqual([
      { uri: 'https://example.com/story', title: 'Story' },
      { uri: 'http://example.net/more' },
    ])

    expect(() => normalizeSubmittedStoryLinks([{ uri: 'javascript:alert(1)' }])).toThrow(/http/)
    expect(() => normalizeSubmittedStoryLinks([
      { uri: 'https://example.com/story' },
      { uri: 'https://example.com/story' },
    ])).toThrow(/http/)
  })
})
