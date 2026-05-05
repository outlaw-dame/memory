import { describe, expect, it } from 'bun:test'
import {
  extractHashtagsFromFacets,
  extractHashtagsFromText,
  mergeHashtags,
  normalizeHashtag,
  toActivityPubHashtagTags,
} from './hashtags'

describe('hashtags utils', () => {
  it('normalizes raw hashtag tokens', () => {
    expect(normalizeHashtag('Fediverse')).toBe('#fediverse')
    expect(normalizeHashtag('#InterOp_2026')).toBe('#interop_2026')
    expect(normalizeHashtag('#')).toBeNull()
  })

  it('extracts hashtags from text and deduplicates', () => {
    expect(extractHashtagsFromText('Hello #Fediverse and #fediverse #ActivityPub')).toEqual([
      '#fediverse',
      '#activitypub',
    ])
  })

  it('extracts canonical facet tags for the Bluesky-facing feed path', () => {
    expect(
      extractHashtagsFromFacets([
        {
          features: [
            { tag: 'Fediverse' },
            { tag: '#Interop' },
            { tag: 'fediverse' },
            { tag: '' },
            { type: 'app.bsky.richtext.facet#link', uri: 'https://example.com' },
          ],
        },
      ]),
    ).toEqual(['#fediverse', '#interop'])
  })

  it('merges in-band and out-of-band hashtags', () => {
    expect(mergeHashtags('Shipping #FEP', ['interop', '#fep', '  #ActivityPub  '])).toEqual([
      '#fep',
      '#interop',
      '#activitypub',
    ])
  })

  it('maps hashtags to ActivityPub tag objects', () => {
    expect(toActivityPubHashtagTags(['#fediverse'], 'https://memory.example/')).toEqual([
      {
        type: 'Hashtag',
        name: '#fediverse',
        href: 'https://memory.example/tags/fediverse',
      },
    ])
  })
})
