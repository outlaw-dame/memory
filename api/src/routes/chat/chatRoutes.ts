/**
 * Chat routes — DB-backed, ActivityPods-integrated
 *
 * All conversations are owned by the user's ActivityPods pod. Local storage in
 * PostgreSQL (chat_convos / chat_members / chat_messages) mirrors the pod's
 * authoritative state so that the UI can paginate efficiently.
 *
 * Identity model:
 *   - callerDid = user.atprotoDid (ATProto users) or user.getWebId() (AP/pod users)
 *   - Remote participants are identified by their AP actor URI (WebID)
 *
 * ConvoId derivation: "convo_" + first 32 hex chars of SHA-256(sorted DIDs joined by "|")
 */

import Elysia, { t } from 'elysia'
import { createHash, randomUUID } from 'node:crypto'
import { eq, and, desc, lt, sql } from 'drizzle-orm'
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
const CONVO_ID_RE = /^convo_[0-9a-f]{32}$/
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

// ---------------------------------------------------------------------------
// Best-effort outgoing DM delivery via ActivityPods outbox
// ---------------------------------------------------------------------------

async function postDmToOutbox(
  user: { endpoint?: string; userName?: string; token?: string; getWebId: () => string },
  convoId: string,
  text: string,
  msgId: string,
): Promise<void> {
  // Guard: skip for non-pod users and tests (endpoint/token not set)
  if (!user.endpoint || !user.token || !user.userName) return

  const actorUri = user.getWebId()

  let recipientWebIds: string[]
  try {
    const rows = await db
      .select({ userDid: chatMembers.userDid })
      .from(chatMembers)
      .where(eq(chatMembers.convoId, convoId))
    recipientWebIds = rows
      .map(r => r.userDid)
      .filter(did => isWebId(did) && did !== actorUri)
  } catch {
    return
  }

  if (recipientWebIds.length === 0) return

  try {
    const post: NoteCreateRequest = {
      '@context': AS_CONTEXT,
      type: 'Note',
      attributedTo: actorUri,
      to: recipientWebIds,
      content: text,
    }
    await ActivityPod.createPost(user as Parameters<typeof ActivityPod.createPost>[0], post)
  } catch (err) {
    console.error('[chatRoutes] DM outbox delivery failed', {
      error: err instanceof Error ? err.message : String(err),
      actor: actorUri,
      msgId,
    })
  }
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
    const { convoId, text: rawText } = body

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

    const msgId = randomUUID()

    let txResult: { id: string; convoId: string; senderDid: string; text: string; sentAt: string; rev: string } | null = null
    try {
      txResult = await db.transaction(async (tx) => {
        const [updated] = await tx
          .update(chatConvos)
          .set({ rev: sql`${chatConvos.rev} + 1`, updatedAt: new Date() })
          .where(eq(chatConvos.id, convoId))
          .returning({ rev: chatConvos.rev })

        if (!updated) throw new Error('CONVO_NOT_FOUND')

        const msgRev = updated.rev
        const sentAt = new Date()

        await tx.insert(chatMessages).values({
          id: msgId,
          convoId,
          senderDid: callerDid,
          text: sanitized,
          sentAt,
          rev: msgRev,
        })

        return { id: msgId, convoId, senderDid: callerDid, text: sanitized, sentAt: sentAt.toISOString(), rev: String(msgRev) }
      })
    } catch (err) {
      if (err instanceof Error && err.message === 'CONVO_NOT_FOUND') {
        set.status = 404
        return { error: 'Conversation not found' }
      }
      throw err
    }

    // Best-effort AP delivery via ActivityPods outbox (non-blocking)
    postDmToOutbox(user, convoId, sanitized, msgId).catch(() => {})

    return { message: txResult }
  }, {
    body: t.Object({
      convoId: t.String(),
      text: t.String(),
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

    if (!members || members.length < MIN_GROUP_MEMBERS) {
      set.status = 400
      return { error: `At least ${MIN_GROUP_MEMBERS} members required` }
    }

    if (members.length > MAX_GROUP_MEMBERS) {
      set.status = 400
      return { error: `At most ${MAX_GROUP_MEMBERS} members allowed` }
    }

    const callerDid = user.atprotoDid ?? user.getWebId()

    // Ensure caller is in the members list
    const allDids = members.includes(callerDid) ? members : [callerDid, ...members]

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


