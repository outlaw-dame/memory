import { createInsertSchema, createSelectSchema } from 'drizzle-typebox'
import { t } from 'elysia'
import { posts, users } from '../db/schema'
import { type Static } from '@sinclair/typebox'

// Query types
export const selectQueryObject = t.Object({
  limit: t.Integer({ default: 10, maximum: 50, minimum: 1 }),
  offset: t.Integer({ default: 0, minimum: 0 })
})

// DB types
// Posts
export const _createPost = createInsertSchema(posts)
export type CreatePost = Static<typeof _createPost>

// Users
export const _createUser = createInsertSchema(users)
export type CreateUser = Static<typeof _createUser>
export const _selectUsers = createSelectSchema(users)
export interface SelectUsers extends Static<typeof _selectUsers> {}
