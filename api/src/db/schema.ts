import { relations, eq, sql } from 'drizzle-orm'
import { boolean, text, serial, pgTable as table, timestamp, integer, pgView, varchar, jsonb } from 'drizzle-orm/pg-core'

export const users = table('users', {
  id: serial().primaryKey(),
  name: text().notNull(),
  webId: text('web_id').notNull().unique(),
  email: text('email').notNull().unique(),
  providerEndpoint: text('provider_endpoint').notNull(),
  /**
   * ATProto DID (e.g. did:plc:abc123) linked to this account.
   * Populated asynchronously after sign-in by resolving the user's WebID
   * profile and reading the schema:sameAs / alsoKnownAs ATProto identity link.
   * Null until the identity is resolved.
   */
  atprotoDid: varchar('atproto_did', { length: 2048 }),
  /**
   * ATProto handle (e.g. alice.pod.example) corresponding to atprotoDid.
   * Resolved from the WebID profile foaf:account link.
   * Null until the identity is resolved.
   */
  atprotoHandle: varchar('atproto_handle', { length: 512 }),
  /**
   * Pod-native JWT issued by ActivityPods' /auth/login (RS256, no expiry).
   * This is the token the pod's ActivityPub API accepts for outbox writes.
   * It is different from the OIDC access_token; both are Bearer JWTs but
   * signed with different keys for different purposes.
   * Populated on every legacy /signin and refreshed on subsequent sign-ins.
   */
  podToken: text('pod_token'),
})

export const usersRelations = relations(users, ({one}) => ({
  posts: one(posts),
}))

export const posts = table('posts', {
  id: serial().primaryKey(),
  content: text().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  isPublic: boolean('is_public').notNull(),
  authorId: integer('author_id').notNull().references(() => users.id),
  objectUri: text('object_uri'),
  canonicalUrl: varchar('canonical_url', { length: 3072 }),
  postType: text('post_type', { enum: ['note', 'article'] }).notNull().default('note'),
  name: text('name'),
  summary: text('summary'),
})

export const postsView = pgView('posts_view', {
  id: serial().primaryKey(),
  content: text().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  isPublic: boolean('is_public').notNull(),
  authorId: integer('author_id').notNull().references(() => users.id),
  objectUri: text('object_uri'),
  canonicalUrl: varchar('canonical_url', { length: 3072 }),
  postType: text('post_type', { enum: ['note', 'article'] }).notNull(),
  name: text('name'),
  summary: text('summary'),
  authorName: text("author_name").notNull(),
  authorWebId: text('author_web_id').notNull().unique(),
  authorProviderEndpoint: text('author_provider_endpoint').notNull(),
}).as(sql`SELECT
    posts.*,
    users.name as author_name,
    users.web_id as author_web_id,
    users.provider_endpoint as author_provider_endpoint
  FROM posts
  INNER JOIN users on posts.author_id = users.id
  WHERE posts.is_public = true`)

export const conversations = table('conversations', {
  id: serial().primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  type: text('type', { enum: ['dm', 'group'] }).notNull(),
  name: text(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const conversationMembers = table('conversation_members', {
  conversationId: integer('conversation_id').notNull().references(() => conversations.id),
  userId: integer('user_id').notNull().references(() => users.id),
})

export const messages = table('messages', {
  id: serial().primaryKey(),
  conversationId: integer('conversation_id').notNull().references(() => conversations.id),
  senderId: integer('sender_id').notNull().references(() => users.id),
  content: text().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const notifications = table('notifications', {
  id: serial().primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  deliveryHash: varchar('delivery_hash', { length: 64 }).notNull().unique(),
  activityType: text('activity_type').notNull(),
  objectUri: text('object_uri'),
  actorUri: text('actor_uri'),
  targetUri: text('target_uri'),
  payload: jsonb('payload').notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
