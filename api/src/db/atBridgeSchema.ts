/**
 * AT Protocol Bridge — Database Schema
 *
 * Extends the memory app's existing schema with tables that store
 * federated AT Protocol content received via the Phase 5.5 ingress pipeline.
 *
 * Design principles:
 *   - AT content is stored separately from ActivityPods content to preserve
 *     provenance and allow independent lifecycle management.
 *   - The atPosts table mirrors the structure of the existing posts table
 *     so the frontend can render both sources uniformly.
 *   - The atIdentities table caches DID → handle mappings for display.
 *   - All AT-sourced content is marked with its source DID and rkey for
 *     deduplication and AT URI reconstruction.
 *
 * Security notes:
 *   - Content is stored as received; sanitisation happens at render time.
 *   - The sourceUrl field is validated before storage.
 *   - No user credentials are stored in this schema.
 */

import { text, serial, pgTable as table, timestamp, boolean, integer, varchar, jsonb, pgView } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { users } from './schema'

// ---------------------------------------------------------------------------
// AT Identities (DID → handle cache)
// ---------------------------------------------------------------------------

/**
 * Caches resolved AT Protocol identities for display in the UI.
 * Updated whenever an #identity event is processed by the verifier.
 */
export const atIdentities = table('at_identities', {
  id: serial().primaryKey(),

  /** ATProto DID (e.g. did:plc:abc123). */
  did: varchar('did', { length: 2048 }).notNull().unique(),

  /** Current handle (e.g. alice.bsky.social). May be null if unresolved. */
  handle: varchar('handle', { length: 512 }),

  /** Full DID document as JSON. */
  didDocument: jsonb('did_document'),

  /** Whether this identity is currently active. */
  isActive: boolean('is_active').notNull().default(true),

  /** ISO-8601 timestamp of last successful resolution. */
  resolvedAt: timestamp('resolved_at', { withTimezone: true }).defaultNow(),

  /** ISO-8601 timestamp of last update from the ingress pipeline. */
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),

  /**
   * Optional link to a local memory user.
   * Set when a local user has linked their AT identity.
   */
  localUserId: integer('local_user_id').references(() => users.id),
})

// ---------------------------------------------------------------------------
// AT Posts (federated content from the AT firehose)
// ---------------------------------------------------------------------------

/**
 * Stores AT Protocol posts received via the Phase 5.5 ingress pipeline.
 * These are posts from external ATProto users that are relevant to local users
 * (e.g. followed accounts, mentioned users).
 */
export const atPosts = table('at_posts', {
  id: serial().primaryKey(),

  /** ATProto DID of the author. */
  authorDid: varchar('author_did', { length: 2048 }).notNull(),

  /** ATProto record key (rkey) for deduplication. */
  rkey: varchar('rkey', { length: 512 }).notNull(),

  /** Full AT URI (at://did:plc:xxx/app.bsky.feed.post/rkey). */
  atUri: varchar('at_uri', { length: 3072 }).notNull().unique(),

  /** Content-addressed CID of the record. */
  cid: varchar('cid', { length: 512 }),

  /** Post text content. */
  content: text('content').notNull(),

  /** Whether the projected item is a short note or long-form article teaser. */
  postType: varchar('post_type', { length: 16 }).notNull().default('note'),

  /** Optional long-form title. */
  title: text('title'),

  /** Optional long-form summary / lede. */
  summary: text('summary'),

  /** Canonical external URL for long-form items when available. */
  canonicalUrl: varchar('canonical_url', { length: 3072 }),

  /** Whether this post is publicly visible. */
  isPublic: boolean('is_public').notNull().default(true),

  /** Facets (mentions, links, tags) as JSON. */
  facets: jsonb('facets'),

  /** Embed data (images, external links, quotes) as JSON. */
  embeds: jsonb('embeds'),

  /** AT URI of the parent post if this is a reply. */
  replyParentUri: varchar('reply_parent_uri', { length: 3072 }),

  /** AT URI of the root post in the reply thread. */
  replyRootUri: varchar('reply_root_uri', { length: 3072 }),

  /** ISO-8601 timestamp from the ATProto record. */
  createdAt: timestamp('created_at', { withTimezone: true }),

  /** ISO-8601 timestamp of local ingestion. */
  ingestedAt: timestamp('ingested_at', { withTimezone: true }).defaultNow(),

  /** Upstream firehose source (e.g. wss://relay.bsky.network). */
  sourceRelay: varchar('source_relay', { length: 512 }),

  /** ATProto firehose sequence number for ordering and deduplication. */
  firehoseSeq: integer('firehose_seq'),

  /** Pre-computed hashtag array extracted from facets (populated asynchronously). */
  hashtags: text('hashtags').array().default(sql`ARRAY[]::text[]`),
})

