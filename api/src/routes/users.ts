import { Elysia, t } from 'elysia'
import setupPlugin from './setup'
import { decodeWebId, encodeWebId } from '@/util/user'
import {
  FollowErrors,
  followersFollowedResponse,
  followUnfollowResponse,
  PodRequestTypes,
  selectQueryObject,
  type FollowersFollowedResponse
} from '@/types'
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
          name: users.name,
          webId: users.webId,
          displayName: users.displayName,
          providerName: users.providerName
        })
        .from(followers)
        .leftJoin(users, eq(followers.followedId, users.id))
        .where(eq(followers.followerId, user.userId))
        .limit(limit)
        .offset(offset)
      return followingResponse as FollowersFollowedResponse[]
    },
    {
      detail: 'Returns the users the user is following',
      response: {
        200: t.Array(followersFollowedResponse)
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
          name: users.name,
          webId: users.webId,
          displayName: users.displayName,
          providerName: users.providerName
        })
        .from(followers)
        .leftJoin(users, eq(followers.followerId, users.id))
        .where(eq(followers.followedId, user.userId))
        .limit(limit)
        .offset(offset)
      return followersResponse as FollowersFollowedResponse[]
    },
    {
      detail: 'Returns the followers of the user',
      query: selectQueryObject,
      response: {
        200: t.Array(followersFollowedResponse)
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
        200: followUnfollowResponse,
        400: t.Enum(FollowErrors)
      }
    }
  )
  .delete(
    '/:followerWebId/unfollow',
    async ({ params: { followerWebId }, user, error }) => {
      try {
        // get the id of the user to unfollow
        const toUnfollow = await db.select().from(users).where(eq(users.webId, followerWebId)).limit(1)
        if (toUnfollow.length === 0) return error(400, FollowErrors.NotOnMemory)
        const userToUnfollow = toUnfollow[0]
        const webIdToUnfollow = decodeWebId(followerWebId)
        // check if user is following the user
        const isFollowing = await db
          .select()
          .from(followers)
          .where(and(eq(followers.followerId, user.userId), eq(followers.followedId, userToUnfollow.id)))
          .limit(1)
        if (isFollowing.length === 0) {
          return error(400, FollowErrors.NotFollowing)
        }

        // send unfollow request to the pod
        await ActivityPod.unfollow(user, {
          '@context': 'https://www.w3.org/ns/activitystreams',
          type: PodRequestTypes.Undo,
          actor: user.providerWebId,
          object: {
            actor: user.providerWebId,
            type: PodRequestTypes.Follow,
            object: webIdToUnfollow.endpointWebId
          },
          to: userToUnfollow.webId
        })
        // remove the follow from the database
        await db
          .delete(followers)
          .where(and(eq(followers.followerId, user.userId), eq(followers.followedId, userToUnfollow.id)))

        return 'Success'
      } catch (_) {
        // this only happens when the decodeWebId throws an error
        return error(400, FollowErrors.NotValidProvider)
      }
    },
    {
      summary: 'Unfollow a user',
      params: t.Object({
        followerWebId: t.String()
      }),
      response: {
        200: followUnfollowResponse,
        400: t.Enum(FollowErrors)
      }
    }
  )
