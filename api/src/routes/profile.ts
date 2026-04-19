import Elysia, { t } from 'elysia'
import ActivityPod from '../services/ActivityPod'
import setupPlugin from './setup'
import { applyLocaleHeaders, localeFromHeaders, translate } from '../i18n'
import { normalizeProfileActorUpdate, ProfileStatusValidationError } from '../profileStatus'
import { normalizeProfileAuthorAttribution, ProfileAuthorAttributionValidationError } from '../profileAuthorAttribution'

const profilePlugin = new Elysia({ name: 'profile' })
  .use(setupPlugin)
  .guard({
    as: 'scoped',
    isSignedIn: true
  })
  .get(
    '/profile',
    async ({ set, user, headers }: any) => {
      const locale = localeFromHeaders(headers)
      applyLocaleHeaders(set, locale)
      if (!user?.endpoint || !user?.userName) {
        set.status = 401
        return translate(locale, 'common.mustBeSignedIn')
      }
      try {
        return await ActivityPod.getProfile(user)
      } catch (e) {
        console.error('Error while fetching profile:', e)
        set.status = 502
        return translate(locale, 'profile.fetchFailed')
      }
    },
    {
      response: {
        200: t.Any(),
        401: t.String(),
        502: t.String()
      },
      detail: 'Fetch the authenticated ActivityPub actor profile'
    }
  )
  .put(
    '/profile',
    async ({ set, body, user, headers }: any) => {
      const locale = localeFromHeaders(headers)
      applyLocaleHeaders(set, locale)
      if (!user?.endpoint || !user?.userName) {
        set.status = 401
        return translate(locale, 'common.mustBeSignedIn')
      }
      if (!body.actor || typeof body.actor !== 'object' || Array.isArray(body.actor)) {
        set.status = 400
        return translate(locale, 'profile.actorMustBeObject')
      }

      let currentProfile: Record<string, unknown>
      try {
        currentProfile = await ActivityPod.getProfile(user)
      } catch (e) {
        console.error('Error while fetching current profile for update:', e)
        set.status = 502
        return translate(locale, 'profile.currentFetchFailed')
      }

      let actor: Record<string, unknown>
      try {
        actor = normalizeProfileActorUpdate(body.actor, {
          actorId: user.getWebId(),
          existingActor: currentProfile
        })
        actor = normalizeProfileAuthorAttribution(actor, {
          existingActor: currentProfile
        })
      } catch (error) {
        if (error instanceof ProfileStatusValidationError || error instanceof ProfileAuthorAttributionValidationError) {
          set.status = 400
          return translate(locale, error.translationKey)
        }

        console.error('Error while normalizing profile status:', error)
        set.status = 400
        return translate(locale, 'profile.updateFailed')
      }

      try {
        await ActivityPod.updateProfile(user, actor)
        return await ActivityPod.getProfile(user)
      } catch (e) {
        console.error('Error while updating profile:', e)
        set.status = 502
        return translate(locale, 'profile.updateFailed')
      }
    },
    {
      body: t.Object({
        actor: t.Any()
      }),
      response: {
        200: t.Any(),
        400: t.String(),
        401: t.String(),
        502: t.String()
      },
      detail: 'Update the authenticated ActivityPub actor profile'
    }
  )

export default profilePlugin