// ---------------------------------------------------------------------------
// AT Records (all supported lexicons)
// ---------------------------------------------------------------------------

/**
 * Stores raw commits for all supported lexicons.
 * This allows Memory to support the same record families as Bluesky
 * (app.bsky.*) plus standard.site.* without losing non-post data.
 */
export const atRecords = table('at_records', {
  id: serial().primaryKey(),

  /** ATProto DID of the author. */
  authorDid: varchar('author_did', { length: 2048 }).notNull(),

  /** Collection NSID, e.g. app.bsky.feed.post, standard.site.article. */
  collection: varchar('collection', { length: 512 }).notNull(),

  /** ATProto record key (rkey) for deduplication. */
  rkey: varchar('rkey', { length: 512 }).notNull(),

  /** Full AT URI (at://did/.../collection/rkey). */
  atUri: varchar('at_uri', { length: 3072 }).notNull().unique(),

  /** Content-addressed CID of the record. */
  cid: varchar('cid', { length: 512 }),

  /** Current operation state for this record. */
  operation: varchar('operation', { length: 16 }).notNull().default('create'),

  /** Raw record payload for lexicon-specific fields. */
  record: jsonb('record'),

  /** Whether this record is currently active (soft-delete support). */
  isActive: boolean('is_active').notNull().default(true),

  /** ISO-8601 timestamp from the ATProto record, when available. */
  createdAt: timestamp('created_at', { withTimezone: true }),

  /** ISO-8601 timestamp of local ingestion. */
  ingestedAt: timestamp('ingested_at', { withTimezone: true }).defaultNow(),

  /** Upstream firehose source (e.g. wss://relay.bsky.network). */
  sourceRelay: varchar('source_relay', { length: 512 }),

  /** ATProto firehose sequence number for ordering and deduplication. */
  firehoseSeq: integer('firehose_seq'),
})

// ---------------------------------------------------------------------------
// AP Remote Posts (federated content from ActivityPub relays)
// ---------------------------------------------------------------------------

/**
 * Stores remote ActivityPub posts received via the fedify-sidecar relay
 * subscription pipeline.  These are Note/Article objects announced by AP
 * relays that the sidecar subscribes to, forwarded here via the AP bridge
 * webhook so they appear in the unified memory feed alongside local and
 * AT Protocol posts.
 *
 * Deduplication is on object_uri (the canonical AP object ID).
 */
