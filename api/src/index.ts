import { Elysia, t } from 'elysia'
import { drizzle } from 'drizzle-orm/node-postgres'
import ky from 'ky'
import { viablePodProviders, type PodProviderResponse } from './types'
import { users } from './db/schema'
import { eq } from 'drizzle-orm'
import jwt from '@elysiajs/jwt'
import { AUTH_COOKIE_DURATION } from './config'
import ActivityPod from './services/ActivityPod'
import User from './decorater/User'

const db = drizzle({ connection: process.env.DB_URL || '', casing: 'snake_case' })

export const app = new Elysia()
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'secret'
    })
  )
  .decorate('user', new User())
  .macro({
    isSignedIn: enabled => {
      if (!enabled) return

      return {
        async beforeHandle({ cookie: { auth }, jwt, error, user }) {
          const authValue = await jwt.verify(auth.value)
          if (!authValue) {
            return error(401, 'You must be signed in to do that')
          } else {
            user.setUserId(authValue.webId as string)
          }
        }
      }
    }
  })
  .post(
    '/login',
    async ({ body, jwt, cookie: { auth }, error }) => {
      // check if user is already logged in
      if (auth.value && (await jwt.verify(auth.value))) {
        return "You're already logged in"
      }
      const { username, password, endpoint } = body

      let providerResponse: PodProviderLoginResponse

      // try to login to the endpoint
      try {
        providerResponse = await ActivityPod.login(endpoint, username, password)
      } catch (e) {
        console.error('Error while logging in to endpoint: ', e)
        return error(400, "Endpoint didn't respond with a 200 status code")
      }

      // check if the endpoint returned a token
      if (providerResponse.token === undefined) {
        return error(400, 'Endpoint did not return a token')
      } else {
        // the endpoint returned like expected now check if the user is already in the database
        try {
          const user = await db.select().from(users).where(eq(users.webId, providerResponse.webId))
          if (user.length === 0) {
            // the user is not in the database yet, so we need to create a new user
            await db.insert(users).values({
              name: username as string,
              webId: providerResponse.webId
            })
          }
        } catch (e) {
          console.error('Error while checking if user is in the database: ', e)
          return error(500, 'Error while checking user')
        }
        // set the auth cookie
        auth.set({
          value: await jwt.sign({ webId: providerResponse.webId, token: providerResponse.token }),
          maxAge: AUTH_COOKIE_DURATION,
          httpOnly: true
        })

        return 'Successfully logged in'
      }
    },
    {
      body: t.Object({
        username: t.String(),
        password: t.String(),
        endpoint: viablePodProviders
      }),
      response: {
        200: t.String(),
        400: t.String(),
        500: t.String()
      },
      detail: 'Logs in a with a pod provider and sets an auth cookie for the user'
    }
  )
  .get(
    '/logout',
    async ({ cookie: { auth } }) => {
      auth.remove()
      return 'You have been logged out'
    },
    {
      detail: 'Removes the auth cookie'
    }
  )
  .post(
    '/signup',
    async ({ body, error, cookie: { auth }, jwt }) => {
      // check if user is already logged in
      if (auth.value && (await jwt.verify(auth.value))) {
        return "You're already logged in"
      }
      const { username, password, email, provider } = body

      // try to sign up the user with the current provider
      try {
        const providerResponse = await ActivityPod.signup(provider, username, password, email)
        if (providerResponse.token === undefined) {
          return error(400, 'Provider did not return a token')
        } else {
          // the provider created a new user, so we need to create a new user in the database
          try {
            const user = await db.select().from(users).where(eq(users.webId, providerResponse.webId))
            if (user.length === 0) {
              // the user is not in the database yet, so we need to create a new user
              await db.insert(users).values({
                name: username as string,
                webId: providerResponse.webId
              })
            }
          } catch (e) {
            console.error('Error while checking if user is in the database: ', e)
            return error(500, 'Error while checking user')
          }
          // set the auth cookie
          auth.set({
            value: await jwt.sign({ webId: providerResponse.webId }),
            maxAge: AUTH_COOKIE_DURATION,
            httpOnly: true
          })

          return 'Successfully signed up'
        }
      } catch (e: any) {
        if (e.name === 'HTTPError') {
          const errorJson = await e.response.json()
          console.error('Error while signing up the user', errorJson)
          return error(errorJson.code, errorJson.message)
        }
        console.error('Error while signing up the user', e)
        return error(400, 'Error with the provider')
      }
    },
    {
      detail: 'Signs up a new user',
      body: t.Object({
        username: t.String(),
        password: t.String(),
        email: t.String(),
        provider: viablePodProviders
      })
    }
  )
  .listen(8796)

console.log('Listening on port 8796')
