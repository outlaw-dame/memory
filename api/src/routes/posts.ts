import Elysia, { t } from 'elysia'
import { posts, postsView } from '../db/schema'
import ActivityPod from '../services/ActivityPod'
import { _createPost, selectQueryObject, type SelectPost } from '../types'
import type { NoteCreateRequest } from '../types'
import { db } from '../db/client'
import setupPlugin from './setup'
import { ilike } from 'drizzle-orm'
import { localeFromHeaders, translate } from '../i18n'
import { FEP_C16B_CONTEXT, looksLikeMfm, renderMfmToHtml } from '../utils/mfm'

const postsRoutes = new Elysia({ name: 'posts' })
  .use(setupPlugin)
  .post(
    '/posts',
    async ({ set, body, user, headers }) => {
      const locale = localeFromHeaders(headers)
      const { content, isPublic, postType = 'note', name } = body

      const addressats = [`${user.endpoint}/${user.userName}/followers`]
      if (isPublic) addressats.push('https://www.w3.org/ns/activitystreams#Public')

      const asTypeUri = postType === 'article'
        ? 'https://www.w3.org/ns/activitystreams#Article'
        : 'https://www.w3.org/ns/activitystreams#Note'

      const hasMfm = looksLikeMfm(content)
      const renderedContent = hasMfm ? renderMfmToHtml(content) : content

      const post: NoteCreateRequest = {
        '@context': hasMfm
          ? ['https://www.w3.org/ns/activitystreams', FEP_C16B_CONTEXT]
          : 'https://www.w3.org/ns/activitystreams',
        type: asTypeUri,
        attributedTo: `${user.endpoint}/${user.userName}`,
        content: renderedContent,
        to: addressats,
        ...(hasMfm && {
          htmlMfm: true,
          source: { content, mediaType: 'text/x.misskeymarkdown' },
        }),
      }
      if (name) post.name = name

      let objectUri: string | null = null
      let newPost: SelectPost

      try {
        // Create the post in the ActivityPods pod outbox.
        // user.token is the pod-native JWT (from /auth/login), stored in the DB
        // and used by both the legacy /signin flow and the OIDC flow.
        const created = await ActivityPod.createPost(user, post)
        objectUri = created.objectUri
        // insert the post into the database
        const newPosts = await db
          .insert(posts)
          .values({
            authorId: user.userId,
            content,
            isPublic,
            objectUri,
            postType,
            name: name ?? null
          })
          .returning()
        newPost = {
          id: newPosts[0].id,
          content,
          isPublic,
          postType,
          name: name ?? null,
          authorId: user.userId,
          objectUri: newPosts[0].objectUri || objectUri || null,
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
        isPublic: t.Boolean(),
        postType: t.Optional(t.Union([t.Literal('note'), t.Literal('article')], { default: 'note' })),
        name: t.Optional(t.String({ minLength: 1, maxLength: 500 }))
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
          isPublic: postsView.isPublic,
          createdAt: postsView.createdAt,
          authorId: postsView.authorId,
          objectUri: postsView.objectUri,
          postType: postsView.postType,
          name: postsView.name,
          author: {
            id: postsView.authorId,
            name: postsView.authorName,
            webId: postsView.authorWebId
          }
        })
        .from(postsView)

      if (hashtag && hashtag.trim().length > 0) {
        const pattern = `%${hashtag.replace(/^#/, '#')}%`
        query = query.where(ilike(postsView.content, pattern)) as typeof query
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
