import { eq } from 'drizzle-orm'
import Elysia, { t } from 'elysia'
import { posts } from '../db/schema'
import ActivityPod from '../services/ActivityPod'
import { _createPost, _selectposts, selectQueryObject, type SelectPosts } from '../types'
import { db } from '..'
import User from '../decorater/User'

const postsRoutes = new Elysia()
  .decorate('user', new User())
  .guard({
    isSignedIn: true
  })
  .post(
    '/posts',
    async ({ error, body, user }) => {
      const { content, isPublic } = body

      const addressats = [`${user.userId}/followers`]
      if (isPublic) addressats.push('https://www.w3.org/ns/activitystreams#Public')

      const post = {
        '@context': 'https://www.w3.org/ns/activitystreams',
        type: 'Note',
        attributedTo: user.userId,
        content: content,
        to: addressats
      }
      let newPost: SelectPosts

      try {
        // create the post in the pod
        await ActivityPod.createPost(user, post)
        // insert the post into the database
        const newPosts = await db.insert(posts).values({
          content,
          isPublic
        }).returning()
        newPost = newPosts[0]
      } catch (e) {
        console.error('Error while creating the post: ', e)
        return error(500, 'Error while creating the post')
      }

      return newPost
    },
    {
      body: t.Omit(_createPost, ['id', 'created_at']),
      response: {
        200: _selectposts,
        500: t.String()
      },
      detail: 'Creates a new post',
      isSignedIn: true
    }
  )
  .get(
    '/posts',
    async ({ query: { limit, offset } }) => {
      const postsQuery = await db.select().from(posts).where(eq(posts.isPublic, true)).limit(limit).offset(offset)
      return postsQuery
    },
    {
      detail: 'Returns all public posts',
      isSignedIn: true,
      query: selectQueryObject,
      response: {
        200: t.Array(_selectposts)
      }
    }
  )

export default postsRoutes