export const apRemotePosts = table('ap_remote_posts', {
  id: serial().primaryKey(),

  /** Canonical AP object URI (e.g. https://mastodon.social/users/alice/statuses/123). */
  objectUri: varchar('object_uri', { length: 3072 }).notNull().unique(),

  /** AP actor URI of the author (attributedTo). */
  authorWebId: varchar('author_web_id', { length: 2048 }).notNull(),

  /** Display name extracted from the actor document, or domain-qualified username. */
  authorName: varchar('author_name', { length: 512 }).notNull(),

  /** Domain extracted from the author actor URI. */
  authorDomain: varchar('author_domain', { length: 253 }),

  /** Post text content (HTML or plain text as received). */
  content: text('content').notNull(),

  /** 'note' or 'article'. */
  postType: varchar('post_type', { length: 16 }).notNull().default('note'),

  /** Optional long-form title (Article). */
  title: text('title'),

  /** Optional summary / content warning. */
  summary: text('summary'),

  /** Optional canonical URL for long-form content. */
  canonicalUrl: varchar('canonical_url', { length: 3072 }),

  /** Whether the post is addressed to the public audience. */
  isPublic: boolean('is_public').notNull().default(true),

  /** URI of the direct parent post if this is a reply. */
  replyParentUri: varchar('reply_parent_uri', { length: 3072 }),

  /** URI of the root post in the reply thread. */
  replyRootUri: varchar('reply_root_uri', { length: 3072 }),

  /** Hashtags extracted from the content/tags. */
  hashtags: text('hashtags').array().default(sql`ARRAY[]::text[]`),

  /** ISO-8601 published timestamp from the AP object. */
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),

  /** ISO-8601 timestamp of local ingestion. */
  ingestedAt: timestamp('ingested_at', { withTimezone: true }).defaultNow(),

  /** Relay actor URI that announced this post. */
  sourceRelay: varchar('source_relay', { length: 512 }),
})

// ---------------------------------------------------------------------------
// AT Firehose Cursor State (for UI observability)
// ---------------------------------------------------------------------------

/**
 * Exposes the current firehose cursor state for each source relay.
 * Used by the admin UI to monitor ingestion health.
 */
