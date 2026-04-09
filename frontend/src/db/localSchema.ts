/**
 * Local PGlite Schema
 *
 * PostgreSQL schema for the browser-side PGlite database.  Mirrors the
 * server-side unified feed shape and extends it with:
 *   - embedding vector(384)  — bge-small-en-v1.5 for semantic search
 *   - content_tsv tsvector   — PostgreSQL full-text search via GIN index
 *   - sync_state             — per-entity delta sync cursor
 *   - pending_writes         — offline write buffer (flushed on reconnect)
 */
import { pgTable as table, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core'
import { customType } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ---------------------------------------------------------------------------
// Custom column types not natively supported by drizzle-orm/pg-core
// ---------------------------------------------------------------------------

/** 384-dimensional float vector for bge-small-en-v1.5 embeddings. */
export const vector384 = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(384)'
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`
  },
  fromDriver(value: string): number[] {
    return value.slice(1, -1).split(',').map(Number)
  },
})

/** PostgreSQL tsvector for full-text search. */
export const tsvector = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'tsvector'
  },
})

// ---------------------------------------------------------------------------
// local_posts — cached unified feed entries (AP + AT)
// ---------------------------------------------------------------------------

/**
 * Composite primary key format: '{source}:{server_id}'
 * Examples: 'ap:42', 'at:99'
 *
 * `embedding` is null until the background embedding job processes the post.
 * `content_tsv` is populated on upsert via to_tsvector in the INSERT.
 */
export const localPosts = table('local_posts', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }),
  isPublic: boolean('is_public').notNull().default(true),
  authorId: integer('author_id'),
  authorName: text('author_name').notNull(),
  authorWebId: text('author_web_id').notNull(),
  authorProviderEndpoint: text('author_provider_endpoint').notNull().default(''),
  source: text('source').notNull(), // 'activitypods' | 'atproto'
  atUri: text('at_uri'),
  objectUri: text('object_uri'),
  syncedAt: timestamp('synced_at', { withTimezone: true }).default(sql`now()`),
  embedding: vector384('embedding'),
  contentTsv: tsvector('content_tsv'),
})

// ---------------------------------------------------------------------------
// sync_state — per-entity delta sync cursor
// ---------------------------------------------------------------------------

export const syncState = table('sync_state', {
  /** Entity identifier, e.g. 'unified_feed' */
  entity: text('entity').primaryKey(),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  /** ISO-8601 timestamp of the newest post seen; used as ?since= cursor */
  cursor: text('cursor'),
})

// ---------------------------------------------------------------------------
// pending_writes — offline write buffer
// ---------------------------------------------------------------------------

export const pendingWrites = table('pending_writes', {
  id: text('id').primaryKey(), // crypto.randomUUID()
  entity: text('entity').notNull(), // e.g. 'posts'
  method: text('method').notNull(), // 'POST' | 'PATCH' | 'DELETE'
  path: text('path').notNull(), // API path e.g. '/posts'
  payload: text('payload').notNull(), // JSON-stringified body
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  attemptedAt: timestamp('attempted_at', { withTimezone: true }),
  failCount: integer('fail_count').notNull().default(0),
})

export type LocalPost = typeof localPosts.$inferSelect
export type NewLocalPost = typeof localPosts.$inferInsert
export type PendingWrite = typeof pendingWrites.$inferSelect
