/**
 * Chat routes — Pod/PDS-committed, ActivityPods-integrated
 *
 * Messages commit to the user's Pod/PDS first. Local storage in PostgreSQL
 * (chat_convos / chat_members / chat_messages) is a projection used for
 * pagination, unread state, and UI latency; it is not the source of truth.
 *
 * Identity model:
 *   - callerDid = user.atprotoDid (ATProto users) or user.getWebId() (AP/pod users)
 *   - Remote participants are identified by their AP actor URI (WebID)
 *
 * ConvoId derivation: "convo_" + first 32 hex chars of SHA-256(sorted DIDs joined by "|")
 */

import Elysia, { t } from 'elysia'
import { createHash, randomUUID } from 'node:crypto'
import { eq, and, desc, lt, sql, ilike } from 'drizzle-orm'
import { db } from '../../db/client'
import { chatConvos, chatMembers, chatMessages } from '../../db/chatSchema'
import type { NoteCreateRequest } from '../../types'
import ActivityPod from '../../services/ActivityPod'
import setupPlugin from '../setup'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_TEXT_LENGTH = 10_000
const MAX_DID_LENGTH = 2048
const MAX_GROUP_MEMBERS = 256
const MIN_GROUP_MEMBERS = 2
const MAX_MENTIONS = 64
const MAX_HASHTAGS = 64
const MAX_ATTACHMENTS = 16
const MAX_AUTOCOMPLETE_LIMIT = 25
const CONVO_ID_RE = /^convo_[0-9a-f]{32}$/
const MESSAGE_ID_RE = /^[a-zA-Z0-9_-]{1,64}$/
const AS_CONTEXT = 'https://www.w3.org/ns/activitystreams'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveConvoId(dids: string[]): string {
  const sorted = [...dids].sort()
  const digest = createHash('sha256').update(sorted.join('|')).digest('hex')
  return `convo_${digest.slice(0, 32)}`
}

function isValidConvoId(id: string): boolean {
  return CONVO_ID_RE.test(id)
}

function sanitizeText(raw: string): string {
  return raw.replace(/\x00/g, '').trim()
}

function isWebId(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://')
}

function sanitizeDid(value: string): string {
  return value.replace(/\x00/g, '').trim()
}

function normalizeMentionList(mentions: string[] | undefined): string[] {
  if (!mentions) return []
  const deduped = new Set<string>()
  for (const raw of mentions) {
    if (typeof raw !== 'string') continue
    const did = sanitizeDid(raw)
    if (!did || did.length > MAX_DID_LENGTH) continue
    deduped.add(did)
    if (deduped.size >= MAX_MENTIONS) break
  }
  return [...deduped]
}

function normalizeHashtagList(hashtags: string[] | undefined): string[] {
  if (!hashtags) return []
  const deduped = new Set<string>()
  for (const raw of hashtags) {
    if (typeof raw !== 'string') continue
    const normalized = raw.replace(/\x00/g, '').trim().replace(/^#/, '').toLowerCase()
    if (!normalized || normalized.length > 128) continue
    deduped.add(normalized)
    if (deduped.size >= MAX_HASHTAGS) break
  }
  return [...deduped]
}

function isValidMessageRefId(value: string | null | undefined): value is string {
  if (!value) return false
  const trimmed = value.trim()
  return MESSAGE_ID_RE.test(trimmed)
}

function escapeLike(raw: string): string {
  return raw.replace(/[\\%_]/g, m => `\\${m}`)
}

// ---------------------------------------------------------------------------
// Authoritative outgoing DM commit via ActivityPods outbox
// ---------------------------------------------------------------------------

class PodCommitUnavailableError extends Error {}

function deriveMessageIdFromObjectUri(objectUri: string): string {
  return createHash('sha256').update(objectUri).digest('hex').slice(0, 36)
}

function isRetryableProjectionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const text = error.message.toLowerCase()
  return (
    text.includes('timeout') ||
    text.includes('connection') ||
    text.includes('econnreset') ||
    text.includes('deadlock') ||
    text.includes('40001') ||
    text.includes('40p01') ||
    text.includes('08006') ||
    text.includes('53300') ||
    text.includes('57p01')
  )
}

