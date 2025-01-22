import { Elysia } from 'elysia'
import { drizzle } from 'drizzle-orm/node-postgres'
import {
  _createPost,
  _selectposts,
  _selectUsers,
} from './types'
import jwt from '@elysiajs/jwt'
import User from './decorater/User'
import {postsPlugin, authPlugin} from '@/plugin'
import cors from '@elysiajs/cors'

export const db = drizzle({ connection: process.env.DB_URL || '', casing: 'snake_case' })

export const app = new Elysia()
  .use(cors())
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
        async beforeHandle({ headers: { auth }, jwt, error, user }) {
          const authValue = await jwt.verify(auth)
          if (!authValue) {
            return error(401, 'You must be signed in to do that')
          } else {
            user.setUserId(authValue.webId as string)
            user.setToken(authValue.token as string)
          }
        }
      }
    }
  })
  .use(authPlugin)
  .use(postsPlugin)
  .listen(8796)

console.info('Listening on port 8796')

export type App = typeof app
