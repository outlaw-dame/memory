/**
 * AT Protocol Chat — Database Schema
 *
 * Tables for protocol-neutral DM / group chat projections backed by PostgreSQL.
 *
 * Design decisions:
 *   - All identity uses DIDs (or WebIDs for legacy AP users) rather than
 *     local integer user IDs so remote participants without a local account
 *     can still be first-class members of a conversation.
 *   - convoId is a stable deterministic varchar(40) derived from sorted
 *     participant DIDs (SHA-256 prefix), making it safe to reconstruct
 *     from first principles without a DB round-trip.
 *   - rev tracks an atomic monotonic revision counter per conversation.
 *     Clients use it for optimistic concurrency and change detection.
 *   - Cursor-based pagination uses sentAt timestamps encoded as ISO strings.
 *
 * Security notes:
 *   - Text content is stored as-received; sanitisation happens at input time
 *     (max length, null-byte strip) and at render time.
 *   - No access-control rules are stored here; they are enforced by the
 *     application layer (membership check before any read/write).
 *   - deletedAt implements soft-delete so tombstones can be propagated to
 *     federated peers without losing the rev sequence.
 */

import {
  integer,
  pgTable as table,
  text,
  timestamp,
  varchar,
  index,
  primaryKey,
  jsonb,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ---------------------------------------------------------------------------
// chat_convos
// ---------------------------------------------------------------------------

/**
 * One row per conversation — direct (2-party) or group (N-party).
 *
 * convo_type is intentionally a constrained varchar rather than a Postgres
 * enum so that adding new types never requires a migration lock.
 */
export const chatConvos = table('chat_convos', {
  /** Deterministic ID: "convo_" + first 32 hex chars of SHA-256(sorted DIDs). */
  id: varchar('id', { length: 40 }).primaryKey().notNull(),

  /** 'direct' (2-party) | 'group' (N-party). */
  convoType: varchar('convo_type', { length: 16 }).notNull().default('direct'),

  /** Display name for group conversations; null for direct messages. */
  name: varchar('name', { length: 512 }),

  /**
   * Monotonic revision counter.  Incremented on every message send.
   * Clients compare rev to detect new messages without a full fetch.
   */
  rev: integer('rev').notNull().default(0),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ---------------------------------------------------------------------------
// chat_members
// ---------------------------------------------------------------------------

/**
 * Membership table — one row per (convo, participant) pair.
 *
 * user_did holds the canonical identity string:
 *   - AT Protocol users → "did:plc:…" or "did:web:…"
 *   - ActivityPods users → WebID URL (e.g. "https://alice.pod.example/")
 *
 * lastReadRev allows per-user unread tracking without a separate table.
 */
export const chatMembers = table(
  'chat_members',
  {
    convoId: varchar('convo_id', { length: 40 }).notNull(),
    userDid: varchar('user_did', { length: 2048 }).notNull(),

    /** 'member' or 'admin'. Admins can add/remove members in groups. */
    role: varchar('role', { length: 16 }).notNull().default('member'),

    joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),

    /** The rev value of the last message the user has acknowledged. */
    lastReadRev: integer('last_read_rev').notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.convoId, t.userDid] }),
    index('chat_members_did_idx').on(t.userDid),
  ],
)

// ---------------------------------------------------------------------------
// chat_messages
// ---------------------------------------------------------------------------

/**
 * Individual projected messages within a conversation.
 *
 * rev mirrors the conversation rev at the time of insertion, enabling
 * clients to efficiently retrieve only messages newer than a known rev.
 * objectUri is the canonical Pod/PDS commit URI. Local rows are mirrors and
 * must not be treated as the authoritative message source.
 */
export const chatMessages = table(
  'chat_messages',
  {
    /** Stable local projection ID derived from the canonical object URI. */
    id: varchar('id', { length: 36 }).primaryKey().notNull(),

    /** Canonical ActivityPub/Solid object URI returned by the Pod/PDS commit. */
    objectUri: text('object_uri'),

    convoId: varchar('convo_id', { length: 40 }).notNull(),
    senderDid: varchar('sender_did', { length: 2048 }).notNull(),

    /** Message body, sanitised at write time. Max 10,000 chars. */
    text: text('text').notNull(),

    /** Member-scoped mentions (DID/WebID) included in this message. */
    mentions: jsonb('mentions').$type<string[]>().notNull().default(sql`'[]'::jsonb`),

    /** Non-indexed hashtags captured for DM/group-chat UX only. */
    hashtags: text('hashtags').array().notNull().default(sql`ARRAY[]::text[]`),

    /** Attachment descriptors (image/video/audio/gif/file), never trusted as executable input. */
    attachments: jsonb('attachments').$type<Array<Record<string, unknown>>>().notNull().default(sql`'[]'::jsonb`),

    /** Optional local message ID that this message replies to. */
    inReplyToMessageId: varchar('in_reply_to_message_id', { length: 36 }),

    /** Optional local message ID this message quotes. */
    quoteMessageId: varchar('quote_message_id', { length: 36 }),

    sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),

    /** Snapshot of conversation rev at send time. */
    rev: integer('rev').notNull().default(0),

    /**
     * Soft-delete timestamp.  Non-null → message was retracted.
     * The row is kept so federated peers can be notified of the deletion.
     */
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    // Primary query pattern: fetch messages in a convo ordered by time.
    index('chat_messages_convo_sent_idx').on(t.convoId, t.sentAt),
    // Used when resolving a single message by ID within a convo.
    index('chat_messages_convo_id_idx').on(t.convoId, t.id),
    // Reply / quote graph traversal inside a conversation.
    index('chat_messages_in_reply_to_idx').on(t.convoId, t.inReplyToMessageId),
    index('chat_messages_quote_idx').on(t.convoId, t.quoteMessageId),
    uniqueIndex('chat_messages_object_uri_unique_idx').on(t.objectUri).where(sql`${t.objectUri} IS NOT NULL`),
  ],
)
