import Elysia, { t } from 'elysia'
import { posts, postsView } from '../db/schema'
import ActivityPod from '../services/ActivityPod'
import { _createPost, selectQueryObject, type SelectPost } from '../types'
import { db } from '..'
import setupPlugin from './setup'

const postsRoutes = new Elysia({ name: 'posts' })
  .use(setupPlugin)
  .guard({
    isSignedIn: true
  })
  .post(
    '/posts',
    async ({ error, body, user }) => {
      const { content, isPublic } = body

      const addressats = [`${user.endpoint}/${user.userName}/followers`]
      if (isPublic) addressats.push('https://www.w3.org/ns/activitystreams#Public')

      const post = {
        '@context': 'https://www.w3.org/ns/activitystreams',
        type: 'Note',
        attributedTo: `${user.endpoint}/${user.userName}`,
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
            name: user.userName,
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
      body: t.Omit(_createPost, ['id', 'created_at', 'authorId']),
      detail: 'Creates a new post',
      isSignedIn: true
    }
  )
  .get(
    '/posts',
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
