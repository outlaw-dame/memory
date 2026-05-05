import { afterEach, describe, expect, it } from 'bun:test'
import Elysia from 'elysia'
import { inspect } from 'node:util'
import atBridgePlugin from './atBridge'
import setupPlugin from './setup'
import { db } from '../db/client'

type DbLike = {
  execute?: (...args: unknown[]) => unknown
  select?: (...args: unknown[]) => unknown
}

function createSelectChain(rows: unknown[]) {
  const chain: Record<string, unknown> = {}

  chain.from = () => chain
  chain.leftJoin = () => chain
  chain.where = () => chain
  chain.orderBy = () => chain
  chain.limit = () => rows
  chain.offset = () => rows
  chain.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(rows).then(resolve, reject)

  return chain
}

function mockDbForFeed(rows: Record<string, unknown>[]) {
  const dbLike = db as DbLike
  const originalExecute = dbLike.execute
  const originalSelect = dbLike.select

  let executeCalls = 0
  let lastExecuteDebug = ''

  dbLike.execute = async (...args: unknown[]) => {
    executeCalls += 1
    lastExecuteDebug = inspect(args[0], { depth: 8 })
    return { rows }
  }

  dbLike.select = () => createSelectChain([])

  return {
    getExecuteCalls: () => executeCalls,
    getLastExecuteDebug: () => lastExecuteDebug,
    restore: () => {
      dbLike.execute = originalExecute
      dbLike.select = originalSelect
    },
  }
}

function createAuthenticatedTestApp() {
  return new Elysia({ aot: false })
    .use(setupPlugin)
    .macro({
      isSignedIn: enabled => {
        if (!enabled) return

        return {
          beforeHandle({ user }) {
            // Keep the route in authenticated mode while avoiding external dashboard lookups.
            ;(user as unknown as { endpoint?: string; token?: string; atprotoDid?: string | null; getWebId?: () => string }).endpoint = ''
            ;(user as unknown as { endpoint?: string; token?: string; atprotoDid?: string | null; getWebId?: () => string }).token = ''
            ;(user as unknown as { endpoint?: string; token?: string; atprotoDid?: string | null; getWebId?: () => string }).atprotoDid = null
            ;(user as unknown as { endpoint?: string; token?: string; atprotoDid?: string | null; getWebId?: () => string }).getWebId = () => ''
          },
        }
      },
    })
    .use(atBridgePlugin)
}

