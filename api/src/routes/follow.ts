import Elysia, { t } from 'elysia'
import ActivityPod from '../services/ActivityPod'
import setupPlugin from './setup'
import { localeFromHeaders, translate } from '../i18n'

const isAbsoluteHttpsUrl = (value: string): boolean => {
  try {
    const u = new URL(value)
    return u.protocol === 'https:'
  } catch {
    return false
  }
}

const followPlugin = new Elysia({ name: 'follow' })
  .use(setupPlugin)
  .guard({
    as: 'scoped',
    isSignedIn: true
  })
  .post(
    '/follows/resolve',
    async ({ body, user, headers, error }: any) => {
      const locale = localeFromHeaders(headers)
      if (!isAbsoluteHttpsUrl(body.objectUri)) {
        return error(400, translate(locale, 'follow.objectUriHttps'))
      }
      try {
        return await ActivityPod.resolveFollowTarget(user, body.objectUri)
      } catch (e) {
        console.error('Error while resolving follow target:', e)
        return error(502, translate(locale, 'follow.resolveFailed'))
      }
    },
    {
      body: t.Object({
        objectUri: t.String({ minLength: 9, maxLength: 2048 })
      }),
      response: {
        200: t.Any(),
        400: t.String(),
        401: t.String(),
        502: t.String()
      },
      detail: 'Resolve whether an ActivityPub object is followable and where the Follow will be delivered'
    }
  )
  .post(
    '/follows',
    async ({ body, user, headers, error }: any) => {
      const locale = localeFromHeaders(headers)
      const { objectUri } = body
      if (!isAbsoluteHttpsUrl(objectUri)) {
        return error(400, translate(locale, 'follow.objectUriHttps'))
      }
      try {
        await ActivityPod.followObject(user, objectUri)
      } catch (e) {
        console.error('Error while following object:', e)
        return error(502, translate(locale, 'follow.failed'))
      }
      return { followed: true }
    },
    {
      body: t.Object({ objectUri: t.String({ minLength: 9, maxLength: 2048 }) }),
      response: {
        200: t.Object({ followed: t.Boolean() }),
        400: t.String(),
        401: t.String(),
        502: t.String()
      },
      detail: 'Follow a followable ActivityPub object via FEP-efda resolution'
    }
  )

export default followPlugin
