import { users } from '../db/schema'
import ActivityPod from '../services/ActivityPod'
import {
  type PodProviderSignInResponse,
  type SelectUsers,
  signinResponse,
  signUpBody,
  signinBody,
  podProviderEndpoint,
  ApiSignUpErrors
} from '../types'
import { eq } from 'drizzle-orm'
import Elysia, { t } from 'elysia'
import { db } from '..'
import setupPlugin from './setup'
import { getTokenObject } from '../services/jwt'
import User from '../decorater/User'
import { HTTPError } from 'ky'
import { encodeWebId } from '@/util/user'

const authPlugin = new Elysia({ name: 'auth' })
  .use(setupPlugin)
  .post(
    '/signin',
    async ({ body, jwt, headers: { auth }, error }) => {
      // check if user is already logged in
      if (auth && (await jwt.verify(auth))) {
        return error(204, "You're already logged in")
      }
      const { username, password, providerName } = body

      let providerResponse: PodProviderSignInResponse

      // try to signIn to the endpoint
      try {
        providerResponse = await ActivityPod.signIn(podProviderEndpoint[providerName], username, password)
      } catch (e) {
        console.error('Error while logging in to endpoint: ', e)
        return error(400, "Endpoint didn't respond with a 200 status code")
      }

      // check if the endpoint returned a token
      if (providerResponse.token === undefined) {
        return error(400, 'Endpoint did not return a token')
      } else {
        let dbUser: SelectUsers[] = []
        // the endpoint returned like expected now check if the user is already in the database
        try {
          const webId = encodeWebId(providerResponse.webId)
          dbUser = await db.select().from(users).where(eq(users.webId, webId))
          if (dbUser.length === 0) {
            // the user is not in the database yet, so we need to create a new user
            dbUser = await db
              .insert(users)
              .values({
                name: username as string,
                displayName: username as string,
                email: username as string,
                webId: webId,
                providerName
              })
              .returning()
          }
        } catch (e) {
          console.error('Error while checking if user is in the database: ', e)
          return error(500, 'Error while checking user')
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
  .post(
    '/signup',
    async ({ body, error, headers: { auth }, jwt, profanity }) => {
      // check if user is already logged in
      if (auth && (await jwt.verify(auth))) {
        return "You're already logged in"
      }
      const { username, password, email, providerName } = body

      // check if username or email is profane
      if ((profanity.exists(username), profanity.exists(email))) {
        return error(400, ApiSignUpErrors.UsernameOrEmailContainsProfanity)
      }
      // check if username contains unwanted characters
      const unwantedChars = new RegExp(/[@#/\\$%^&*!?<>+~=]/g)
      if (unwantedChars.test(username)) {
        return error(400, ApiSignUpErrors.UsernameInvalid)
      }
      // try to sign up the user with the current provider
      try {
        const providerResponse = await ActivityPod.signup(podProviderEndpoint[providerName], username, password, email)
        let userResponse: SelectUsers[] = []

        if (providerResponse.token === undefined) {
          return error(400, ApiSignUpErrors.ProviderToken)
        } else {
          // the provider created a new user, so we need to create a new user in the database
          try {
            const webId = encodeWebId(providerResponse.webId)
            const user = await db.select().from(users).where(eq(users.webId, webId))
            if (user.length === 0) {
              // the user is not in the database yet, so we need to create a new user
              userResponse = await db
                .insert(users)
                .values({
                  name: username as string,
                  displayName: username as string,
                  email,
                  webId: webId,
                  providerName
                })
                .returning()
            }
          } catch (e) {
            console.error('Error while checking if user is in the database: ', e)
            return error(500, ApiSignUpErrors.DBError)
          }
          const tokenObject = getTokenObject(new User(userResponse[0], providerResponse.token))
          const authToken = await jwt.sign(tokenObject)

          return {
            token: authToken,
            user: userResponse[0]
          }
        }
      } catch (e: unknown) {
        if (e instanceof HTTPError) {
          const errorJson = await e.response.json()
          console.error('Error while signing up the user', errorJson)
          return error(errorJson.code, errorJson.message)
        }
        console.error('Error while signing up the user', e)
        return error(400, ApiSignUpErrors.ProviderDefault)
      }
    },
    {
      detail: 'Signs up a new user',
      body: signUpBody,
      response: {
        200: signinResponse,
        400: t.Enum(ApiSignUpErrors),
        500: t.String()
      }
    }
  )

export default authPlugin