export const atFirehoseCursors = table('at_firehose_cursors', {
  id: serial().primaryKey(),

  /** Source relay identifier (e.g. wss://relay.bsky.network). */
  sourceId: varchar('source_id', { length: 512 }).notNull().unique(),

  /** Source type: relay or PDS. */
  sourceType: varchar('source_type', { length: 16 }).notNull().default('relay'),

  /** Last committed cursor seq number. */
  committedSeq: integer('committed_seq'),

  /** Last hot cursor seq number. */
  hotSeq: integer('hot_seq'),

  /** Whether the source is currently connected. */
  isConnected: boolean('is_connected').notNull().default(false),

  /** ISO-8601 timestamp of last event received. */
  lastEventAt: timestamp('last_event_at', { withTimezone: true }),

  /** ISO-8601 timestamp of last cursor commit. */
  lastCommitAt: timestamp('last_commit_at', { withTimezone: true }),

  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// ---------------------------------------------------------------------------
// Thread graph primitives (reply relationships + aggregates)
// ---------------------------------------------------------------------------

/**
 * Normalized edge table representing reply relationships for both local
 * ActivityPods posts and ATProto posts.
 */
export const threadEdges = table('thread_edges', {
  id: serial().primaryKey(),

  /** Source family for the item represented by this edge. */
  itemSource: varchar('item_source', { length: 32 }).notNull(),

  /** Optional foreign key to local posts.id when itemSource = 'activitypods'. */
  itemLocalPostId: integer('item_local_post_id'),

  /** Optional foreign key to at_posts.id when itemSource = 'atproto'. */
  itemAtPostId: integer('item_at_post_id'),

  /** Canonical URI for the item (object_uri or at_uri). */
  itemUri: varchar('item_uri', { length: 3072 }).notNull().unique(),

  /** Actor id of the reply author. */
  replyAuthorId: varchar('reply_author_id', { length: 2048 }).notNull(),

  /** URI of the direct parent (if this is a reply). */
  parentUri: varchar('parent_uri', { length: 3072 }),

  /** Actor id of the parent author, when known. */
  parentAuthorId: varchar('parent_author_id', { length: 2048 }),

  /** URI of the thread root (if this is a reply). */
  rootUri: varchar('root_uri', { length: 3072 }),

  /** Actor id of the root author, when known. */
  rootAuthorId: varchar('root_author_id', { length: 2048 }),

  /** Original post timestamp. */
  createdAt: timestamp('created_at', { withTimezone: true }),

  /** Last refresh timestamp for this derived edge. */
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

/**
 * Per-thread participant aggregates.
 */
export const threadParticipants = table('thread_participants', {
  rootUri: varchar('root_uri', { length: 3072 }).notNull(),
  participantActorId: varchar('participant_actor_id', { length: 2048 }).notNull(),
  replyCount: integer('reply_count').notNull().default(0),
  firstReplyAt: timestamp('first_reply_at', { withTimezone: true }),
  lastReplyAt: timestamp('last_reply_at', { withTimezone: true }),
})

/**
 * Per-thread aggregate counters.
 */
export const threadStats = table('thread_stats', {
  rootUri: varchar('root_uri', { length: 3072 }).primaryKey(),
  replyCount: integer('reply_count').notNull().default(0),
  participantCount: integer('participant_count').notNull().default(0),
  lastActivityAt: timestamp('last_activity_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ---------------------------------------------------------------------------
// Unified Feed View (AT + ActivityPods posts)
// ---------------------------------------------------------------------------

/**
 * A unified view combining ActivityPods posts and AT Protocol posts for the
 * memory UI's home feed.  Both sources are normalised to the same shape.
 */
export const unifiedFeedView = pgView('unified_feed_view', {
  id: serial().primaryKey(),
  content: text('content').notNull(),
  hashtags: text('hashtags').array().notNull(),
  postType: varchar('post_type', { length: 16 }).notNull(),
  title: text('title'),
  summary: text('summary'),
  canonicalUrl: varchar('canonical_url', { length: 3072 }),
  createdAt: timestamp('created_at', { withTimezone: true }),
  isPublic: boolean('is_public').notNull(),
  authorId: integer('author_id'),
  authorName: text('author_name').notNull(),
  authorWebId: text('author_web_id').notNull(),
  authorProviderEndpoint: text('author_provider_endpoint').notNull(),
  /** 'activitypods' | 'atproto' */
  source: varchar('source', { length: 32 }).notNull(),
  /** AT URI for ATProto posts, null for ActivityPods posts. */
  atUri: varchar('at_uri', { length: 3072 }),
  /** ActivityPub object URI for ActivityPods posts, null for ATProto posts. */
  objectUri: text('object_uri'),
  replyParentUri: varchar('reply_parent_uri', { length: 3072 }),
  replyRootUri: varchar('reply_root_uri', { length: 3072 }),
}).as(sql`
  SELECT
    posts.id,
    posts.content,
    posts.hashtags,
    posts.post_type,
    posts.name as title,
    posts.summary,
    COALESCE(posts.canonical_url, posts.object_uri) as canonical_url,
    posts.created_at,
    posts.is_public,
    posts.author_id,
    users.name as author_name,
    users.web_id as author_web_id,
    users.provider_endpoint as author_provider_endpoint,
    'activitypods' as source,
    NULL::varchar as at_uri,
    posts.object_uri,
    posts.reply_parent_uri,
    posts.reply_root_uri
  FROM posts
  INNER JOIN users ON posts.author_id = users.id
  WHERE posts.is_public = true

  UNION ALL

  SELECT
    at_posts.id,
    at_posts.content,
    COALESCE(
      ARRAY(
        SELECT DISTINCT '#' || lower(trim(feature->>'tag'))
        FROM jsonb_array_elements(COALESCE(at_posts.facets, '[]'::jsonb)) facet,
             jsonb_array_elements(COALESCE(facet->'features', '[]'::jsonb)) feature
        WHERE feature ? 'tag' AND length(trim(feature->>'tag')) > 0
      ),
      ARRAY[]::text[]
    ) as hashtags,
    at_posts.post_type,
    at_posts.title,
    at_posts.summary,
    at_posts.canonical_url,
    at_posts.created_at,
    at_posts.is_public,
    NULL::integer as author_id,
    COALESCE(at_identities.handle, at_posts.author_did) as author_name,
    at_posts.author_did as author_web_id,
    '' as author_provider_endpoint,
    'atproto' as source,
    at_posts.at_uri,
    NULL::text as object_uri,
    at_posts.reply_parent_uri,
    at_posts.reply_root_uri
  FROM at_posts
  LEFT JOIN at_identities ON at_posts.author_did = at_identities.did
  WHERE at_posts.is_public = true

  UNION ALL

  SELECT
    ap_remote_posts.id,
    ap_remote_posts.content,
    COALESCE(ap_remote_posts.hashtags, ARRAY[]::text[]) as hashtags,
    ap_remote_posts.post_type,
    ap_remote_posts.title,
    ap_remote_posts.summary,
    COALESCE(ap_remote_posts.canonical_url, ap_remote_posts.object_uri) as canonical_url,
    ap_remote_posts.created_at,
    ap_remote_posts.is_public,
    NULL::integer as author_id,
    ap_remote_posts.author_name as author_name,
    ap_remote_posts.author_web_id as author_web_id,
    COALESCE(ap_remote_posts.author_domain, '') as author_provider_endpoint,
    'activitypods' as source,
    NULL::varchar as at_uri,
    ap_remote_posts.object_uri,
    ap_remote_posts.reply_parent_uri,
    ap_remote_posts.reply_root_uri
  FROM ap_remote_posts
  WHERE ap_remote_posts.is_public = true
`)

/**
 * Feed-candidate enriched view combining unified feed rows with thread graph
 * metadata and aggregate counters.
 */
export const unifiedFeedCandidatesView = pgView('unified_feed_candidates_view', {
  id: serial().primaryKey(),
  content: text('content').notNull(),
  hashtags: text('hashtags').array().notNull(),
  postType: varchar('post_type', { length: 16 }).notNull(),
  title: text('title'),
  summary: text('summary'),
  canonicalUrl: varchar('canonical_url', { length: 3072 }),
  createdAt: timestamp('created_at', { withTimezone: true }),
  isPublic: boolean('is_public').notNull(),
  authorId: integer('author_id'),
  authorName: text('author_name').notNull(),
  authorWebId: text('author_web_id').notNull(),
  authorProviderEndpoint: text('author_provider_endpoint').notNull(),
  source: varchar('source', { length: 32 }).notNull(),
  atUri: varchar('at_uri', { length: 3072 }),
  objectUri: text('object_uri'),
  replyParentUri: varchar('reply_parent_uri', { length: 3072 }),
  replyRootUri: varchar('reply_root_uri', { length: 3072 }),
  candidateUri: varchar('candidate_uri', { length: 3072 }),
  threadParentAuthorId: varchar('thread_parent_author_id', { length: 2048 }),
  threadRootAuthorId: varchar('thread_root_author_id', { length: 2048 }),
  threadReplyCount: integer('thread_reply_count'),
  threadParticipantCount: integer('thread_participant_count'),
  threadLastActivityAt: timestamp('thread_last_activity_at', { withTimezone: true }),
}).as(sql`
  SELECT
    ufv.*,
    COALESCE(ufv.at_uri, ufv.object_uri) AS candidate_uri,
    te.parent_author_id AS thread_parent_author_id,
    te.root_author_id AS thread_root_author_id,
    ts.reply_count AS thread_reply_count,
    ts.participant_count AS thread_participant_count,
    ts.last_activity_at AS thread_last_activity_at
  FROM unified_feed_view ufv
  LEFT JOIN thread_edges te ON te.item_uri = COALESCE(ufv.at_uri, ufv.object_uri)
  LEFT JOIN thread_stats ts ON ts.root_uri = COALESCE(te.root_uri, COALESCE(ufv.at_uri, ufv.object_uri))
`)
