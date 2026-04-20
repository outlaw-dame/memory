import Elysia, { t } from 'elysia'
import { posts, postsView } from '../db/schema'
import ActivityPod from '../services/ActivityPod'
import { _createPost, selectQueryObject, type SelectPost } from '../types'
import type { NoteCreateRequest } from '../types'
import { db } from '../db/client'
import setupPlugin from './setup'
import { ilike, or, sql } from 'drizzle-orm'
import { localeFromHeaders, translate } from '../i18n'
import { buildOutboxPost } from '../postPayload'
import { deriveArticleCanonicalUrl } from '../articleShare'
import { mergeHashtags, normalizeHashtag } from '../utils/hashtags'

const postsRoutes = new Elysia({ name: 'posts' })
  .use(setupPlugin)
  .post(
    '/posts',
    async ({ set, body, user, headers }) => {
      const locale = localeFromHeaders(headers)
      const { content, hashtags, isPublic, postType = 'note', name, summary } = body
      const normalizedHashtags = mergeHashtags(content, hashtags)

      const post: NoteCreateRequest = buildOutboxPost({
        user,
        content,
        hashtags: normalizedHashtags,
        isPublic,
        postType,
        name,
        summary,
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
            summary: summary ?? null
          })
          .returning()
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
        console.error('Error while creating the post: ', e)
        set.status = 500
        return translate(locale, 'posts.createFailed')
      }

      return newPost
    },
    {
      body: t.Object({
        content: t.String({ minLength: 1 }),
        hashtags: t.Optional(t.Array(t.String({ minLength: 1, maxLength: 65 }), { maxItems: 50 })),
        isPublic: t.Boolean(),
        postType: t.Optional(t.Union([t.Literal('note'), t.Literal('article')], { default: 'note' })),
        name: t.Optional(t.String({ minLength: 1, maxLength: 160 })),
        summary: t.Optional(t.String({ minLength: 1, maxLength: 500 }))
      }),
      detail: 'Creates a new post',
      isSignedIn: true
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
      detail: 'Returns all public posts',
      isSignedIn: true,
      query: selectQueryObject,
      response: {
        200: t.Array(t.Any())
      }
    }
  )

export default postsRoutes
