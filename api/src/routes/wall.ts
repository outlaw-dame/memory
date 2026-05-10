/**
 * Wall Route — Facebook-style profile wall for Memory
 *
 * Implements wall posts using the ActivityStreams 2.0 `target` property on
 * `Create` activities, following Friendica's AP wall implementation pattern.
 *
 * Routes:
 *   GET  /wall/:targetWebId      — fetch wall posts for a profile (paginated)
 *   POST /wall/:targetWebId      — write on someone's wall (auth required)
 *   DELETE /wall/posts/:postId   — delete a wall post (author or wall owner)
 *
 * AP federation: wall posts include `target` pointing to the wall owner's actor
 * URI so federated servers can correctly attribute the post to the recipient's
 * wall context (identical to Friendica's approach).
 */

import Elysia, { t } from 'elysia'
import { signedInGuard } from './elysiaCompat'
import setupPlugin from './setup'
import { db } from '../db/client'
import { posts, users } from '../db/schema'
import ActivityPod from '../services/ActivityPod'
import { buildOutboxPost } from '../postPayload'
import { localeFromHeaders, translate } from '../i18n'
import { and, desc, eq, isNotNull, isNull } from 'drizzle-orm'
import { mergeHashtags } from '../utils/hashtags'

const WALL_POST_CHAR_LIMIT = 500
const WALL_PAGE_DEFAULT = 20
const WALL_PAGE_MAX = 50
/** WebIDs must be absolute HTTP(S) URIs — reject anything else before it reaches the DB. */
const WEBID_URL_RE = /^https?:\/\/.{2,}/i
const WEBID_MAX_LENGTH = 2048

