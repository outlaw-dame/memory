import Elysia, { t } from 'elysia'
import { signedIn } from './elysiaCompat'
import { posts, postsView } from '../db/schema'
import ActivityPod from '../services/ActivityPod'
import { _createPost, selectQueryObject, type SelectPost } from '../types'
import type { NoteCreateRequest } from '../types'
import { db } from '../db/client'
import setupPlugin from './setup'
import { and, eq, ilike, or, sql } from 'drizzle-orm'
import { localeFromHeaders, translate } from '../i18n'
import { buildOutboxPost } from '../postPayload'
import { deriveArticleCanonicalUrl } from '../articleShare'
import { mergeHashtags, normalizeHashtag } from '../utils/hashtags'
import {
  hashPostRequest,
  markMediaAttachmentsAttached,
  MediaAttachmentError,
  normalizeIdempotencyKey,
  normalizeMediaAttachmentIds,
  resolveAttachableMediaAttachments,
  toActivityPubMediaAttachment,
} from '../services/MediaAttachments'

const postsRoutes = new Elysia({ name: 'posts' })
  .use(setupPlugin)
  .post(
    '/posts',
    async ({ set, body, user, headers }) => {
      const locale = localeFromHeaders(headers)
      const { content, hashtags, isPublic, postType = 'note', name, summary, attachments, attachmentIds = [] } = body
      if (content.trim().length === 0 && (!attachments || attachments.length === 0) && attachmentIds.length === 0) {
        set.status = 400
        return translate(locale, 'posts.contentOrAttachmentRequired')
      }
      const normalizedHashtags = mergeHashtags(content, hashtags)

      let idempotencyKey: string | null = null
      let idempotencyRequestHash: string | null = null
      const normalizedAttachmentIds = normalizeMediaAttachmentIds(attachmentIds)
      let durableAttachments: Awaited<ReturnType<typeof resolveAttachableMediaAttachments>> = []

      try {
        idempotencyKey = normalizeIdempotencyKey(headers['idempotency-key'] ?? body.idempotencyKey)
        if (idempotencyKey) {
          idempotencyRequestHash = hashPostRequest({
            content,
            hashtags: normalizedHashtags,
            isPublic,
            postType,
            name: name ?? null,
            summary: summary ?? null,
            attachmentIds: normalizedAttachmentIds,
            attachments: attachments ?? [],
          })

          const existingPost = await findIdempotentPost(user.userId, idempotencyKey)
          if (existingPost) {
            if (existingPost.clientPostRequestHash !== idempotencyRequestHash) {
              set.status = 409
              return translate(locale, 'posts.idempotencyKeyConflict')
            }
            return toSelectPost(existingPost, user)
          }
        }

        durableAttachments = await resolveAttachableMediaAttachments(user.userId, normalizedAttachmentIds)
      } catch (error) {
        if (error instanceof MediaAttachmentError) {
          set.status = error.status as any
          return translate(locale, error.translationKey)
        }
        throw error
      }

      const outboxAttachments = [
        ...durableAttachments.map(toActivityPubMediaAttachment),
        ...(attachments ?? []),
      ]

      const post: NoteCreateRequest = buildOutboxPost({
        user,
        content,
        hashtags: normalizedHashtags,
        isPublic,
        postType,
        name,
        summary,
        attachments: outboxAttachments,
      })

      let objectUri: string | null = null
      let canonicalUrl: string | null = null
      let newPost: SelectPost

      try {
        // Create the post in the ActivityPods pod outbox.
        // user.token is the pod-native JWT (from /auth/login), stored in the DB
        // and used by both the legacy /signin flow and the OIDC flow.
        const created = await ActivityPod.createPost(user, post)
        objectUri = created.objectUri
        canonicalUrl = postType === 'article' ? deriveArticleCanonicalUrl(objectUri) : null

        // Structured audit record written BEFORE the DB insert so that the
        // objectUri is durably logged even if the insert fails or the process
        // crashes.  This lets an operator reconcile split-brain cases where the
        // post exists in the pod but not in Memory's database.
        console.info('[posts] pod-post-created', {
          userId: user.userId,
          objectUri,
          idempotencyKey: idempotencyKey ?? null,
        })

        // insert the post into the database
        const newPosts = await db
          .insert(posts)
          .values({
            authorId: user.userId,
            content,
            hashtags: normalizedHashtags,
            isPublic,
            objectUri,
            canonicalUrl,
            postType,
            name: name ?? null,
            summary: summary ?? null,
            clientPostKey: idempotencyKey,
            clientPostRequestHash: idempotencyRequestHash,
          })
          .returning()
        if (normalizedAttachmentIds.length > 0) {
          await markMediaAttachmentsAttached(user.userId, normalizedAttachmentIds, newPosts[0].id)
        }
        newPost = {
          id: newPosts[0].id,
          content,
          hashtags: newPosts[0].hashtags,
          isPublic,
          postType,
          name: name ?? null,
          summary: summary ?? null,
          authorId: user.userId,
          objectUri: newPosts[0].objectUri || objectUri || null,
          canonicalUrl: newPosts[0].canonicalUrl || canonicalUrl || null,
          createdAt: newPosts[0].createdAt?.toString() || '',
          author: {
            id: user.userId,
            name: user.userName,
            webId: user.getWebId()
          }
        }
      } catch (e) {
        if (idempotencyKey && isUniqueViolation(e)) {
          const existingPost = await findIdempotentPost(user.userId, idempotencyKey)
          if (existingPost?.clientPostRequestHash === idempotencyRequestHash) {
            return toSelectPost(existingPost, user)
          }
        }
        // If we already created the pod post (objectUri is set) but the local
        // DB insert failed, log a structured reconciliation record so an
        // operator can manually re-insert the row.  The audit log line written
        // before the insert (pod-post-created) also persists the objectUri.
        if (objectUri) {
          console.error('[posts] pod-post-db-failure', {
            userId: user.userId,
            objectUri,
            idempotencyKey: idempotencyKey ?? null,
            error: e instanceof Error ? e.message : String(e),
          })
        } else {
          console.error('Error while creating the post: ', e)
        }
        set.status = 500
        return translate(locale, 'posts.createFailed')
      }

      return newPost
    },
    {
      body: t.Object({
        content: t.String({ minLength: 0 }),
        hashtags: t.Optional(t.Array(t.String({ minLength: 1, maxLength: 65 }), { maxItems: 50 })),
        isPublic: t.Boolean(),
        postType: t.Optional(t.Union([t.Literal('note'), t.Literal('article')], { default: 'note' })),
        name: t.Optional(t.String({ minLength: 1, maxLength: 160 })),
        summary: t.Optional(t.String({ minLength: 1, maxLength: 500 })),
        attachments: t.Optional(t.Array(t.Object({
          type: t.Union([t.Literal('Image'), t.Literal('Video')]),
          mediaType: t.String({ minLength: 3, maxLength: 120, pattern: '^(image/(avif|gif|jpeg|png|webp)|video/(mp4|quicktime|webm))$' }),
          url: t.String({ minLength: 1, maxLength: 2048 }),
          name: t.Optional(t.String({ minLength: 1, maxLength: 160 }))
        }), { maxItems: 8 })),
        attachmentIds: t.Optional(t.Array(t.String({ minLength: 36, maxLength: 36 }), { maxItems: 8 })),
        idempotencyKey: t.Optional(t.String({ minLength: 1, maxLength: 128 }))
      }),
      detail: { description: 'Creates a new post' },
      ...signedIn,
    }
  )
  .get(
    '/posts',
    async ({ query: { limit, offset, hashtag } }) => {
      let query = db
        .select({
          id: postsView.id,
          content: postsView.content,
            hashtags: postsView.hashtags,
          isPublic: postsView.isPublic,
          createdAt: postsView.createdAt,
          authorId: postsView.authorId,
          objectUri: postsView.objectUri,
          canonicalUrl: postsView.canonicalUrl,
          postType: postsView.postType,
          name: postsView.name,
          summary: postsView.summary,
          author: {
            id: postsView.authorId,
            name: postsView.authorName,
            webId: postsView.authorWebId
          }
        })
        .from(postsView)

      if (hashtag && hashtag.trim().length > 0) {
        const normalizedHashtag = normalizeHashtag(hashtag)
        if (normalizedHashtag) {
          const pattern = `%${normalizedHashtag}%`
          query = query.where(
            or(
              ilike(postsView.content, pattern),
              sql`${postsView.hashtags} @> ARRAY[${normalizedHashtag}]::text[]`
            )
          ) as typeof query
        }
      }

      const postsQuery = await query.limit(limit).offset(offset)
      return postsQuery
    },
    {
      detail: { description: 'Returns all public posts' },
      ...signedIn,
      query: selectQueryObject,
      response: {
        200: t.Array(t.Any())
      }
    }
  )

async function findIdempotentPost(userId: number, idempotencyKey: string): Promise<typeof posts.$inferSelect | null> {
  const [row] = await db
    .select()
    .from(posts)
    .where(and(eq(posts.authorId, userId), eq(posts.clientPostKey, idempotencyKey)))
    .limit(1)
  return row ?? null
}

function toSelectPost(row: typeof posts.$inferSelect, user: any): SelectPost {
  return {
    id: row.id,
    content: row.content,
    hashtags: row.hashtags,
    isPublic: row.isPublic,
    postType: row.postType,
    name: row.name ?? null,
    summary: row.summary ?? null,
    authorId: user.userId,
    objectUri: row.objectUri ?? null,
    canonicalUrl: row.canonicalUrl ?? null,
    createdAt: row.createdAt?.toString() || '',
    author: {
      id: user.userId,
      name: user.userName,
      webId: user.getWebId()
    }
  }
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && (error as { code?: string }).code === '23505')
}

export default postsRoutes
