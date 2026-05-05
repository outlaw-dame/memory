import Elysia, { t } from 'elysia'
import { and, eq } from 'drizzle-orm'
import { db } from '../db/client'
import { bookmarks } from '../db/schema'
import setupPlugin from './setup'

/** A short stable ID that clients use for local deduplication. */
function makePostId(source: string, atUri?: string | null, objectUri?: string | null): string {
  const key = atUri ?? objectUri ?? ''
  return `${source}:${key}`
}

const bookmarksPlugin = new Elysia({ name: 'bookmarks' })
  .use(setupPlugin)
  .guard({
    as: 'scoped',
    isSignedIn: true
  })
  // ------------------------------------------------------------------
  // GET /bookmarks — list all bookmarks for the authenticated user
  // ------------------------------------------------------------------
  .get(
    '/bookmarks',
    async ({ user, error }: any) => {
      const userId: number = user.userId
      if (!userId) return error(401, 'Unauthorized')
      const rows = await db
        .select()
        .from(bookmarks)
        .where(eq(bookmarks.userId, userId))
        .orderBy(bookmarks.bookmarkedAt)
      return rows.map(r => ({
        postId: makePostId(r.source, r.atUri, r.objectUri),
        source: r.source,
        atUri: r.atUri ?? null,
        objectUri: r.objectUri ?? null,
        bookmarkedAt: r.bookmarkedAt.toISOString(),
      }))
    },
    {
      response: {
        200: t.Array(t.Object({
          postId: t.String(),
          source: t.String(),
          atUri: t.Union([t.String(), t.Null()]),
          objectUri: t.Union([t.String(), t.Null()]),
          bookmarkedAt: t.String(),
        })),
        401: t.String(),
      },
      detail: 'List all bookmarks for the authenticated user',
    }
  )
  // ------------------------------------------------------------------
  // POST /bookmarks — add a bookmark
  // ------------------------------------------------------------------
  .post(
    '/bookmarks',
    async ({ body, user, error }: any) => {
      const userId: number = user.userId
      if (!userId) return error(401, 'Unauthorized')
      const { source, atUri, objectUri } = body as {
        source: string
        atUri?: string | null
        objectUri?: string | null
      }
      if (!atUri && !objectUri) {
        return error(400, 'One of atUri or objectUri is required')
      }
      // Check for duplicate — one bookmark per user per URI.
      const existing = await db
        .select({ id: bookmarks.id })
        .from(bookmarks)
        .where(
          and(
            eq(bookmarks.userId, userId),
            atUri
              ? eq(bookmarks.atUri, atUri)
              : eq(bookmarks.objectUri, objectUri as string)
          )
        )
        .limit(1)
      if (existing.length > 0) {
        return { postId: makePostId(source, atUri, objectUri), status: 'exists' }
      }
      await db.insert(bookmarks).values({
        userId,
        source,
        atUri: atUri ?? null,
        objectUri: objectUri ?? null,
      })
      return { postId: makePostId(source, atUri, objectUri), status: 'created' }
    },
    {
      body: t.Object({
        source: t.String({ minLength: 1, maxLength: 32 }),
        atUri: t.Optional(t.Union([t.String({ maxLength: 3072 }), t.Null()])),
        objectUri: t.Optional(t.Union([t.String({ maxLength: 3072 }), t.Null()])),
      }),
      response: {
        200: t.Object({ postId: t.String(), status: t.String() }),
        400: t.String(),
        401: t.String(),
      },
      detail: 'Bookmark a post',
    }
  )
  // ------------------------------------------------------------------
  // DELETE /bookmarks — remove a bookmark by postId
  // ------------------------------------------------------------------
  .delete(
    '/bookmarks',
    async ({ body, user, error }: any) => {
      const userId: number = user.userId
      if (!userId) return error(401, 'Unauthorized')
      const { atUri, objectUri } = body as {
        atUri?: string | null
        objectUri?: string | null
      }
      if (!atUri && !objectUri) {
        return error(400, 'One of atUri or objectUri is required')
      }
      await db
        .delete(bookmarks)
        .where(
          and(
            eq(bookmarks.userId, userId),
            atUri
              ? eq(bookmarks.atUri, atUri)
              : eq(bookmarks.objectUri, objectUri as string)
          )
        )
      return { status: 'deleted' }
    },
    {
      body: t.Object({
        atUri: t.Optional(t.Union([t.String({ maxLength: 3072 }), t.Null()])),
        objectUri: t.Optional(t.Union([t.String({ maxLength: 3072 }), t.Null()])),
      }),
      response: {
        200: t.Object({ status: t.String() }),
        400: t.String(),
        401: t.String(),
      },
      detail: 'Remove a bookmark',
    }
  )

export default bookmarksPlugin