/** Decode a webId that may be URL-encoded in the route path. */
function decodeWebId(raw: string): string {
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

/**
 * Validate that a decoded webId is a well-formed HTTP(S) URL.
 * Prevents arbitrary strings from reaching DB query parameters.
 */
function isValidWebId(webId: string): boolean {
  return (
    webId.length >= 10 &&
    webId.length <= WEBID_MAX_LENGTH &&
    WEBID_URL_RE.test(webId)
  )
}

const wallPlugin = new Elysia({ name: 'wall' })
  .use(setupPlugin)
  // ─── Public: fetch the user's own public posts for their profile ──────────
  .get(
    '/wall/:targetWebId/posts',
    async ({ params, query, set, headers }: any) => {
      const locale = localeFromHeaders(headers)
      const targetWebId = decodeWebId(params.targetWebId)

      if (!isValidWebId(targetWebId)) {
        set.status = 404
        return translate(locale, 'wall.targetNotFound')
      }

      const limit = Math.min(Number(query.limit) || WALL_PAGE_DEFAULT, WALL_PAGE_MAX)
      const offset = Math.max(Number(query.offset) || 0, 0)

      const [targetUser] = await db
        .select({ id: users.id, name: users.name, webId: users.webId })
        .from(users)
        .where(eq(users.webId, targetWebId))
        .limit(1)

      if (!targetUser) {
        set.status = 404
        return translate(locale, 'wall.targetNotFound')
      }

      // Only return the user's own posts (not wall posts written on others' walls)
      const userPosts = await db
        .select({
          id: posts.id,
          content: posts.content,
          hashtags: posts.hashtags,
          postType: posts.postType,
          createdAt: posts.createdAt,
          objectUri: posts.objectUri,
          name: posts.name,
          summary: posts.summary,
        })
        .from(posts)
        .where(
          and(
            eq(posts.authorId, targetUser.id),
            eq(posts.isPublic, true),
            isNull(posts.wallTargetUserId),
          )
        )
        .orderBy(desc(posts.createdAt))
        .limit(limit)
        .offset(offset)

      return {
        targetUser: { id: targetUser.id, name: targetUser.name, webId: targetUser.webId },
        posts: userPosts.map(p => ({
          id: p.id,
          content: p.content,
          hashtags: p.hashtags,
          postType: p.postType,
          createdAt: p.createdAt?.toISOString() ?? null,
          objectUri: p.objectUri,
          name: p.name,
          summary: p.summary,
          author: {
            id: targetUser.id,
            name: targetUser.name,
            webId: targetUser.webId,
          },
        })),
        pagination: { limit, offset },
      }
    },
    {
      params: t.Object({ targetWebId: t.String() }),
      query: t.Object({
        limit: t.Optional(t.Numeric()),
        offset: t.Optional(t.Numeric()),
      }),
      response: {
        200: t.Any(),
        404: t.String(),
      },
      detail: { description: "Fetch a user's own public posts for their profile page" },
    }
  )
  // ─── Public: fetch wall posts for a profile ───────────────────────────────
  .get(
    '/wall/:targetWebId',
    async ({ params, query, set, headers }: any) => {
      const locale = localeFromHeaders(headers)
      const targetWebId = decodeWebId(params.targetWebId)

      if (!isValidWebId(targetWebId)) {
        set.status = 404
        return translate(locale, 'wall.targetNotFound')
      }

      const limit = Math.min(Number(query.limit) || WALL_PAGE_DEFAULT, WALL_PAGE_MAX)
      const offset = Math.max(Number(query.offset) || 0, 0)

      // Resolve target user
      const [targetUser] = await db
        .select({ id: users.id, name: users.name, webId: users.webId })
        .from(users)
        .where(eq(users.webId, targetWebId))
        .limit(1)

      if (!targetUser) {
        set.status = 404
        return translate(locale, 'wall.targetNotFound')
      }

      // Fetch wall posts for this profile (where wallTargetUserId = targetUser.id)
      const wallPosts = await db
        .select({
          id: posts.id,
          content: posts.content,
          hashtags: posts.hashtags,
          postType: posts.postType,
          createdAt: posts.createdAt,
          objectUri: posts.objectUri,
          authorId: posts.authorId,
          authorName: users.name,
          authorWebId: users.webId,
        })
        .from(posts)
        .innerJoin(users, eq(posts.authorId, users.id))
        .where(
          and(
            eq(posts.wallTargetUserId, targetUser.id),
            isNotNull(posts.content),
            eq(posts.isPublic, true),
          )
        )
        .orderBy(desc(posts.createdAt))
        .limit(limit)
        .offset(offset)

      return {
        targetUser: { id: targetUser.id, name: targetUser.name, webId: targetUser.webId },
        posts: wallPosts.map(p => ({
          id: p.id,
          content: p.content,
          hashtags: p.hashtags,
          postType: p.postType,
          createdAt: p.createdAt?.toISOString() ?? null,
          objectUri: p.objectUri,
          author: {
            id: p.authorId,
            name: p.authorName,
            webId: p.authorWebId,
          },
        })),
        pagination: { limit, offset },
      }
    },
    {
      params: t.Object({ targetWebId: t.String() }),
      query: t.Object({
        limit: t.Optional(t.Numeric()),
        offset: t.Optional(t.Numeric()),
      }),
      response: {
        200: t.Any(),
        404: t.String(),
      },
      detail: { description: "Fetch wall posts for a user's profile" },
    }
  )
  // ─── Protected: post on someone's wall ───────────────────────────────────
  .guard(signedInGuard)
  .post(
    '/wall/:targetWebId',
    async ({ params, body, set, headers, user }: any) => {
      const locale = localeFromHeaders(headers)
      const targetWebId = decodeWebId(params.targetWebId)

      if (!isValidWebId(targetWebId)) {
        set.status = 404
        return translate(locale, 'wall.targetNotFound')
      }

      // Trim once; all subsequent checks and inserts use this value.
      const { content: rawContent } = body as { content: string }
      const content = typeof rawContent === 'string' ? rawContent.trim() : ''

      if (content.length === 0) {
        set.status = 400
        return translate(locale, 'wall.postEmpty')
      }
      if (content.length > WALL_POST_CHAR_LIMIT) {
        set.status = 400
        return translate(locale, 'wall.postTooLong')
      }

      // Resolve target profile owner
      const [targetUser] = await db
        .select({ id: users.id, name: users.name, webId: users.webId })
        .from(users)
        .where(eq(users.webId, targetWebId))
        .limit(1)

      if (!targetUser) {
        set.status = 404
        return translate(locale, 'wall.targetNotFound')
      }

      // Build the ActivityPub note with `target` pointing at the wall owner's actor
      const hashtags = mergeHashtags(content, [])
      const note = buildOutboxPost({
        user,
        content,
        hashtags,
        isPublic: true,
        postType: 'note',
      })

      // Attach the AS2 `target` for wall post federation (Friendica-style)
      note.target = targetUser.webId

      let objectUri: string | null = null
      try {
        const created = await ActivityPod.createPost(user, note)
        objectUri = created.objectUri
      } catch (err) {
        console.error('[wall] pod-post-failed', { userId: user.userId, targetWebId, err })
        set.status = 502
        return translate(locale, 'wall.postFailed')
      }

      const [inserted] = await db
        .insert(posts)
        .values({
          authorId: user.userId,
          content,
          hashtags,
          isPublic: true,
          postType: 'note',
          objectUri,
          wallTargetUserId: targetUser.id,
        })
        .returning()

      return {
        id: inserted.id,
        content: inserted.content,
        hashtags: inserted.hashtags,
        postType: inserted.postType,
        createdAt: inserted.createdAt?.toISOString() ?? null,
        objectUri: inserted.objectUri,
        author: {
          id: user.userId,
          name: user.userName,
          webId: user.getWebId(),
        },
        targetUser: {
          id: targetUser.id,
          name: targetUser.name,
          webId: targetUser.webId,
        },
      }
    },
    {
      params: t.Object({ targetWebId: t.String() }),
      body: t.Object({ content: t.String() }),
      response: {
        200: t.Any(),
        400: t.String(),
        404: t.String(),
        502: t.String(),
      },
      detail: { description: "Write a post on a user's wall" },
    }
  )
  // ─── Protected: delete a wall post ────────────────────────────────────────
  .delete(
    '/wall/posts/:postId',
    async ({ params, set, headers, user }: any) => {
      const locale = localeFromHeaders(headers)
      const postId = Number(params.postId)
      if (!Number.isInteger(postId) || postId <= 0) {
        set.status = 400
        return translate(locale, 'wall.invalidPostId')
      }

      // Fetch the wall post with its target user info
      const [wallPost] = await db
        .select({
          id: posts.id,
          authorId: posts.authorId,
          wallTargetUserId: posts.wallTargetUserId,
        })
        .from(posts)
        .where(and(eq(posts.id, postId), isNotNull(posts.wallTargetUserId)))
        .limit(1)

      if (!wallPost) {
        set.status = 404
        return translate(locale, 'wall.postNotFound')
      }

      // Only the post author or the wall owner may delete
      const isAuthor = wallPost.authorId === user.userId
      const isWallOwner = wallPost.wallTargetUserId === user.userId
      if (!isAuthor && !isWallOwner) {
        set.status = 403
        return translate(locale, 'wall.forbidden')
      }

      await db.delete(posts).where(eq(posts.id, postId))

      set.status = 204
      return null
    },
    {
      params: t.Object({ postId: t.String() }),
      response: {
        204: t.Null(),
        400: t.String(),
        403: t.String(),
        404: t.String(),
      },
      detail: { description: 'Delete a wall post (author or wall owner only)' },
    }
  )

export default wallPlugin
