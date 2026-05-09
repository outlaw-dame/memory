import { relations, eq, sql } from 'drizzle-orm'
import { boolean, text, serial, pgTable as table, timestamp, integer, pgView, varchar, jsonb, index, uniqueIndex, uuid, check } from 'drizzle-orm/pg-core'

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
   * Server-side encrypted Pod-native JWT issued by ActivityPods' /auth/login.
   * The token is never returned to the browser or embedded in Memory JWTs.
   * It is decrypted only inside API handlers that must commit to the user's Pod.
   */
  podToken: text('pod_token'),
})

export const usersRelations = relations(users, ({one}) => ({
  posts: one(posts),
}))

export const posts = table('posts', {
  id: serial().primaryKey(),
  content: text().notNull(),
  hashtags: text('hashtags').array().notNull().default(sql`'{}'::text[]`),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  isPublic: boolean('is_public').notNull(),
  authorId: integer('author_id').notNull().references(() => users.id),
  objectUri: text('object_uri'),
  replyParentUri: text('reply_parent_uri'),
  replyRootUri: text('reply_root_uri'),
  canonicalUrl: varchar('canonical_url', { length: 3072 }),
  postType: text('post_type', { enum: ['note', 'article'] }).notNull().default('note'),
  name: text('name'),
  summary: text('summary'),
  clientPostKey: varchar('client_post_key', { length: 128 }),
  clientPostRequestHash: varchar('client_post_request_hash', { length: 64 }),
  /**
   * When set, this post was written on another user's wall (Facebook-style).
   * The value is the ID of the profile owner whose wall received the post.
   * Wall posts use the ActivityStreams `target` property (on the Create activity)
   * to federate the wall context, following Friendica's implementation pattern.
   */
  wallTargetUserId: integer('wall_target_user_id').references(() => users.id),
}, t => [
  uniqueIndex('posts_author_client_key_unique_idx').on(t.authorId, t.clientPostKey).where(sql`${t.clientPostKey} IS NOT NULL`),
  index('posts_wall_target_user_id_idx').on(t.wallTargetUserId),
])

