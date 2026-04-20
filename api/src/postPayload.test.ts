import { describe, expect, it } from 'bun:test'
import { buildOutboxPost } from './postPayload'

const mockUser = {
  endpoint: 'https://pods.example',
  userName: 'alice',
} as any

describe('buildOutboxPost', () => {
  it('keeps note publishing compatible with existing MFM flow', () => {
    const result = buildOutboxPost({
      user: mockUser,
      content: '$[x2 hello]',
      isPublic: true,
      postType: 'note',
    })

    expect(result.type).toBe('https://www.w3.org/ns/activitystreams#Note')
    expect(result.htmlMfm).toBe(true)
    expect(result.source).toEqual({
      content: '$[x2 hello]',
      mediaType: 'text/x.misskeymarkdown',
    })
    expect(result.to).toContain('https://www.w3.org/ns/activitystreams#Public')
  })

  it('builds article posts with source markdown and sanitized summary html', () => {
    const result = buildOutboxPost({
      user: mockUser,
      content: '# Heading\n\nLong-form body',
      isPublic: false,
      postType: 'article',
      name: '  Article title  ',
      summary: 'Intro line\n\nSecond paragraph <script>alert(1)</script>',
    })

    expect(result.type).toBe('https://www.w3.org/ns/activitystreams#Article')
    expect(result.name).toBe('Article title')
    expect(result.htmlMfm).toBeUndefined()
    expect(result.source).toEqual({
      content: '# Heading\n\nLong-form body',
      mediaType: 'text/markdown',
    })
    expect(result.summary).toBe(
      '<p>Intro line</p><p>Second paragraph &lt;script&gt;alert(1)&lt;/script&gt;</p>',
    )
    expect(result.to).not.toContain('https://www.w3.org/ns/activitystreams#Public')
  })

  it('adds ActivityPub hashtag tags from content and out-of-band hashtags', () => {
    const result = buildOutboxPost({
      user: mockUser,
      content: 'Hello #Fediverse',
      hashtags: ['#Interop', 'activitypub', '#fediverse'],
      isPublic: true,
      postType: 'note',
    })

    expect(result.tag).toEqual([
      {
        type: 'Hashtag',
        name: '#fediverse',
        href: 'https://pods.example/tags/fediverse',
      },
      {
        type: 'Hashtag',
        name: '#interop',
        href: 'https://pods.example/tags/interop',
      },
      {
        type: 'Hashtag',
        name: '#activitypub',
        href: 'https://pods.example/tags/activitypub',
      },
    ])
  })
})
