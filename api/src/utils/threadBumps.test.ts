import { describe, expect, it } from 'bun:test'
import { applyFollowedReplyThreadBumps, type ThreadBumpFeedItem } from './threadBumps'

function buildItem(overrides: Partial<ThreadBumpFeedItem> & Pick<ThreadBumpFeedItem, 'id' | 'authorWebId'>): ThreadBumpFeedItem {
  return {
    id: overrides.id,
    source: overrides.source ?? 'atproto',
    authorWebId: overrides.authorWebId,
    atUri: overrides.atUri ?? null,
    objectUri: overrides.objectUri ?? null,
  }
}

describe('applyFollowedReplyThreadBumps', () => {
  it('replaces a followed author reply with the root thread item and deduplicates it', () => {
    const root = buildItem({ id: 1, authorWebId: 'did:plc:root', atUri: 'at://did:plc:root/app.bsky.feed.post/root' })
    const reply = buildItem({ id: 2, authorWebId: 'did:plc:followed', atUri: 'at://did:plc:followed/app.bsky.feed.post/reply' })
    const other = buildItem({ id: 3, authorWebId: 'did:plc:other', atUri: 'at://did:plc:other/app.bsky.feed.post/other' })

    const output = applyFollowedReplyThreadBumps(
      [reply, other, root],
      new Set(['did:plc:followed']),
      new Map([
        [2, { replyParentUri: root.atUri, replyRootUri: root.atUri }],
      ]),
      new Map([[root.atUri!, root]]),
    )

    expect(output).toEqual([root, other])
  })

  it('keeps replies from unfollowed authors untouched', () => {
    const reply = buildItem({ id: 2, authorWebId: 'did:plc:stranger', atUri: 'at://did:plc:stranger/app.bsky.feed.post/reply' })
    const root = buildItem({ id: 1, authorWebId: 'did:plc:root', atUri: 'at://did:plc:root/app.bsky.feed.post/root' })

    const output = applyFollowedReplyThreadBumps(
      [reply],
      new Set(['did:plc:followed']),
      new Map([
        [2, { replyParentUri: root.atUri, replyRootUri: root.atUri }],
      ]),
      new Map([[root.atUri!, root]]),
    )

    expect(output).toEqual([reply])
  })

  it('falls back to the immediate parent when there is no explicit root', () => {
    const parent = buildItem({ id: 10, authorWebId: 'did:plc:parent', atUri: 'at://did:plc:parent/app.bsky.feed.post/parent' })
    const reply = buildItem({ id: 11, authorWebId: 'did:plc:followed', atUri: 'at://did:plc:followed/app.bsky.feed.post/reply' })

    const output = applyFollowedReplyThreadBumps(
      [reply],
      new Set(['did:plc:followed']),
      new Map([
        [11, { replyParentUri: parent.atUri, replyRootUri: null }],
      ]),
      new Map([[parent.atUri!, parent]]),
    )

    expect(output).toEqual([parent])
  })

  it('bumps ActivityPub-native replies using object URIs for followed local authors', () => {
    const root = buildItem({ id: 20, source: 'activitypods', authorWebId: 'https://pods.example/alice', objectUri: 'https://pods.example/alice/posts/root' })
    const reply = buildItem({ id: 21, source: 'activitypods', authorWebId: 'https://pods.example/bob', objectUri: 'https://pods.example/bob/posts/reply' })
    const bystander = buildItem({ id: 22, source: 'activitypods', authorWebId: 'https://pods.example/charlie', objectUri: 'https://pods.example/charlie/posts/other' })

    const output = applyFollowedReplyThreadBumps(
      [reply, bystander, root],
      new Set(['https://pods.example/bob']),
      new Map([
        [21, { replyParentUri: root.objectUri, replyRootUri: root.objectUri }],
      ]),
      new Map([[root.objectUri!, root]]),
    )

    expect(output).toEqual([root, bystander])
  })
})