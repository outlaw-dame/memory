import { AUTH_COOKIE_DURATION } from "@/config"
import { users } from "@/db/schema"
import ActivityPod from "@/services/ActivityPod"
import { type PodProviderSignInResponse, type SelectUsers, viablePodProviders, signinResponse, signUpBody, signinBody } from "@/types"
import { eq } from "drizzle-orm"
import Elysia, { t } from "elysia"
import { db } from ".."
import setupPlugin from "./setup"

const authPlugin = new Elysia({name: 'auth'})
  .use(setupPlugin)
  .post(
    '/signin',
    async ({ body, jwt, headers: { auth }, error }) => {
      // check if user is already logged in
      if (auth && (await jwt.verify(auth))) {
        return error(204, "You're already logged in")
      }
      const { username, password, providerEndpoint } = body

      let providerResponse: PodProviderSignInResponse

      // try to signIn to the endpoint
      try {
        providerResponse = await ActivityPod.signIn(providerEndpoint, username, password)
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
          dbUser = await db.select().from(users).where(eq(users.webId, providerResponse.webId))
          if (dbUser.length === 0) {
            // the user is not in the database yet, so we need to create a new user
            dbUser = await db
              .insert(users)
              .values({
                name: username as string,
                webId: providerResponse.webId,
                providerEndpoint: providerEndpoint
              })
              .returning()
          }
        } catch (e) {
          console.error('Error while checking if user is in the database: ', e)
          return error(500, 'Error while checking user')
        }
        // generate signed token for signIn
        const token = await jwt.sign({ webId: providerResponse.webId, token: providerResponse.token })

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
    async ({ body, error, headers: { auth }, jwt }) => {
      // check if user is already logged in
      if (auth && (await jwt.verify(auth))) {
        return "You're already logged in"
      }
      const { username, password, email, providerEndpoint } = body

      // try to sign up the user with the current provider
      try {
        const providerResponse = await ActivityPod.signup(providerEndpoint, username, password, email)
        let userResponse: SelectUsers[] = []

        if (providerResponse.token === undefined) {
          return error(400, 'Provider did not return a token')
        } else {
          // the provider created a new user, so we need to create a new user in the database
          try {
            const user = await db.select().from(users).where(eq(users.webId, providerResponse.webId))
            if (user.length === 0) {
              // the user is not in the database yet, so we need to create a new user
              userResponse = await db.insert(users).values({
                name: username as string,
                webId: providerResponse.webId,
                providerEndpoint: providerEndpoint
              }).returning()
            }
          } catch (e) {
            console.error('Error while checking if user is in the database: ', e)
            return error(500, 'Error while checking user')
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
        return error(400, 'Error with the provider')
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
