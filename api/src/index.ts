import { Elysia, t } from 'elysia'
import { drizzle } from 'drizzle-orm/node-postgres'
import ky from 'ky'
import { viablePodProviders, type EndpointResponse } from './types'
import { users } from './db/schema'
import { eq } from 'drizzle-orm'
import jwt from '@elysiajs/jwt'

const db = drizzle({ connection: process.env.DB_URL || '', casing: 'snake_case' })

export const app = new Elysia()
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'secret'
    })
  )
  .post(
    '/login',
    async ({ body, jwt, cookie: { auth }, error }) => {
      console.log('auth: ', await jwt.verify(auth.value))
      // check if user is already logged in
      if (auth.value && (await jwt.verify(auth.value))) {
        return "You're already logged in"
      }
      const { username, password, endpoint } = body

      let endpointResponse: EndpointResponse

      // try to login to the endpoint
      try {
        endpointResponse = await ky
          .post(`${endpoint}/auth/login`, {
            json: {
              username,
              password
            }
          })
          .json()
      } catch (e) {
        console.error('Error while logging in to endpoint: ', e)
        return error(400, "Endpoint didn't respond with a 200 status code")
      }

      console.log('endpointResponse: ', endpointResponse.token)
      // check if the endpoint returned a token
      if (endpointResponse.token === undefined) {
        return error(400, 'Endpoint did not return a token')
      } else {
        // the endpoint returned like expected now check if the user is already in the database
        try {
          const user = await db.select().from(users).where(eq(users.webId, endpointResponse.webId))
          if (user.length === 0) {
            // the user is not in the database yet, so we need to create a new user
            await db.insert(users).values({
              name: username as string,
              webId: endpointResponse.webId
            })
          }
        } catch (e) {
          console.error('Error while checking if user is in the database: ', e)
          return error(500, 'Error while checking user')
        }
        // set the auth cookie
        auth.set({
          value: await jwt.sign({ webId: endpointResponse.webId }),
          maxAge: 60 * 60 * 24 * 30,
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
  .post(
    '/logout',
    async ({ cookie: { auth } }) => {
      auth.remove()
      return {
        status: 200,
        body: 'You have been logged out'
      }
    },
    {
      detail: 'Removes the auth cookie'
    }
  )
  .listen(8796)

console.log('Listening on port 8796')