export const mediaAttachments = table('media_attachments', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  postId: integer('post_id').references(() => posts.id),
  storyUri: text('story_uri'),
  storyExpiresAt: timestamp('story_expires_at', { withTimezone: true }),
  state: text('state', { enum: ['uploading', 'uploaded', 'processing', 'ready', 'failed', 'expired', 'deleted'] }).notNull().default('uploading'),
  kind: text('kind', { enum: ['image', 'gif', 'video', 'audio', 'unknown'] }).notNull(),
  sourceUrl: text('source_url'),
  sourceMediaType: varchar('source_media_type', { length: 120 }).notNull(),
  sourceSize: integer('source_size').notNull(),
  originalFilename: text('original_filename'),
  altText: text('alt_text'),
  focusX: integer('focus_x'),
  focusY: integer('focus_y'),
  blurhash: varchar('blurhash', { length: 128 }),
  width: integer('width'),
  height: integer('height'),
  durationMs: integer('duration_ms'),
  previewUrl: text('preview_url'),
  thumbnailUrl: text('thumbnail_url'),
  canonicalUrl: text('canonical_url'),
  gatewayUrl: text('gateway_url'),
  filebaseCid: varchar('filebase_cid', { length: 256 }),
  digestMultibase: varchar('digest_multibase', { length: 256 }),
  errorCode: varchar('error_code', { length: 64 }),
  errorMessage: text('error_message'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [
  index('media_attachments_user_state_idx').on(t.userId, t.state),
  index('media_attachments_user_post_idx').on(t.userId, t.postId),
  index('media_attachments_story_uri_idx').on(t.storyUri),
  index('media_attachments_story_expires_at_idx').on(t.storyExpiresAt),
  index('media_attachments_expires_at_idx').on(t.expiresAt),
  check('media_attachments_state_check', sql`${t.state} IN ('uploading', 'uploaded', 'processing', 'ready', 'failed', 'expired', 'deleted')`),
  check('media_attachments_kind_check', sql`${t.kind} IN ('image', 'gif', 'video', 'audio', 'unknown')`),
  check('media_attachments_size_check', sql`${t.sourceSize} > 0`),
  check('media_attachments_focus_x_check', sql`${t.focusX} IS NULL OR (${t.focusX} >= -1000000 AND ${t.focusX} <= 1000000)`),
  check('media_attachments_focus_y_check', sql`${t.focusY} IS NULL OR (${t.focusY} >= -1000000 AND ${t.focusY} <= 1000000)`),
])

export const postsView = pgView('posts_view', {
  id: serial().primaryKey(),
  content: text().notNull(),
  hashtags: text('hashtags').array().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  isPublic: boolean('is_public').notNull(),
  authorId: integer('author_id').notNull().references(() => users.id),
  objectUri: text('object_uri'),
  replyParentUri: text('reply_parent_uri'),
  replyRootUri: text('reply_root_uri'),
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
  /** Whether the user has read this notification. */
  isRead: boolean('is_read').notNull().default(false),
  /** Timestamp of when the user marked this notification read. */
  readAt: timestamp('read_at', { withTimezone: true }),
})

// ---------------------------------------------------------------------------
// Bookmarks — per-user saved posts (cross-protocol)
// ---------------------------------------------------------------------------

/**
 * Persists bookmark state so it survives page reloads and works offline.
 * Mirrors the semantics of Mastodon's bookmarks table and Bluesky's
 * private bookmark records: visible only to the owner, never to others.
 *
 * Exactly one of atUri or objectUri will be set, depending on source.
 * Partial unique indexes enforce one bookmark per user per AT URI or AP URI.
 */
export const bookmarks = table('bookmarks', {
  id: serial().primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id),
  /** AT URI for ATProto posts; null for AP posts. */
  atUri: varchar('at_uri', { length: 3072 }),
  /** AP object URI for ActivityPods/AP posts; null for AT posts. */
  objectUri: text('object_uri'),
  /** Feed source tag for faster client-side filtering. */
  source: varchar('source', { length: 32 }).notNull(),
  bookmarkedAt: timestamp('bookmarked_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [
  index('bookmarks_user_at_uri_idx').on(t.userId, t.atUri),
  index('bookmarks_user_object_uri_idx').on(t.userId, t.objectUri),
  uniqueIndex('bookmarks_user_at_uri_unique_idx').on(t.userId, t.atUri).where(sql`${t.atUri} IS NOT NULL`),
  uniqueIndex('bookmarks_user_object_uri_unique_idx').on(t.userId, t.objectUri).where(sql`${t.objectUri} IS NOT NULL`),
])
// ---------------------------------------------------------------------------
// Viewer Relationship Cache — persisted follow/mute/block state
// ---------------------------------------------------------------------------

/**
 * Caches the viewer's per-actor relationship state so the feed and profile
 * endpoints don't need to hit the ActivityPods dashboard on every request.
 *
 * Mirrors the pattern used by both Mastodon (follows/blocks/mutes tables) and
 * Bluesky (viewer state embedded in getProfile/getAuthorFeed responses).
 *
 * TTL is enforced by `refreshedAt`; stale entries are re-fetched in the
 * background and the cached value is used for the current response.
 */
export const viewerRelationshipCache = table('viewer_relationship_cache', {
  id: serial().primaryKey(),
  /** Local user whose perspective this row represents. */
  viewerUserId: integer('viewer_user_id').notNull().references(() => users.id),
  /** Canonical actor URI of the remote subject (AP actor URI or AT DID). */
  subjectUri: varchar('subject_uri', { length: 2048 }).notNull(),
  /** Protocol of the subject actor. */
  subjectProtocol: varchar('subject_protocol', { length: 16 }).notNull().default('activitypods'),
  /** Whether the viewer is following this actor. */
  isFollowing: boolean('is_following').notNull().default(false),
  /** Whether this actor follows the viewer back. */
  isFollowedBy: boolean('is_followed_by').notNull().default(false),
  /** Whether the viewer has muted this actor. */
  isMuted: boolean('is_muted').notNull().default(false),
  /** Whether the viewer has blocked this actor. */
  isBlocked: boolean('is_blocked').notNull().default(false),
  /** Whether this actor has blocked the viewer. */
  isBlockedBy: boolean('is_blocked_by').notNull().default(false),
  /** ISO-8601 timestamp of last refresh from the upstream source. */
  refreshedAt: timestamp('refreshed_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [
  index('viewer_rel_cache_viewer_subject_idx').on(t.viewerUserId, t.subjectUri),
])
