import Elysia, { t } from 'elysia'
import { posts, postsView } from '../db/schema'
import ActivityPod from '../services/ActivityPod'
import { _createPost, PodRequestTypes, selectQueryObject, type NoteCreateRequest, type SelectPost } from '../types'
import { db } from '..'
import setupPlugin from './setup'

const postsRoutes = new Elysia({ name: 'posts', prefix: '/posts' })
  .use(setupPlugin)
  .guard({
    isSignedIn: true
  })
  .post(
    '/',
    async ({ error, body, user }) => {
      const { content, isPublic } = body

      const addressats = [`${user.endpoint}/${user.username}/followers`]
      if (isPublic) addressats.push('https://www.w3.org/ns/activitystreams#Public')

      const post: NoteCreateRequest = {
        '@context': 'https://www.w3.org/ns/activitystreams',
        type: PodRequestTypes.Note,
        attributedTo: `${user.endpoint}/${user.username}`,
        content: content,
        to: addressats
      }
      let newPost: SelectPost

      try {
        // create the post in the pod
        await ActivityPod.createPost(user, post)
        // insert the post into the database
        const newPosts = await db
          .insert(posts)
          .values({
            authorId: user.userId,
            content,
            isPublic
          })
          .returning()
        newPost = {
          id: newPosts[0].id,
          content,
          isPublic,
          authorId: user.userId,
          createdAt: newPosts[0].createdAt?.toString() || '',
          author: {
            id: user.userId,
            name: user.username,
            webId: user.getWebId()
          }
        }
      } catch (e) {
        console.error('Error while creating the post: ', e)
        return error(500, 'Error while creating the post')
      }

      return newPost
    },
    {
      body: _createPost,
      detail: 'Creates a new post',
      isSignedIn: true
    }
  )
  .get(
    '/',
    async ({ query: { limit, offset } }) => {
      const postsQuery = await db
        .select({
          id: postsView.id,
          content: postsView.content,
          isPublic: postsView.isPublic,
          createdAt: postsView.createdAt,
          authorId: postsView.authorId,
          author: {
            id: postsView.authorId,
            name: postsView.authorName,
            webId: postsView.authorWebId
          }
        })
        .from(postsView)
        .limit(limit)
        .offset(offset)
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
