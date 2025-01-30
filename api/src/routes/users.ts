import { Elysia, t } from 'elysia'
import setupPlugin from './setup'
import { decodeWebId, encodeWebId } from '@/util/user'
import { FollowErrors, followersResponse, PodRequestTypes, selectQueryObject, type FollowersResponse } from '@/types'
import { db } from '..'
import { eq, and } from 'drizzle-orm'
import { users, followers } from '@/db/schema'
import ActivityPod from '@/services/ActivityPod'

export default new Elysia({ name: 'user', prefix: '/user' })
  .use(setupPlugin)
  .guard({
    isSignedIn: true
  })
  .get(
    '/following',
    async ({ user, query: { limit, offset } }) => {
      const followingResponse = await db
        .select({
          id: users.id,
          username: users.displayName,
          webId: users.webId
        })
        .from(followers)
        .leftJoin(users, eq(followers.followedId, users.id))
        .where(eq(followers.followerId, user.userId))
        .limit(limit)
        .offset(offset)
      return followingResponse as FollowersResponse[]
    },
    {
      detail: 'Returns the users the user is following',
      response: {
        200: t.Array(followersResponse)
      },
      query: selectQueryObject
    }
  )
  .get(
    '/followers',
    async ({ user, query: { limit, offset } }) => {
      const followersResponse = await db
        .select({
          id: users.id,
          username: users.displayName,
          webId: users.webId
        })
        .from(followers)
        .leftJoin(users, eq(followers.followerId, users.id))
        .where(eq(followers.followedId, user.userId))
        .limit(limit)
        .offset(offset)
      return followersResponse as FollowersResponse[]
    },
    {
      detail: 'Returns the followers of the user',
      query: selectQueryObject,
      response: {
        200: t.Array(followersResponse)
      }
    }
  )
  .post(
    '/:followerWebId/follow',
    async ({ user, params: { followerWebId }, error }) => {
      try {
        // check if user to follow is on memory
        const webId = encodeWebId(user)
        if (webId === followerWebId) return error(400, FollowErrors.IsSelf)

        // check if user to follow is on memory
        const toFollow = await db.select().from(users).where(eq(users.webId, followerWebId)).limit(1)
        if (toFollow.length === 0) return error(400, FollowErrors.NotOnMemory)
        const userToFollow = toFollow[0]

        // check if user is already following the user
        const following = await db
          .select()
          .from(followers)
          .where(and(eq(followers.followerId, user.userId), eq(followers.followedId, userToFollow.id)))
          .limit(1)
        if (following.length > 0) return error(400, FollowErrors.AlreadyFollowing)

        // Follow the user
        const decodedFollowedWebId = decodeWebId(followerWebId)
        const followedPodProviderWebId = decodedFollowedWebId.endpoint + '/' + decodedFollowedWebId.username
        await ActivityPod.follow(user, {
          '@context': 'https://www.w3.org/ns/activitystreams',
          type: PodRequestTypes.Follow,
          actor: user.providerWebId,
          object: followedPodProviderWebId,
          to: followedPodProviderWebId
        })
        // add the relationship to the database
        await db.insert(followers).values({
          followerId: user.userId,
          followedId: userToFollow.id
        })

        return 'Success'
      } catch (_) {
        console.log(_)
        return error(400, FollowErrors.NotValidProvider)
      }
    },
    {
      detail: 'Follows a user',
      params: t.Object({
        followerWebId: t.String()
      }),
      response: {
        200: t.String(),
        400: t.Enum(FollowErrors)
      }
    }
  )
