import Elysia, { t } from 'elysia'
import ActivityPod from '../services/ActivityPod'
import setupPlugin from './setup'

const isAbsoluteHttpsUrl = (value: string): boolean => {
  try {
    const u = new URL(value)
    return u.protocol === 'https:'
  } catch {
    return false
  }
}

const actorMetadataPlugin = new Elysia({ name: 'actorMetadata' })
  .use(setupPlugin)
  .guard({
    as: 'scoped',
    isSignedIn: true
  })
  .post(
    '/actor-metadata/verify',
    async ({ error, body, user }: any) => {
      if (!user?.endpoint || !user?.userName) {
        return error(401, 'You must be signed in to do that')
      }
      if (body.actorUri && !isAbsoluteHttpsUrl(body.actorUri)) {
        return error(400, 'actorUri must be an absolute https:// URL')
      }

      try {
        return await ActivityPod.verifyActorMetadata(user, body.actorUri)
      } catch (e) {
        console.error('Error while verifying actor metadata:', e)
        return error(502, 'Pod server actor metadata verification request failed')
      }
    },
    {
      body: t.Object({
        actorUri: t.Optional(t.String({ minLength: 9, maxLength: 2048 }))
      }),
      response: {
        200: t.Any(),
        400: t.String(),
        401: t.String(),
        502: t.String()
      },
      detail: 'Verify rel=me links for the authenticated ActivityPub actor metadata'
    }
  )
  .post(
    '/actor-metadata/verify-link',
    async ({ error, body, user }: any) => {
      if (!user?.endpoint || !user?.userName) {
        return error(401, 'You must be signed in to do that')
      }
      if (!isAbsoluteHttpsUrl(body.href)) {
        return error(400, 'href must be an absolute https:// URL')
      }
      if (body.actorUri && !isAbsoluteHttpsUrl(body.actorUri)) {
        return error(400, 'actorUri must be an absolute https:// URL')
      }

      try {
        return await ActivityPod.verifyRelMeLink(user, body.href, body.actorUri)
      } catch (e) {
        console.error('Error while verifying rel=me link:', e)
        return error(502, 'Pod server rel=me verification request failed')
      }
    },
    {
      body: t.Object({
        href: t.String({ minLength: 9, maxLength: 2048 }),
        actorUri: t.Optional(t.String({ minLength: 9, maxLength: 2048 }))
      }),
      response: {
        200: t.Any(),
        400: t.String(),
        401: t.String(),
        502: t.String()
      },
      detail: 'Verify a single rel=me link against the authenticated ActivityPub actor'
    }
  )

export default actorMetadataPlugin
