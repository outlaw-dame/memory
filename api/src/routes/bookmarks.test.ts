import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import Elysia from 'elysia'
import { db } from '../db/client'
import setupPlugin from './setup'
import bookmarksPlugin from './bookmarks'

type DbLike = Record<string, unknown>

function queryRows(rows: unknown[]) {
  const chain = {
    from: () => chain,
    where: () => chain,
    orderBy: () => chain,
    limit: () => chain,
    then: (
      resolve: (value: unknown[]) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(rows).then(resolve, reject),
    catch: (reject: (reason: unknown) => unknown) => Promise.resolve(rows).catch(reject),
    finally: (fn: () => void) => Promise.resolve(rows).finally(fn),
  } as Record<string, unknown>
  return chain
}

function requestJson(path: string, init?: RequestInit) {
  return new Request(`http://localhost${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
}

function createAuthenticatedApp(userId = 42) {
  return new Elysia({ aot: false })
    .use(setupPlugin)
    .macro({ isSignedIn: (_enabled: boolean) => ({}) })
    .onBeforeHandle({ as: 'global' }, ({ user }: any) => {
      user.userId = userId
    })
    .use(bookmarksPlugin)
}

describe('bookmarks routes', () => {
  const dbLike = db as unknown as DbLike
  const originals = {
    select: dbLike.select,
    insert: dbLike.insert,
    delete: dbLike.delete,
  }

  beforeEach(() => {
    dbLike.select = () => queryRows([])
    dbLike.insert = () => ({
      values: () => ({
        then: (resolve: (value: unknown[]) => unknown) => Promise.resolve([]).then(resolve),
      }),
    })
    dbLike.delete = () => ({
      where: () => ({
        then: (resolve: (value: unknown[]) => unknown) => Promise.resolve([]).then(resolve),
      }),
    })
  })

  afterEach(() => {
    dbLike.select = originals.select
    dbLike.insert = originals.insert
    dbLike.delete = originals.delete
  })

  it('uses the authenticated Memory user id when listing bookmarks', async () => {
    const app = createAuthenticatedApp()
    dbLike.select = () => queryRows([{
      source: 'activitypods',
      atUri: null,
      objectUri: 'https://pods.example/alice/posts/1',
      bookmarkedAt: new Date('2026-05-04T12:00:00.000Z'),
    }])

    const res = await app.handle(requestJson('/bookmarks'))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([{
      postId: 'activitypods:https://pods.example/alice/posts/1',
      source: 'activitypods',
      atUri: null,
      objectUri: 'https://pods.example/alice/posts/1',
      bookmarkedAt: '2026-05-04T12:00:00.000Z',
    }])
  })

  it('allows multiple ActivityPub bookmarks by checking objectUri duplicates specifically', async () => {
    const app = createAuthenticatedApp()
    let inserted: Record<string, unknown> | null = null
    dbLike.select = () => queryRows([])
    dbLike.insert = () => ({
      values: (values: Record<string, unknown>) => {
        inserted = values
        return {
          then: (resolve: (value: unknown[]) => unknown) => Promise.resolve([]).then(resolve),
        }
      },
    })

    const res = await app.handle(requestJson('/bookmarks', {
      method: 'POST',
      body: JSON.stringify({
        source: 'activitypods',
        objectUri: 'https://pods.example/alice/posts/2',
      }),
    }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      postId: 'activitypods:https://pods.example/alice/posts/2',
      status: 'created',
    })
    expect(inserted).toMatchObject({
      userId: 42,
      source: 'activitypods',
      atUri: null,
      objectUri: 'https://pods.example/alice/posts/2',
    })
  })
})
