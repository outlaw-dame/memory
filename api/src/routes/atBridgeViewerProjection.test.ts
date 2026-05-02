import { describe, expect, it } from 'bun:test'
import {
  appendVisibleThreadWindow,
  applyViewerThreadMetrics,
  buildViewerThreadMetrics,
  filterViewerModeratedRows,
  finalizeVisibleThreadWindow,
  type ThreadProjectionRow,
  type ViewerModerationState,
} from './atBridgeViewerProjection'

function buildRow(overrides: Partial<ThreadProjectionRow> = {}): ThreadProjectionRow {
  return {
    authorWebId: 'https://pods.example/users/alice',
    source: 'activitypods',
    atUri: null,
    objectUri: 'https://pods.example/posts/root',
    candidateUri: 'https://pods.example/posts/root',
    content: 'hello thread',
    title: null,
    summary: null,
    hashtags: [],
    createdAt: new Date('2026-04-20T10:00:00.000Z'),
    replyParentUri: null,
    replyRootUri: null,
    threadReplyCount: null,
    threadParticipantCount: null,
    threadLastActivityAt: null,
    ...overrides,
  }
}

describe('atBridge viewer projection helpers', () => {
  it('builds viewer-visible thread metrics from filtered replies and applies them to thread cards', () => {
    const rootUri = 'at://did:plc:root/app.bsky.feed.post/root'
    const visibleReplyOne = buildRow({
      source: 'atproto',
      authorWebId: 'did:plc:alice',
      atUri: 'at://did:plc:alice/app.bsky.feed.post/1',
      objectUri: null,
      candidateUri: 'at://did:plc:alice/app.bsky.feed.post/1',
      replyParentUri: rootUri,
      replyRootUri: rootUri,
      createdAt: new Date('2026-04-20T11:00:00.000Z'),
    })
    const visibleReplyTwo = buildRow({
      source: 'atproto',
      authorWebId: 'did:plc:bob',
      atUri: 'at://did:plc:bob/app.bsky.feed.post/2',
      objectUri: null,
      candidateUri: 'at://did:plc:bob/app.bsky.feed.post/2',
      replyParentUri: 'at://did:plc:alice/app.bsky.feed.post/1',
      replyRootUri: rootUri,
      createdAt: new Date('2026-04-20T12:00:00.000Z'),
    })
    const rootCard = buildRow({
      source: 'atproto',
      authorWebId: 'did:plc:root',
      atUri: rootUri,
      objectUri: null,
      candidateUri: rootUri,
    })

    const metrics = buildViewerThreadMetrics([visibleReplyOne, visibleReplyTwo])
    expect(metrics).toEqual({
      replyCount: 2,
      participantCount: 2,
      lastActivityAt: new Date('2026-04-20T12:00:00.000Z'),
    })

    const projected = applyViewerThreadMetrics([rootCard], new Map([[rootUri, metrics]]))
    expect(projected[0]?.threadReplyCount).toBe(2)
    expect(projected[0]?.threadParticipantCount).toBe(2)
    expect(projected[0]?.threadLastActivityAt?.toISOString()).toBe('2026-04-20T12:00:00.000Z')
  })

  it('filters blocked and keyword-matched replies before computing visible thread state', () => {
    const moderationState: ViewerModerationState = {
      hiddenSubjectKeys: new Set(['did:plc:blocked']),
      filters: [
        {
          action: 'hide',
          matchType: 'word',
          terms: ['#spoilers'],
          includeHashtagVariants: true,
        },
      ],
      sensitiveMediaAction: 'off',
      atprotoLabelerAction: 'off',
      hasEnabledAtprotoLabelers: false,
    }

    const visible = buildRow({
      source: 'atproto',
      authorWebId: 'did:plc:visible',
      atUri: 'at://did:plc:visible/app.bsky.feed.post/1',
      objectUri: null,
      candidateUri: 'at://did:plc:visible/app.bsky.feed.post/1',
      content: 'plain reply',
    })
    const blocked = buildRow({
      source: 'atproto',
      authorWebId: 'did:plc:blocked',
      atUri: 'at://did:plc:blocked/app.bsky.feed.post/2',
      objectUri: null,
      candidateUri: 'at://did:plc:blocked/app.bsky.feed.post/2',
      content: 'blocked reply',
    })
    const keywordHidden = buildRow({
      source: 'atproto',
      authorWebId: 'did:plc:keyword',
      atUri: 'at://did:plc:keyword/app.bsky.feed.post/3',
      objectUri: null,
      candidateUri: 'at://did:plc:keyword/app.bsky.feed.post/3',
      content: 'contains spoilers',
      hashtags: ['spoilers'],
    })

    const result = filterViewerModeratedRows([visible, blocked, keywordHidden], moderationState)
    expect(result.visible).toEqual([visible])
    expect(result.hiddenCount).toBe(2)
  })

  it('paginates visible replies without letting hidden rows consume the page size', () => {
    const rootUri = 'https://pods.example/posts/root'
    const moderationState: ViewerModerationState = {
      hiddenSubjectKeys: new Set(['https://pods.example/users/blocked']),
      filters: [],
      sensitiveMediaAction: 'off',
      atprotoLabelerAction: 'off',
      hasEnabledAtprotoLabelers: false,
    }

    const batch = [
      buildRow({
        authorWebId: 'https://pods.example/users/blocked',
        objectUri: 'https://pods.example/posts/r1',
        candidateUri: 'https://pods.example/posts/r1',
        replyParentUri: rootUri,
        replyRootUri: rootUri,
      }),
      buildRow({
        authorWebId: 'https://pods.example/users/visible-1',
        objectUri: 'https://pods.example/posts/r2',
        candidateUri: 'https://pods.example/posts/r2',
        replyParentUri: rootUri,
        replyRootUri: rootUri,
      }),
      buildRow({
        authorWebId: 'https://pods.example/users/blocked',
        objectUri: 'https://pods.example/posts/r3',
        candidateUri: 'https://pods.example/posts/r3',
        replyParentUri: rootUri,
        replyRootUri: rootUri,
      }),
      buildRow({
        authorWebId: 'https://pods.example/users/visible-2',
        objectUri: 'https://pods.example/posts/r4',
        candidateUri: 'https://pods.example/posts/r4',
        replyParentUri: rootUri,
        replyRootUri: rootUri,
      }),
      buildRow({
        authorWebId: 'https://pods.example/users/visible-3',
        objectUri: 'https://pods.example/posts/r5',
        candidateUri: 'https://pods.example/posts/r5',
        replyParentUri: rootUri,
        replyRootUri: rootUri,
      }),
    ]

    const window = appendVisibleThreadWindow({ page: [], nextOffset: 0 }, batch, 2, moderationState)
    const finalized = finalizeVisibleThreadWindow(window.page, window.nextOffset, 2, false)

    expect(finalized.visiblePage.map(row => row.objectUri)).toEqual([
      'https://pods.example/posts/r2',
      'https://pods.example/posts/r4',
    ])
    expect(finalized.hasMore).toBe(true)
    expect(finalized.nextCursorOffset).toBe(5)
  })
})
