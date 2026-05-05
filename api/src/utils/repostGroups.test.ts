import { describe, expect, it } from 'bun:test'
import { extractRepostSubjectUri, groupRepostsBySubject, normalizeRepostRecord } from './repostGroups'

describe('repost grouping helpers', () => {
  it('normalizes Bluesky repost records', () => {
    const normalized = normalizeRepostRecord({
      authorId: 'did:plc:alice',
      authorDisplayName: 'alice.example',
      collection: 'app.bsky.feed.repost',
      record: {
        subject: {
          uri: 'at://did:plc:bob/app.bsky.feed.post/root',
          cid: 'bafkrei',
        },
      },
      createdAt: new Date('2026-04-20T12:00:00.000Z'),
      repostUri: 'at://did:plc:alice/app.bsky.feed.repost/abc',
    })

    expect(normalized).toMatchObject({
      actorId: 'did:plc:alice',
      displayName: 'alice.example',
      sourceProtocol: 'atproto',
      subjectUri: 'at://did:plc:bob/app.bsky.feed.post/root',
    })
  })

  it('normalizes canonical share records from ActivityPub actors', () => {
    const subjectUri = extractRepostSubjectUri({
      kind: 'ShareAdd',
      sourceProtocol: 'activitypub',
      sourceAccountRef: {
        activityPubActorUri: 'https://pods.example/users/alice',
        handle: 'Alice',
      },
      object: {
        canonicalObjectId: 'https://remote.example/users/bob/statuses/1',
      },
    })

    expect(subjectUri).toBe('https://remote.example/users/bob/statuses/1')
  })

  it('groups multiple reposts of one subject and marks viewer state', () => {
    const groups = groupRepostsBySubject([
      {
        authorId: 'did:plc:alice',
        authorDisplayName: 'alice.example',
        collection: 'app.bsky.feed.repost',
        record: { subject: { uri: 'at://did:plc:root/app.bsky.feed.post/1' } },
        createdAt: '2026-04-20T10:00:00.000Z',
        repostUri: 'at://did:plc:alice/app.bsky.feed.repost/1',
      },
      {
        authorId: 'did:plc:alice',
        authorDisplayName: 'alice.example',
        collection: 'app.bsky.feed.repost',
        record: { subject: { uri: 'at://did:plc:root/app.bsky.feed.post/1' } },
        createdAt: '2026-04-20T11:00:00.000Z',
        repostUri: 'at://did:plc:alice/app.bsky.feed.repost/2',
      },
      {
        authorId: 'did:plc:viewer',
        authorDisplayName: 'viewer.example',
        collection: 'app.bsky.feed.repost',
        record: { subject: { uri: 'at://did:plc:root/app.bsky.feed.post/1' } },
        createdAt: '2026-04-20T12:00:00.000Z',
        repostUri: 'at://did:plc:viewer/app.bsky.feed.repost/1',
      },
    ], new Set(['did:plc:viewer']), 1)

    const group = groups.get('at://did:plc:root/app.bsky.feed.post/1')
    expect(group?.count).toBe(2)
    expect(group?.viewerHasReposted).toBe(true)
    expect(group?.boostedAt.toISOString()).toBe('2026-04-20T12:00:00.000Z')
    expect(group?.actors).toHaveLength(1)
    expect(group?.actors[0]?.displayName).toBe('viewer.example')
    expect(group?.actorLimitExceeded).toBe(true)
  })
})
