import { Elysia } from 'elysia'
import { drizzle } from 'drizzle-orm/node-postgres'
import { postsPlugin, authPlugin, setupPlugin, usersPlugin } from './routes'

export const db = drizzle({ connection: process.env.DB_URL || '', casing: 'snake_case' })

export const app = new Elysia()
  .use(setupPlugin)
  .use(authPlugin)
  .use(postsPlugin)
  .use(usersPlugin)
  .listen(process.env.API_PORT || 8796)

console.info(`Listening on port ${process.env.API_PORT}`)

export type App = typeof app