async function withProjectionBackoff<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (attempt === 2 || !isRetryableProjectionError(error)) throw error
      const jitter = Math.floor(Math.random() * 50)
      await new Promise(resolve => setTimeout(resolve, Math.min(750, 75 * (2 ** attempt) + jitter)))
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Projection failed')
}

async function commitDmToPod(
  user: { endpoint?: string; userName?: string; token?: string; getWebId: () => string },
  text: string,
  recipientWebIds: string[],
  opts?: {
    mentions?: string[]
    inReplyToMessageId?: string | null
    attachments?: Array<Record<string, unknown>>
  },
): Promise<{ objectUri: string }> {
  if (!user.endpoint || !user.token || !user.userName) {
    throw new PodCommitUnavailableError('Pod commit context is unavailable for this session')
  }
  const actorUri = user.getWebId()

  if (recipientWebIds.length === 0) {
    throw new PodCommitUnavailableError('No Pod-addressable recipients were found for this conversation')
  }

  const mentionTags = (opts?.mentions ?? [])
    .filter(isWebId)
    .map(href => ({ type: 'Mention' as const, href }))

  const attachmentItems = Array.isArray(opts?.attachments)
    ? opts!.attachments
        .map(item => {
          if (!item || typeof item !== 'object') return null
          const obj = item as Record<string, unknown>
          const url = typeof obj.url === 'string' ? obj.url : ''
          if (!/^https?:\/\//i.test(url)) return null
          const type = typeof obj.type === 'string' ? obj.type : 'Link'
          const mediaType = typeof obj.mimeType === 'string' ? obj.mimeType : undefined
          const name = typeof obj.name === 'string' ? obj.name : undefined
          return {
            type,
            mediaType,
            url,
            name,
          }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
    : []

  const post: NoteCreateRequest = {
    '@context': AS_CONTEXT,
    type: 'Note',
    attributedTo: actorUri,
    to: recipientWebIds,
    content: text,
    ...(mentionTags.length > 0 ? { tag: mentionTags } : {}),
    ...(attachmentItems.length > 0 ? { attachment: attachmentItems } : {}),
    ...(opts?.inReplyToMessageId ? { inReplyTo: opts.inReplyToMessageId } : {}),
  }

  const created = await ActivityPod.createPost(user as Parameters<typeof ActivityPod.createPost>[0], post)
  if (!created.objectUri || !/^https?:\/\//i.test(created.objectUri)) {
    throw new Error('Pod commit did not return a canonical object URI')
  }

  return { objectUri: created.objectUri }
}

async function persistCommittedDmProjection(args: {
  convoId: string
  callerDid: string
  memberDids: string[]
  text: string
  mentions: string[]
  hashtags: string[]
  attachments: Array<Record<string, unknown>>
  inReplyToMessageId: string | null
  quoteMessageId: string | null
  objectUri: string
}) {
  const msgId = deriveMessageIdFromObjectUri(args.objectUri)

  return withProjectionBackoff(() =>
    db.transaction(async (tx) => {
      const [existing] = await tx
        .select({
          id: chatMessages.id,
          convoId: chatMessages.convoId,
          senderDid: chatMessages.senderDid,
          text: chatMessages.text,
          mentions: chatMessages.mentions,
          hashtags: chatMessages.hashtags,
          attachments: chatMessages.attachments,
          inReplyToMessageId: chatMessages.inReplyToMessageId,
          quoteMessageId: chatMessages.quoteMessageId,
          sentAt: chatMessages.sentAt,
          rev: chatMessages.rev,
          objectUri: chatMessages.objectUri,
        })
        .from(chatMessages)
        .where(eq(chatMessages.id, msgId))
        .limit(1)

      if (existing) {
        return {
          id: existing.id,
          convoId: existing.convoId,
          senderDid: existing.senderDid,
          text: existing.text,
          mentions: Array.isArray(existing.mentions) ? existing.mentions : [],
          hashtags: Array.isArray(existing.hashtags) ? existing.hashtags : [],
          attachments: Array.isArray(existing.attachments) ? existing.attachments : [],
          inReplyToMessageId: existing.inReplyToMessageId ?? null,
          quoteMessageId: existing.quoteMessageId ?? null,
          objectUri: existing.objectUri ?? args.objectUri,
          sentAt: existing.sentAt instanceof Date ? existing.sentAt.toISOString() : String(existing.sentAt),
          rev: String(existing.rev),
        }
      }

      await tx.insert(chatConvos).values({
        id: args.convoId,
        convoType: args.memberDids.length > 2 ? 'group' : 'direct',
        name: null,
        rev: 0,
      }).onConflictDoNothing()

      for (const did of args.memberDids) {
        await tx.insert(chatMembers).values({
          convoId: args.convoId,
          userDid: did,
          role: 'member',
        }).onConflictDoNothing()
      }

      const [updated] = await tx
        .update(chatConvos)
        .set({ rev: sql`${chatConvos.rev} + 1`, updatedAt: new Date() })
        .where(eq(chatConvos.id, args.convoId))
        .returning({ rev: chatConvos.rev })

      if (!updated) throw new Error('CONVO_NOT_FOUND')

      const sentAt = new Date()
      await tx.insert(chatMessages).values({
        id: msgId,
        objectUri: args.objectUri,
        convoId: args.convoId,
        senderDid: args.callerDid,
        text: args.text,
        mentions: args.mentions,
        hashtags: args.hashtags,
        attachments: args.attachments,
        inReplyToMessageId: args.inReplyToMessageId,
        quoteMessageId: args.quoteMessageId,
        sentAt,
        rev: updated.rev,
      }).onConflictDoNothing()

      return {
        id: msgId,
        convoId: args.convoId,
        senderDid: args.callerDid,
        text: args.text,
        mentions: args.mentions,
        hashtags: args.hashtags,
        attachments: args.attachments,
        inReplyToMessageId: args.inReplyToMessageId,
        quoteMessageId: args.quoteMessageId,
        objectUri: args.objectUri,
        sentAt: sentAt.toISOString(),
        rev: String(updated.rev),
      }
    })
  )
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export const chatRoutes = new Elysia()
  .use(setupPlugin)
  .guard({ as: 'scoped', isSignedIn: true })

  // ---------------------------------------------------------------------------
  // GET /chat/listConvos
  // Cursor is the ISO timestamp of the last returned conversation's updatedAt.
  // ---------------------------------------------------------------------------
  .get('/chat/listConvos', async ({ user, query, set }) => {
    const callerDid = user.atprotoDid ?? user.getWebId()
    const effectiveLimit = Math.min(Math.max(Number(query.limit) || 50, 1), 200)
    const { cursor } = query

    let cursorDate: Date | undefined
    if (cursor) {
      cursorDate = new Date(cursor)
      if (isNaN(cursorDate.getTime())) {
        set.status = 400
        return { error: 'Invalid cursor format' }
      }
    }

    // JOIN chatConvos + chatMembers so we can ORDER BY updatedAt and paginate properly
    const convoRows = await db
      .select({
        id: chatConvos.id,
        convoType: chatConvos.convoType,
        name: chatConvos.name,
        rev: chatConvos.rev,
        createdAt: chatConvos.createdAt,
        updatedAt: chatConvos.updatedAt,
      })
      .from(chatConvos)
      .innerJoin(
        chatMembers,
        and(eq(chatMembers.convoId, chatConvos.id), eq(chatMembers.userDid, callerDid)),
      )
      .where(cursorDate ? lt(chatConvos.updatedAt, cursorDate) : undefined)
      .orderBy(desc(chatConvos.updatedAt))
      .limit(effectiveLimit + 1)

    const hasMore = convoRows.length > effectiveLimit
    const page = hasMore ? convoRows.slice(0, effectiveLimit) : convoRows
    const convos = page.map(row => ({ ...row, rev: String(row.rev) }))

    return {
      convos,
      ...(hasMore && page.length > 0
        ? { cursor: (page[page.length - 1].updatedAt instanceof Date
              ? page[page.length - 1].updatedAt.toISOString()
              : String(page[page.length - 1].updatedAt)) }
        : {}),
    }
  }, {
    query: t.Object({
      limit: t.Optional(t.String()),
      cursor: t.Optional(t.String()),
    }),
  })

  // ---------------------------------------------------------------------------
  // GET /chat/getConvo
  // ---------------------------------------------------------------------------
  .get('/chat/getConvo', async ({ user, query, set }) => {
    const { convoId } = query
    if (!convoId || !isValidConvoId(convoId)) {
      set.status = 400
      return { error: 'Invalid convoId format' }
    }

    const [convo] = await db.select().from(chatConvos).where(eq(chatConvos.id, convoId)).limit(1)
    if (!convo) {
      set.status = 404
      return { error: 'Conversation not found' }
    }

    const callerDid = user.atprotoDid ?? user.getWebId()
    const [membership] = await db
      .select()
      .from(chatMembers)
      .where(and(eq(chatMembers.convoId, convoId), eq(chatMembers.userDid, callerDid)))
      .limit(1)

    if (!membership) {
      set.status = 403
      return { error: 'Not a member of this conversation' }
    }

    const members = await db.select().from(chatMembers).where(eq(chatMembers.convoId, convoId))

    return { ...convo, rev: String(convo.rev), members }
  }, {
    query: t.Object({
      convoId: t.Optional(t.String()),
    }),
  })

  // ---------------------------------------------------------------------------
  // GET /chat/memberAutocomplete
  // Only returns members of the target conversation. Prevents accidental
  // mentions of users outside the chat.
  // ---------------------------------------------------------------------------
  .get('/chat/memberAutocomplete', async ({ user, query, set }) => {
    const { convoId, q } = query
    if (!convoId || !isValidConvoId(convoId)) {
      set.status = 400
      return { error: 'Invalid convoId format' }
    }

    const effectiveLimit = Math.min(Math.max(Number(query.limit) || 10, 1), MAX_AUTOCOMPLETE_LIMIT)
    const callerDid = user.atprotoDid ?? user.getWebId()

    const [membership] = await db
      .select({ userDid: chatMembers.userDid })
      .from(chatMembers)
      .where(and(eq(chatMembers.convoId, convoId), eq(chatMembers.userDid, callerDid)))
      .limit(1)

    if (!membership) {
      set.status = 403
      return { error: 'Not a member of this conversation' }
    }

    const search = typeof q === 'string' ? sanitizeDid(q) : ''
    const rows = await db
      .select({ userDid: chatMembers.userDid })
      .from(chatMembers)
      .where(
        search
          ? and(eq(chatMembers.convoId, convoId), ilike(chatMembers.userDid, `%${escapeLike(search)}%`))
          : eq(chatMembers.convoId, convoId),
      )
      .limit(effectiveLimit)

    return { suggestions: rows.map(r => r.userDid) }
  }, {
    query: t.Object({
      convoId: t.Optional(t.String()),
      q: t.Optional(t.String()),
      limit: t.Optional(t.String()),
    }),
  })

  // ---------------------------------------------------------------------------
  // GET /chat/getMessages
  // ---------------------------------------------------------------------------
  .get('/chat/getMessages', async ({ user, query, set }) => {
    const { convoId, cursor } = query
    if (!convoId || !isValidConvoId(convoId)) {
      set.status = 400
      return { error: 'Invalid convoId format' }
    }

    const effectiveLimit = Math.min(Math.max(Number(query.limit) || 50, 1), 200)
    const callerDid = user.atprotoDid ?? user.getWebId()

    const [membership] = await db
      .select()
      .from(chatMembers)
      .where(and(eq(chatMembers.convoId, convoId), eq(chatMembers.userDid, callerDid)))
      .limit(1)

    if (!membership) {
      set.status = 403
      return { error: 'Not a member of this conversation' }
    }

    if (cursor && isNaN(new Date(cursor).getTime())) {
      set.status = 400
      return { error: 'Invalid cursor format' }
    }

    const whereConditions = cursor
      ? and(eq(chatMessages.convoId, convoId), lt(chatMessages.sentAt, new Date(cursor)))
      : eq(chatMessages.convoId, convoId)

    const rows = await db
      .select()
      .from(chatMessages)
      .where(whereConditions)
      .orderBy(desc(chatMessages.sentAt))
      .limit(effectiveLimit + 1)

    const hasMore = rows.length > effectiveLimit
    const page = hasMore ? rows.slice(0, effectiveLimit) : rows

    const messages = page.map(msg => ({
      id: msg.id,
      convoId: msg.convoId,
      senderDid: msg.senderDid,
      text: msg.deletedAt ? '' : msg.text,
      mentions: Array.isArray(msg.mentions) ? msg.mentions : [],
      hashtags: Array.isArray(msg.hashtags) ? msg.hashtags : [],
      attachments: Array.isArray(msg.attachments) ? msg.attachments : [],
      inReplyToMessageId: msg.inReplyToMessageId ?? null,
      quoteMessageId: msg.quoteMessageId ?? null,
      objectUri: msg.objectUri ?? null,
      sentAt: msg.sentAt instanceof Date ? msg.sentAt.toISOString() : String(msg.sentAt),
      rev: msg.rev,
      ...(msg.deletedAt ? { deleted: true } : {}),
    }))

    return {
      messages,
      ...(hasMore ? { cursor: messages[messages.length - 1].sentAt } : {}),
    }
  }, {
    query: t.Object({
      convoId: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      cursor: t.Optional(t.String()),
    }),
  })

  // ---------------------------------------------------------------------------
  // POST /chat/sendMessage
  // ---------------------------------------------------------------------------
  .post('/chat/sendMessage', async ({ user, body, set }) => {
    const {
      convoId,
      text: rawText,
      mentions: rawMentions,
      hashtags: rawHashtags,
      attachments: rawAttachments,
      inReplyToMessageId,
      quoteMessageId,
    } = body

    if (!convoId || !isValidConvoId(convoId)) {
      set.status = 400
      return { error: 'Invalid convoId format' }
    }

    const sanitized = sanitizeText(rawText)
    if (!sanitized) {
      set.status = 400
      return { error: 'text must not be empty' }
    }

    if (sanitized.length > MAX_TEXT_LENGTH) {
      set.status = 400
      return { error: 'text exceeds maximum length' }
    }

    const mentions = normalizeMentionList(rawMentions)
    const hashtags = normalizeHashtagList(rawHashtags)
    const attachments = Array.isArray(rawAttachments) ? rawAttachments.slice(0, MAX_ATTACHMENTS) : []

    const normalizedInReplyToMessageId = isValidMessageRefId(inReplyToMessageId) ? inReplyToMessageId.trim() : null
    const normalizedQuoteMessageId = isValidMessageRefId(quoteMessageId) ? quoteMessageId.trim() : null

    if (inReplyToMessageId && !normalizedInReplyToMessageId) {
      set.status = 400
      return { error: 'Invalid inReplyToMessageId format' }
    }

    if (quoteMessageId && !normalizedQuoteMessageId) {
      set.status = 400
      return { error: 'Invalid quoteMessageId format' }
    }

    const callerDid = user.atprotoDid ?? user.getWebId()

    const [membership] = await db
      .select({ role: chatMembers.role })
      .from(chatMembers)
      .where(and(eq(chatMembers.convoId, convoId), eq(chatMembers.userDid, callerDid)))
      .limit(1)

    if (!membership) {
      set.status = 403
      return { error: 'Not a member of this conversation' }
    }

    const memberRows = await db
      .select({ userDid: chatMembers.userDid })
      .from(chatMembers)
      .where(eq(chatMembers.convoId, convoId))

    // Mention scoping: all mentions must be members of this conversation.
    if (mentions.length > 0) {
      const memberSet = new Set(memberRows.map(r => r.userDid))
      const invalidMention = mentions.find(m => !memberSet.has(m))
      if (invalidMention) {
        set.status = 400
        return { error: `Mention is outside this conversation: ${invalidMention}` }
      }
    }

    // Ensure reply/quote message references are local to the same conversation.
    if (normalizedInReplyToMessageId) {
      const [replyTarget] = await db
        .select({ id: chatMessages.id })
        .from(chatMessages)
        .where(and(eq(chatMessages.id, normalizedInReplyToMessageId), eq(chatMessages.convoId, convoId)))
        .limit(1)
      if (!replyTarget) {
        set.status = 400
        return { error: 'inReplyToMessageId not found in this conversation' }
      }
    }

    if (normalizedQuoteMessageId) {
      const [quoteTarget] = await db
        .select({ id: chatMessages.id })
        .from(chatMessages)
        .where(and(eq(chatMessages.id, normalizedQuoteMessageId), eq(chatMessages.convoId, convoId)))
        .limit(1)
      if (!quoteTarget) {
        set.status = 400
        return { error: 'quoteMessageId not found in this conversation' }
      }
    }

    let txResult: {
      id: string
      convoId: string
      senderDid: string
      text: string
      mentions: string[]
      hashtags: string[]
      attachments: Array<Record<string, unknown>>
      inReplyToMessageId: string | null
      quoteMessageId: string | null
      objectUri: string
      sentAt: string
      rev: string
    } | null = null

    const actorUri = user.getWebId()
    const recipientWebIds = memberRows
      .map(row => row.userDid)
      .filter(did => isWebId(did) && did !== actorUri)

    let committed: { objectUri: string }
    try {
      committed = await commitDmToPod(user, sanitized, recipientWebIds, {
        mentions,
        inReplyToMessageId: normalizedInReplyToMessageId,
        attachments,
      })
    } catch (error) {
      if (error instanceof PodCommitUnavailableError) {
        set.status = 503
        return { error: error.message }
      }
      console.error('[chatRoutes] Pod DM commit failed', {
        error: error instanceof Error ? error.message : String(error),
        actor: actorUri,
        convoId,
      })
      set.status = 502
      return { error: 'Pod commit failed' }
    }

    try {
      txResult = await persistCommittedDmProjection({
        convoId,
        callerDid,
        memberDids: memberRows.map(row => row.userDid),
        text: sanitized,
        mentions,
        hashtags,
        attachments,
        inReplyToMessageId: normalizedInReplyToMessageId,
        quoteMessageId: normalizedQuoteMessageId,
        objectUri: committed.objectUri,
      })
    } catch (err) {
      console.error('[chatRoutes] Pod DM committed but local projection failed', {
        error: err instanceof Error ? err.message : String(err),
        actor: actorUri,
        convoId,
        objectUri: committed.objectUri,
      })
      set.status = 202
      return {
        committed: true,
        projection: 'pending',
        objectUri: committed.objectUri,
      }
    }

    return { message: txResult }
  }, {
    body: t.Object({
      convoId: t.String(),
      text: t.String(),
      mentions: t.Optional(t.Array(t.String())),
      hashtags: t.Optional(t.Array(t.String())),
      attachments: t.Optional(t.Array(t.Record(t.String(), t.Any()))),
      inReplyToMessageId: t.Optional(t.String()),
      quoteMessageId: t.Optional(t.String()),
    }),
  })

  // ---------------------------------------------------------------------------
  // POST /chat/getConvoForMembers
  // ---------------------------------------------------------------------------
  .post('/chat/getConvoForMembers', async ({ user, body, set }) => {
    const { members } = body

    if (!members || members.length !== 2) {
      set.status = 400
      return { error: 'Exactly 2 members required for a direct conversation' }
    }

    const callerDid = user.atprotoDid ?? user.getWebId()
    if (!members.includes(callerDid)) {
      set.status = 403
      return { error: 'Caller must be one of the members' }
    }

    const convoId = deriveConvoId(members)

    // Upsert conversation and memberships atomically
    await db.transaction(async (tx) => {
      await tx.insert(chatConvos).values({
        id: convoId,
        convoType: 'direct',
        name: null,
        rev: 0,
      }).onConflictDoNothing()

      for (const did of members) {
        await tx.insert(chatMembers).values({
          convoId,
          userDid: did,
          role: 'member',
        }).onConflictDoNothing()
      }
    })

    const [convo] = await db.select().from(chatConvos).where(eq(chatConvos.id, convoId)).limit(1)
    return { ...convo, rev: String(convo?.rev ?? 0) }
  }, {
    body: t.Object({
      members: t.Array(t.String()),
    }),
  })

  // ---------------------------------------------------------------------------
  // POST /chat/createGroup
  // ---------------------------------------------------------------------------
  .post('/chat/createGroup', async ({ user, body, set }) => {
    const { members, name } = body
    const uniqueMembers = Array.from(
      new Set(
        (members ?? [])
          .map(member => sanitizeDid(member))
          .filter(member => member.length > 0)
      )
    )

    if (uniqueMembers.length < MIN_GROUP_MEMBERS) {
      set.status = 400
      return { error: `At least ${MIN_GROUP_MEMBERS} members required` }
    }

    if (uniqueMembers.length > MAX_GROUP_MEMBERS) {
      set.status = 400
      return { error: `At most ${MAX_GROUP_MEMBERS} members allowed` }
    }

    const callerDid = user.atprotoDid ?? user.getWebId()

    // Ensure caller is in the members list
    const allDids = uniqueMembers.includes(callerDid) ? uniqueMembers : [callerDid, ...uniqueMembers]

    // Generate a random group convoId (groups do not have deterministic IDs)
    const groupId = `convo_${randomUUID().replace(/-/g, '').slice(0, 32)}`

    const memberList = allDids.map(did => ({
      did,
      role: did === callerDid ? 'admin' : 'member',
    }))

    await db.transaction(async (tx) => {
      await tx.insert(chatConvos).values({
        id: groupId,
        convoType: 'group',
        name: name ?? null,
        rev: 0,
      })

      for (const { did, role } of memberList) {
        await tx.insert(chatMembers).values({
          convoId: groupId,
          userDid: did,
          role,
        })
      }
    })

    return {
      id: groupId,
      convoType: 'group',
      name: name ?? null,
      rev: '0',
      members: memberList,
    }
  }, {
    body: t.Object({
      members: t.Array(t.String()),
      name: t.Optional(t.String()),
    }),
  })

  // ---------------------------------------------------------------------------
  // POST /chat/addMember  (admin only)
  // ---------------------------------------------------------------------------
  .post('/chat/addMember', async ({ user, body, set }) => {
    const { convoId, memberDid } = body

    if (!convoId || !isValidConvoId(convoId)) {
      set.status = 400
      return { error: 'Invalid convoId format' }
    }

    if (!memberDid || memberDid.length > MAX_DID_LENGTH) {
      set.status = 400
      return { error: 'memberDid is missing or exceeds maximum length' }
    }

    const callerDid = user.atprotoDid ?? user.getWebId()

    const [callerMembership] = await db
      .select({ role: chatMembers.role })
      .from(chatMembers)
      .where(and(eq(chatMembers.convoId, convoId), eq(chatMembers.userDid, callerDid)))
      .limit(1)

    if (!callerMembership || callerMembership.role !== 'admin') {
      set.status = 403
      return { error: 'Only admins can add members' }
    }

    await db.insert(chatMembers).values({
      convoId,
      userDid: memberDid,
      role: 'member',
    }).onConflictDoNothing()

    return { ok: true }
  }, {
    body: t.Object({
      convoId: t.String(),
      memberDid: t.String(),
    }),
  })

  // ---------------------------------------------------------------------------
  // POST /chat/removeMember  (admin or self-leave)
  // ---------------------------------------------------------------------------
  .post('/chat/removeMember', async ({ user, body, set }) => {
    const { convoId, memberDid } = body

    if (!convoId || !isValidConvoId(convoId)) {
      set.status = 400
      return { error: 'Invalid convoId format' }
    }

    if (!memberDid || memberDid.length > MAX_DID_LENGTH) {
      set.status = 400
      return { error: 'memberDid is missing or exceeds maximum length' }
    }

    const callerDid = user.atprotoDid ?? user.getWebId()

    const [callerMembership] = await db
      .select({ role: chatMembers.role })
      .from(chatMembers)
      .where(and(eq(chatMembers.convoId, convoId), eq(chatMembers.userDid, callerDid)))
      .limit(1)

    if (!callerMembership) {
      set.status = 403
      return { error: 'Not a member of this conversation' }
    }

    const isSelf = memberDid === callerDid
    if (!isSelf && callerMembership.role !== 'admin') {
      set.status = 403
      return { error: 'Only admins can remove other members' }
    }

    await db
      .delete(chatMembers)
      .where(and(eq(chatMembers.convoId, convoId), eq(chatMembers.userDid, memberDid)))

    return { ok: true }
  }, {
    body: t.Object({
      convoId: t.String(),
      memberDid: t.String(),
    }),
  })
