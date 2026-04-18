import { users } from "../db/schema"
import ActivityPod from "../services/ActivityPod"
import {
  type PodProviderSignInResponse,
  type SelectUsers,
  signinResponse,
  signUpBody,
  signinBody
} from "../types"
import { eq } from "drizzle-orm"
import Elysia, { t } from "elysia"
import { db } from "../db/client"
import setupPlugin from "./setup"
import { getTokenObject } from "../services/jwt"
import User from "../decorater/User"
import { localeFromHeaders, translate } from "../i18n"

const authPlugin = new Elysia({name: 'auth'})
  .use(setupPlugin)
  .post(
    '/signin',
    async ({ body, jwt, headers, error }) => {
      const locale = localeFromHeaders(headers)
      const auth = headers.auth
      // check if user is already logged in
      if (auth && (await jwt.verify(auth))) {
        return error(204, translate(locale, 'auth.alreadyLoggedIn'))
      }
      const { username, password, providerEndpoint } = body

      let providerResponse: PodProviderSignInResponse

      // try to signIn to the endpoint
      try {
        providerResponse = await ActivityPod.signIn(providerEndpoint, username, password)
      } catch (e) {
        console.error('Error while logging in to endpoint: ', e)
        return error(400, translate(locale, 'auth.endpointBadStatus'))
      }

      // check if the endpoint returned a token
      if (providerResponse.token === undefined) {
        return error(400, translate(locale, 'auth.endpointNoToken'))
      } else {
        let dbUser: SelectUsers[] = []
        // the endpoint returned like expected now check if the user is already in the database
        try {
          dbUser = await db.select().from(users).where(eq(users.webId, providerResponse.webId))
          if (dbUser.length === 0) {
            // the user is not in the database yet, so we need to create a new user
            dbUser = await db
              .insert(users)
              .values({
                name: username as string,
                email: username as string,
                webId: providerResponse.webId,
                providerEndpoint: providerEndpoint,
                podToken: providerResponse.token
              })
              .returning()
          } else {
            // User exists: refresh the stored pod-native token so OIDC sign-ins
            // can retrieve it for outbox writes.
            dbUser = await db
              .update(users)
              .set({ podToken: providerResponse.token })
              .where(eq(users.webId, providerResponse.webId))
              .returning()
          }
        } catch (e) {
          console.error('Error while checking if user is in the database: ', e)
          return error(500, translate(locale, 'auth.userCheckFailed'))
        }
        // generate signed token for signIn
        const tokenObject = getTokenObject(new User(dbUser[0], providerResponse.token))
        const token = await jwt.sign(tokenObject)

        return {
          token,
          user: dbUser[0]
        }
      }
    },
    {
      body: signinBody,
      response: {
        200: signinResponse,
        204: t.String(),
        400: t.String(),
        500: t.String()
      },
      detail: 'Logs in a with a pod provider and sets an auth cookie for the user'
    }
  )
  .get(
    '/logout',
    async ({ cookie: { auth }, headers }) => {
      const locale = localeFromHeaders(headers)
      auth.remove()
      return translate(locale, 'auth.loggedOut')
    },
    {
      detail: 'Removes the auth cookie'
    }
  )
  .post(
    '/signup',
    async ({ body, error, headers, jwt }) => {
      const locale = localeFromHeaders(headers)
      const auth = headers.auth
      // check if user is already logged in
      if (auth && (await jwt.verify(auth))) {
        return translate(locale, 'auth.alreadyLoggedIn')
      }
      const { username, password, email, providerEndpoint } = body

      // try to sign up the user with the current provider
      try {
        const providerResponse = await ActivityPod.signup(providerEndpoint, username, password, email)
        let userResponse: SelectUsers[] = []

        if (providerResponse.token === undefined) {
          return error(400, translate(locale, 'auth.providerNoToken'))
        } else {
          // the provider created a new user, so we need to create a new user in the database
          try {
            const user = await db.select().from(users).where(eq(users.webId, providerResponse.webId))
            if (user.length === 0) {
              // the user is not in the database yet, so we need to create a new user
              userResponse = await db.insert(users).values({
                name: username as string,
                email,
                webId: providerResponse.webId,
                providerEndpoint: providerEndpoint,
                podToken: providerResponse.token
              }).returning()
            } else {
              userResponse = await db
                .update(users)
                .set({ podToken: providerResponse.token })
                .where(eq(users.webId, providerResponse.webId))
                .returning()
            }
          } catch (e) {
            console.error('Error while checking if user is in the database: ', e)
            return error(500, translate(locale, 'auth.userCheckFailed'))
          }
          const authToken = await jwt.sign({ webId: providerResponse.webId, token: providerResponse.token })

          return {
            token: authToken,
            user: userResponse[0]
          }
        }
      } catch (e: any) {
        if (e.name === 'HTTPError') {
          const errorJson = await e.response.json()
          console.error('Error while signing up the user', errorJson)
          return error(errorJson.code, errorJson.message)
        }
        console.error('Error while signing up the user', e)
        return error(400, translate(locale, 'auth.providerError'))
      }
    },
    {
      detail: 'Signs up a new user',
      body: signUpBody,
      response: {
        200: signinResponse,
        400: t.String(),
        500: t.String(),
      }
    }
  )

export default authPlugin
