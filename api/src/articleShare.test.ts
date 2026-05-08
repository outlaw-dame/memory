import { describe, expect, it } from 'bun:test'
import { deriveArticleCanonicalUrl } from './articleShare'

describe('deriveArticleCanonicalUrl', () => {
  it('derives the first-party share page from a local posts object URI', () => {
    expect(deriveArticleCanonicalUrl('https://pods.example/posts/abc123')).toBe(
      'https://pods.example/posts/abc123/share',
    )
  })

  it('returns null for non-post object URIs', () => {
    expect(deriveArticleCanonicalUrl('https://pods.example/AP/objects/abc123')).toBeNull()
  })

  it('returns null for invalid URLs', () => {
    expect(deriveArticleCanonicalUrl('not-a-url')).toBeNull()
  })
})
