import { Elysia, t } from 'elysia'
import setupPlugin from './setup'
import { decodeWebId, encodeWebId } from '@/util/user'
import { FollowErrors, PodRequestTypes } from '@/types'
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
        await ActivityPod.follow(
          {
            '@context': 'https://www.w3.org/ns/activitystreams',
            type: PodRequestTypes.Follow,
            actor: user.providerWebId,
            object: followedPodProviderWebId,
            to: followedPodProviderWebId
          },
          user
        )
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
      isSignedIn: true,
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