describe('atBridge integration: GET /at/feed', () => {
  let restoreDb: (() => void) | null = null

  afterEach(() => {
    restoreDb?.()
    restoreDb = null
  })

  it('returns mapped feed rows including likeCount and quoteCount', async () => {
    const dbMock = mockDbForFeed([
      {
        id: 101,
        content: 'Integration feed post',
        hashtags: ['integration'],
        post_type: 'note',
        title: null,
        summary: null,
        canonical_url: null,
        created_at: new Date('2026-04-28T12:00:00.000Z'),
        is_public: true,
        author_id: null,
        author_name: 'did:plc:alice',
        author_web_id: 'did:plc:alice',
        author_provider_endpoint: '',
        source: 'atproto',
        at_uri: 'at://did:plc:alice/app.bsky.feed.post/abc123',
        object_uri: null,
        reply_parent_uri: null,
        reply_root_uri: null,
        candidate_uri: 'at://did:plc:alice/app.bsky.feed.post/abc123',
        thread_parent_author_id: null,
        thread_root_author_id: null,
        thread_reply_count: 0,
        thread_participant_count: 0,
        thread_last_activity_at: null,
        like_count: 7,
        quote_count: 2,
      },
    ])
    restoreDb = dbMock.restore

    const app = createAuthenticatedTestApp()
    const response = await app.handle(new Request('http://localhost/at/feed?limit=10&offset=0&mode=chronological'))

    expect(response.status).toBe(200)
    expect(dbMock.getExecuteCalls()).toBe(1)

    const payload = await response.json() as Array<Record<string, unknown>>
    expect(Array.isArray(payload)).toBe(true)
    expect(payload).toHaveLength(1)
    expect(payload[0]?.likeCount).toBe(7)
    expect(payload[0]?.quoteCount).toBe(2)
    expect(payload[0]?.type).toBe('post')
  })

  it('rejects invalid pagination query via route validation', async () => {
    const dbMock = mockDbForFeed([])
    restoreDb = dbMock.restore

    const app = createAuthenticatedTestApp()
    const response = await app.handle(new Request('http://localhost/at/feed?limit=0&offset=0'))

    expect(response.status).toBe(422)
    expect(dbMock.getExecuteCalls()).toBe(0)
  })

  it('builds a source-scoped feed query without extra source arms', async () => {
    const atprotoMock = mockDbForFeed([])
    restoreDb = atprotoMock.restore

    const app = createAuthenticatedTestApp()
    const atprotoResponse = await app.handle(new Request('http://localhost/at/feed?limit=10&offset=0&source=atproto'))

    expect(atprotoResponse.status).toBe(200)
    const atprotoQueryDebug = atprotoMock.getLastExecuteDebug()
    expect(atprotoQueryDebug.includes('at_limited AS MATERIALIZED')).toBe(true)
    expect(atprotoQueryDebug.includes('ap_limited AS MATERIALIZED')).toBe(false)
    expect(atprotoQueryDebug.includes('ap_remote_limited AS MATERIALIZED')).toBe(false)

    atprotoMock.restore()
    restoreDb = null

    const activitypodsMock = mockDbForFeed([])
    restoreDb = activitypodsMock.restore

    const activitypodsResponse = await app.handle(new Request('http://localhost/at/feed?limit=10&offset=0&source=activitypods'))

    expect(activitypodsResponse.status).toBe(200)
    const activitypodsQueryDebug = activitypodsMock.getLastExecuteDebug()
    expect(activitypodsQueryDebug.includes('at_limited AS MATERIALIZED')).toBe(false)
    expect(activitypodsQueryDebug.includes('ap_limited AS MATERIALIZED')).toBe(true)
    expect(activitypodsQueryDebug.includes('ap_remote_limited AS MATERIALIZED')).toBe(true)
  })

  it('builds a combined feed query for source=all', async () => {
    const dbMock = mockDbForFeed([])
    restoreDb = dbMock.restore

    const app = createAuthenticatedTestApp()
    const response = await app.handle(new Request('http://localhost/at/feed?limit=10&offset=0&source=all'))

    expect(response.status).toBe(200)
    const queryDebug = dbMock.getLastExecuteDebug()
    expect(queryDebug.includes('at_limited AS MATERIALIZED')).toBe(true)
    expect(queryDebug.includes('ap_limited AS MATERIALIZED')).toBe(true)
    expect(queryDebug.includes('ap_remote_limited AS MATERIALIZED')).toBe(true)
  })

  it('includes AP remote quoted_post_uri in the quote_counts CTE with fan-out-safe aggregation', async () => {
    const dbMock = mockDbForFeed([
      {
        id: 201,
        content: 'AP post that was quoted',
        hashtags: [],
        post_type: 'note',
        title: null,
        summary: null,
        canonical_url: null,
        created_at: new Date('2026-04-30T10:00:00.000Z'),
        is_public: true,
        author_id: null,
        author_name: 'remote-author',
        author_web_id: 'https://mastodon.example/users/remote',
        author_provider_endpoint: '',
        // AP remote rows surface as 'activitypods' (see ap_remote_limited CTE)
        source: 'activitypods',
        at_uri: null,
        object_uri: 'https://mastodon.example/users/remote/statuses/99',
        reply_parent_uri: null,
        reply_root_uri: null,
        candidate_uri: 'https://mastodon.example/users/remote/statuses/99',
        thread_parent_author_id: null,
        thread_root_author_id: null,
        thread_reply_count: 0,
        thread_participant_count: 0,
        thread_last_activity_at: null,
        like_count: 0,
        // 2 AT quotes + 1 AP quote = 3 total (aggregated by the fixed UNION GROUP BY)
        quote_count: 3,
      },
    ])
    restoreDb = dbMock.restore

    const app = createAuthenticatedTestApp()
    // Use chronological mode so buildBalancedFeed is bypassed (it processes only 'activitypods'/'atproto')
    const response = await app.handle(new Request('http://localhost/at/feed?limit=10&offset=0&source=all&mode=chronological'))

    expect(response.status).toBe(200)

    // Verify query shape: AP arm is present in the UNION and is wrapped by an outer GROUP BY
    const queryDebug = dbMock.getLastExecuteDebug()
    expect(queryDebug.includes('ap_remote_posts')).toBe(true)
    expect(queryDebug.includes('quoted_post_uri')).toBe(true)
    // The outer aggregation wrapper must be present (fan-out fix)
    expect(queryDebug.includes('GROUP BY subject_uri')).toBe(true)

    // Verify the mapped response correctly surfaces the aggregated quote_count
    const payload = await response.json() as Array<Record<string, unknown>>
    expect(Array.isArray(payload)).toBe(true)
    expect(payload).toHaveLength(1)
    expect(payload[0]?.quoteCount).toBe(3)
  })
})
