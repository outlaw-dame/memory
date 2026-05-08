import { describe, expect, it } from 'bun:test'
import { extractQuotedPostUri } from './ApRemoteIngestionService'

// ---------------------------------------------------------------------------
// extractQuotedPostUri
//
// Tests cover:
//   - All four vendor fields in precedence order (FEP-e232 > quoteUrl > quoteUri > _misskey_quote)
//   - Rejection of non-string values (object, array, null, number)
//   - Rejection of non-URL strings (relative path, plain text)
//   - Rejection of javascript: / data: schemes (security: only http/https accepted)
//   - URL length limit enforcement (MAX_URI_LENGTH = 3072)
//   - Null when no quote field is present
// ---------------------------------------------------------------------------

describe('extractQuotedPostUri', () => {
  it('returns the FEP-e232 `quote` field when present (highest precedence)', () => {
    const note = {
      quote: 'https://mastodon.social/users/alice/statuses/111',
      quoteUrl: 'https://should.not/be/chosen',
    }
    expect(extractQuotedPostUri(note)).toBe('https://mastodon.social/users/alice/statuses/111')
  })

  it('falls back to `quoteUrl` when `quote` is absent', () => {
    const note = {
      quoteUrl: 'https://calckey.example/@bob/123456',
      quoteUri: 'https://should.not/be/chosen',
    }
    expect(extractQuotedPostUri(note)).toBe('https://calckey.example/@bob/123456')
  })

  it('falls back to `quoteUri` when higher-priority fields are absent', () => {
    const note = {
      quoteUri: 'https://pleroma.example/objects/abc',
      _misskey_quote: 'https://should.not/be/chosen',
    }
    expect(extractQuotedPostUri(note)).toBe('https://pleroma.example/objects/abc')
  })

  it('falls back to `_misskey_quote` (legacy Misskey) as last resort', () => {
    const note = {
      _misskey_quote: 'https://misskey.io/notes/oldpost',
    }
    expect(extractQuotedPostUri(note)).toBe('https://misskey.io/notes/oldpost')
  })

  it('accepts http:// URIs (not all AP servers use TLS in URIs)', () => {
    expect(extractQuotedPostUri({ quote: 'http://internal.example/notes/1' })).toBe(
      'http://internal.example/notes/1',
    )
  })

  it('returns null when no quote field is present', () => {
    expect(extractQuotedPostUri({ content: 'just a note', type: 'Note' })).toBeNull()
  })

  it('returns null for an empty object', () => {
    expect(extractQuotedPostUri({})).toBeNull()
  })

  it('rejects a javascript: URI (security: scheme must be http/https)', () => {
    expect(extractQuotedPostUri({ quote: 'javascript:alert(1)' })).toBeNull()
  })

  it('rejects a data: URI (security: scheme must be http/https)', () => {
    expect(extractQuotedPostUri({ quote: 'data:text/html,<h1>xss</h1>' })).toBeNull()
  })

  it('rejects a relative path (must be an absolute URL)', () => {
    expect(extractQuotedPostUri({ quote: '/notes/relative' })).toBeNull()
  })

  it('rejects a non-URL plain string', () => {
    expect(extractQuotedPostUri({ quote: 'not a url at all' })).toBeNull()
  })

  it('rejects a non-string value in quote field (object)', () => {
    expect(extractQuotedPostUri({ quote: { id: 'https://example.com/1' } })).toBeNull()
  })

  it('rejects a non-string value in quote field (array)', () => {
    expect(extractQuotedPostUri({ quote: ['https://example.com/1'] })).toBeNull()
  })

  it('rejects a non-string value in quote field (number)', () => {
    expect(extractQuotedPostUri({ quote: 42 })).toBeNull()
  })

  it('rejects a non-string value in quote field (null)', () => {
    expect(extractQuotedPostUri({ quote: null })).toBeNull()
  })

  it('skips an invalid field and uses the next valid one in precedence order', () => {
    // `quote` is invalid; should fall through to `quoteUrl`
    const note = {
      quote: 'not-a-url',
      quoteUrl: 'https://valid.example/notes/99',
    }
    expect(extractQuotedPostUri(note)).toBe('https://valid.example/notes/99')
  })

  it('rejects a URI exceeding the MAX_URI_LENGTH of 3072 characters', () => {
    const longUri = 'https://example.com/' + 'a'.repeat(3072)
    expect(longUri.length).toBeGreaterThan(3072)
    expect(extractQuotedPostUri({ quote: longUri })).toBeNull()
  })

  it('accepts a URI at the boundary of MAX_URI_LENGTH (3072 chars)', () => {
    // Build a URI that is exactly 3072 characters
    const base = 'https://example.com/'
    const padding = 'a'.repeat(3072 - base.length)
    const uri = base + padding
    expect(uri.length).toBe(3072)
    expect(extractQuotedPostUri({ quote: uri })).toBe(uri)
  })
})
