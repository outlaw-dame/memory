/**
 * Chat Routes — Unit / integration tests
 *
 * Tests the HTTP surface of the chat.bsky.* endpoint plugin:
 *   - Input validation (convoId format, DID length, text requirements)
 *   - Auth enforcement (unauthenticated calls return 401)
 *   - Core business logic via DB mock stubs
 *   - Group creation and member management endpoints
 *
 * Uses the same test-app pattern as atBridge.integration.test.ts:
 * the `isSignedIn` macro is replaced with a no-op that sets a synthetic
 * authenticated user, and the Drizzle `db` client is stubbed at the
 * module level for each test.
 */

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import Elysia from 'elysia'
import setupPlugin from '../setup'
import { chatRoutes } from './chatRoutes'
import { db } from '../../db/client'

// ---------------------------------------------------------------------------
// DB stubbing helpers
// ---------------------------------------------------------------------------

type DbLike = Record<string, unknown>

/**
 * Create a chainable query builder that resolves to `rows` when awaited.
 * Supports .select, .from, .where, .limit, .orderBy, .returning, etc.
 */
function createQueryChain(rows: unknown[]) {
  const thenable = {
    from: () => thenable,
    where: () => thenable,
    limit: () => thenable,
    orderBy: () => thenable,
    leftJoin: () => thenable,
    innerJoin: () => thenable,
    returning: () => Promise.resolve(rows),
    onConflictDoNothing: () => Promise.resolve([]),
    then: (
      resolve: (value: unknown[]) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(rows).then(resolve, reject),
    catch: (reject: (reason: unknown) => unknown) => Promise.resolve(rows).catch(reject),
    finally: (fn: () => void) => Promise.resolve(rows).finally(fn),
  } as Record<string, unknown>
  return thenable
}

interface DbStub {
  rows: unknown[]
  transactionResult: unknown
  restore: () => void
}

function stubDb(rows: unknown[], transactionResult: unknown = rows[0]): DbStub {
  const dbLike = db as unknown as DbLike
  const origSelect = dbLike.select
  const origInsert = dbLike.insert
  const origUpdate = dbLike.update
  const origDelete = dbLike.delete
  const origTransaction = dbLike.transaction

  dbLike.select = (_fields?: unknown) => createQueryChain(rows)
  dbLike.insert = (_table: unknown) => ({
    values: (_vals: unknown) => ({
      onConflictDoNothing: () => Promise.resolve([]),
      returning: (_fields: unknown) => Promise.resolve(rows),
      then: (resolve: (v: unknown[]) => unknown) => Promise.resolve([]).then(resolve),
    }),
    then: (resolve: (v: unknown[]) => unknown) => Promise.resolve([]).then(resolve),
  })
  dbLike.update = (_table: unknown) => ({
    set: (_vals: unknown) => ({
      where: (_cond: unknown) => ({
        returning: (_fields: unknown) => Promise.resolve(rows),
        then: (resolve: (v: unknown[]) => unknown) => Promise.resolve(rows).then(resolve),
      }),
    }),
  })
  dbLike.delete = (_table: unknown) => ({
    where: (_cond: unknown) => ({
      then: (resolve: (v: unknown[]) => unknown) => Promise.resolve([]).then(resolve),
    }),
  })
  dbLike.transaction = async (fn: (tx: unknown) => Promise<unknown>) => {
    return fn({
      select: (_fields?: unknown) => createQueryChain(rows),
      insert: (_table: unknown) => ({
        values: (_vals: unknown) => ({
          onConflictDoNothing: () => Promise.resolve([]),
          returning: (_f: unknown) => Promise.resolve(rows),
          then: (resolve: (v: unknown[]) => unknown) => Promise.resolve([]).then(resolve),
        }),
      }),
      update: (_table: unknown) => ({
        set: (_vals: unknown) => ({
          where: (_cond: unknown) => ({
            returning: (_f: unknown) => Promise.resolve([{ rev: 1 }]),
          }),
        }),
      }),
      delete: (_table: unknown) => ({
        where: (_cond: unknown) => ({
          then: (resolve: (v: unknown[]) => unknown) => Promise.resolve([]).then(resolve),
        }),
      }),
    })
  }

  return {
    rows,
    transactionResult,
    restore: () => {
      dbLike.select = origSelect
      dbLike.insert = origInsert
      dbLike.update = origUpdate
      dbLike.delete = origDelete
      dbLike.transaction = origTransaction
    },
  }
}

// ---------------------------------------------------------------------------
// Test app factory
// ---------------------------------------------------------------------------

const ALICE_DID = 'did:plc:alice1234567890abcd'
const BOB_DID = 'did:plc:bob1234567890abcde'

// A deterministic convoId for alice+bob (mirrors deriveConvoId in chatRoutes)
import crypto from 'node:crypto'
function deriveConvoId(dids: string[]): string {
  const sorted = [...dids].sort()
  const digest = crypto.createHash('sha256').update(sorted.join('|')).digest('hex')
  return `convo_${digest.slice(0, 32)}`
}
const ALICE_BOB_CONVO_ID = deriveConvoId([ALICE_DID, BOB_DID])

function createAuthenticatedChatApp(userDid = ALICE_DID) {
  return new Elysia({ aot: false })
    .use(setupPlugin)
    // No-op macro so the chatRoutes guard({isSignedIn:true}) resolves without error.
    // Actual user injection is via onBeforeHandle below, which is guaranteed to fire
    // for all child-plugin routes with {as:'global'}.
    .macro({ isSignedIn: (_enabled: boolean) => ({}) })
    .onBeforeHandle({ as: 'global' }, ({ user }: any) => {
      user.atprotoDid = userDid
      user.getWebId = () => userDid
    })
    .use(chatRoutes)
}

function unauthenticatedApp() {
  // App where every request is rejected before reaching the route handler.
  return new Elysia({ aot: false })
    .use(setupPlugin)
    .macro({ isSignedIn: (_enabled: boolean) => ({}) })
    .onBeforeHandle({ as: 'global' }, ({ set }: any) => {
      set.status = 401
      return 'Unauthorized'
    })
    .use(chatRoutes)
}

// ---------------------------------------------------------------------------
// Test data fixtures
// ---------------------------------------------------------------------------

const now = new Date().toISOString()

function makeConvoRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ALICE_BOB_CONVO_ID,
    convoType: 'direct',
    name: null,
    rev: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function makeMemberRow(did: string, role = 'member') {
  return { convoId: ALICE_BOB_CONVO_ID, userDid: did, role, joinedAt: now, lastReadRev: 0 }
}

function makeMessageRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'msg-uuid-1234',
    convoId: ALICE_BOB_CONVO_ID,
    senderDid: ALICE_DID,
    text: 'Hello!',
    sentAt: now,
    rev: 1,
    deletedAt: null,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Input validation: convoId format
// ---------------------------------------------------------------------------

describe('chat input validation', () => {
  let stub: DbStub

  beforeEach(() => {
    stub = stubDb([])
  })

  afterEach(() => stub.restore())

  it('GET /chat/getConvo rejects an invalid convoId', async () => {
    const app = createAuthenticatedChatApp()
    const res = await app.handle(
      new Request('http://localhost/chat/getConvo?convoId=invalid-id'),
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/convoId/i)
  })

  it('GET /chat/getMessages rejects a missing convoId', async () => {
    const app = createAuthenticatedChatApp()
    const res = await app.handle(new Request('http://localhost/chat/getMessages'))
    expect(res.status).toBe(400)
  })

  it('POST /chat/sendMessage rejects empty text', async () => {
    const app = createAuthenticatedChatApp()
    const res = await app.handle(
      new Request('http://localhost/chat/sendMessage', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ convoId: ALICE_BOB_CONVO_ID, text: '   ' }),
      }),
    )
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/text/i)
  })

  it('POST /chat/sendMessage rejects an invalid convoId', async () => {
    const app = createAuthenticatedChatApp()
    const res = await app.handle(
      new Request('http://localhost/chat/sendMessage', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ convoId: '../../../etc/passwd', text: 'hello' }),
      }),
    )
    expect(res.status).toBe(400)
  })

  it('POST /chat/getConvoForMembers rejects fewer than 2 members', async () => {
    const app = createAuthenticatedChatApp()
    const res = await app.handle(
      new Request('http://localhost/chat/getConvoForMembers', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ members: [ALICE_DID] }),
      }),
    )
    expect(res.status).toBe(400)
  })

  it('POST /chat/getConvoForMembers rejects if caller is not one of the members', async () => {
    const app = createAuthenticatedChatApp()
    const res = await app.handle(
      new Request('http://localhost/chat/getConvoForMembers', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ members: [BOB_DID, 'did:plc:carol'] }),
      }),
    )
    expect(res.status).toBe(403)
  })
})

// ---------------------------------------------------------------------------
// Auth enforcement
// ---------------------------------------------------------------------------

describe('chat auth enforcement', () => {
  it('GET /chat/listConvos returns 401 when not authenticated', async () => {
    const app = unauthenticatedApp()
    const res = await app.handle(new Request('http://localhost/chat/listConvos'))
    expect(res.status).toBe(401)
  })

  it('POST /chat/sendMessage returns 401 when not authenticated', async () => {
    const app = unauthenticatedApp()
    const res = await app.handle(
      new Request('http://localhost/chat/sendMessage', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ convoId: ALICE_BOB_CONVO_ID, text: 'hi' }),
      }),
    )
    expect(res.status).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// GET /chat/listConvos
// ---------------------------------------------------------------------------

describe('GET /chat/listConvos', () => {
  let stub: DbStub

  afterEach(() => stub?.restore())

  it('returns an empty list when the user has no conversations', async () => {
    stub = stubDb([]) // no member rows
    const app = createAuthenticatedChatApp()
    const res = await app.handle(new Request('http://localhost/chat/listConvos'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.convos).toEqual([])
    expect(body.cursor).toBeUndefined()
  })

  it('returns conversations for the authenticated user', async () => {
    const convoRow = makeConvoRow()
    // listConvos now uses a single JOIN query — one db.select call returns full convo rows
    const dbLike = db as unknown as DbLike
    const origSelect = dbLike.select
    dbLike.select = () => {
      return createQueryChain([convoRow])
    }
    stub = {
      rows: [convoRow],
      transactionResult: null,
      restore: () => { dbLike.select = origSelect },
    }

    const app = createAuthenticatedChatApp()
    const res = await app.handle(new Request('http://localhost/chat/listConvos'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.convos).toHaveLength(1)
    expect(body.convos[0].id).toBe(ALICE_BOB_CONVO_ID)
    expect(body.convos[0].rev).toBe('1')
  })
})

// ---------------------------------------------------------------------------
// GET /chat/getConvo
// ---------------------------------------------------------------------------

describe('GET /chat/getConvo', () => {
  let stub: DbStub

  afterEach(() => stub?.restore())

  it('returns 404 when conversation does not exist', async () => {
    stub = stubDb([]) // no convo rows
    const app = createAuthenticatedChatApp()
    const res = await app.handle(
      new Request(`http://localhost/chat/getConvo?convoId=${ALICE_BOB_CONVO_ID}`),
    )
    expect(res.status).toBe(404)
  })

  it('returns 403 when caller is not a member', async () => {
    const convoRow = makeConvoRow()
    let callCount = 0
    const dbLike = db as unknown as DbLike
    const origSelect = dbLike.select
    dbLike.select = () => {
      callCount++
      if (callCount === 1) return createQueryChain([convoRow]) // convo exists
      return createQueryChain([]) // caller not a member
    }
    stub = { rows: [], transactionResult: null, restore: () => { dbLike.select = origSelect } }

    const app = createAuthenticatedChatApp()
    const res = await app.handle(
      new Request(`http://localhost/chat/getConvo?convoId=${ALICE_BOB_CONVO_ID}`),
    )
    expect(res.status).toBe(403)
  })
})

// ---------------------------------------------------------------------------
// GET /chat/getMessages
// ---------------------------------------------------------------------------

describe('GET /chat/getMessages', () => {
  let stub: DbStub

  afterEach(() => stub?.restore())

  it('returns messages with pagination cursor', async () => {
    const msg1 = makeMessageRow({ id: 'msg-1', sentAt: '2026-05-01T10:00:00.000Z' })
    const msg2 = makeMessageRow({ id: 'msg-2', sentAt: '2026-05-01T09:00:00.000Z' })
    let callCount = 0
    const dbLike = db as unknown as DbLike
    const origSelect = dbLike.select
    dbLike.select = () => {
      callCount++
      if (callCount === 1) return createQueryChain([makeMemberRow(ALICE_DID)]) // member check
      return createQueryChain([msg1, msg2]) // messages
    }
    stub = { rows: [], transactionResult: null, restore: () => { dbLike.select = origSelect } }

    const app = createAuthenticatedChatApp()
    const res = await app.handle(
      new Request(`http://localhost/chat/getMessages?convoId=${ALICE_BOB_CONVO_ID}&limit=1`),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    // With limit=1 and 2 rows returned (limit+1), should paginate
    expect(body.messages).toHaveLength(1)
    expect(body.cursor).toBe('2026-05-01T10:00:00.000Z')
  })

  it('soft-deleted messages return empty text and deleted=true', async () => {
    const deleted = makeMessageRow({ deletedAt: '2026-05-01T11:00:00.000Z', text: 'secret' })
    let callCount = 0
    const dbLike = db as unknown as DbLike
    const origSelect = dbLike.select
    dbLike.select = () => {
      callCount++
      if (callCount === 1) return createQueryChain([makeMemberRow(ALICE_DID)])
      return createQueryChain([deleted])
    }
    stub = { rows: [], transactionResult: null, restore: () => { dbLike.select = origSelect } }

    const app = createAuthenticatedChatApp()
    const res = await app.handle(
      new Request(`http://localhost/chat/getMessages?convoId=${ALICE_BOB_CONVO_ID}`),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.messages[0].text).toBe('')
    expect(body.messages[0].deleted).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// POST /chat/sendMessage
// ---------------------------------------------------------------------------

describe('POST /chat/sendMessage', () => {
  let stub: DbStub

  afterEach(() => stub?.restore())

  it('returns 403 when sender is not a member', async () => {
    stub = stubDb([]) // no member row found
    const app = createAuthenticatedChatApp()
    const res = await app.handle(
      new Request('http://localhost/chat/sendMessage', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ convoId: ALICE_BOB_CONVO_ID, text: 'hi' }),
      }),
    )
    expect(res.status).toBe(403)
  })

  it('strips null bytes from message text', async () => {
    let capturedText: string | null = null
    const dbLike = db as unknown as DbLike
    const origSelect = dbLike.select
    const origTransaction = dbLike.transaction

    dbLike.select = () => createQueryChain([{ role: 'member' }]) // member check
    dbLike.transaction = async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn({
        update: (_table: unknown) => ({
          set: (_vals: unknown) => ({
            where: (_cond: unknown) => ({
              returning: (_f: unknown) => Promise.resolve([{ rev: 1 }]),
            }),
          }),
        }),
        insert: (_table: unknown) => ({
          values: (vals: unknown) => {
            const v = vals as { text: string }
            capturedText = v.text
            return { then: (r: (v: unknown[]) => unknown) => Promise.resolve([]).then(r) }
          },
        }),
      })
    }

    stub = {
      rows: [],
      transactionResult: null,
      restore: () => {
        dbLike.select = origSelect
        dbLike.transaction = origTransaction
      },
    }

    const app = createAuthenticatedChatApp()
    await app.handle(
      new Request('http://localhost/chat/sendMessage', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ convoId: ALICE_BOB_CONVO_ID, text: 'Hello\x00World' }),
      }),
    )

    expect(capturedText).not.toBeNull()
    expect(capturedText!).toBe('HelloWorld')
  })
})

// ---------------------------------------------------------------------------
// POST /chat/createGroup
// ---------------------------------------------------------------------------

describe('POST /chat/createGroup', () => {
  let stub: DbStub

  afterEach(() => stub?.restore())

  it('returns 400 with fewer than 2 members', async () => {
    stub = stubDb([])
    const app = createAuthenticatedChatApp()
    const res = await app.handle(
      new Request('http://localhost/chat/createGroup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ members: [ALICE_DID], name: 'Team' }),
      }),
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 with more than 256 members', async () => {
    stub = stubDb([])
    const dids = Array.from({ length: 257 }, (_, i) => `did:plc:user${i}`)
    const app = createAuthenticatedChatApp()
    const res = await app.handle(
      new Request('http://localhost/chat/createGroup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ members: dids }),
      }),
    )
    expect(res.status).toBe(400)
  })

  it('creates a group and returns convoType=group', async () => {
    const dbLike = db as unknown as DbLike
    const origTransaction = dbLike.transaction
    dbLike.transaction = async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn({
        insert: (_table: unknown) => ({
          values: (_vals: unknown) => ({
            then: (r: (v: unknown[]) => unknown) => Promise.resolve([]).then(r),
          }),
        }),
      })
    }
    stub = {
      rows: [],
      transactionResult: null,
      restore: () => { dbLike.transaction = origTransaction },
    }

    const app = createAuthenticatedChatApp()
    const res = await app.handle(
      new Request('http://localhost/chat/createGroup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ members: [ALICE_DID, BOB_DID], name: 'Team Alpha' }),
      }),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.convoType).toBe('group')
    expect(body.name).toBe('Team Alpha')
    expect(body.rev).toBe('0')
    // Caller (ALICE) gets admin role
    const aliceMember = body.members.find((m: { did: string; role: string }) => m.did === ALICE_DID)
    expect(aliceMember?.role).toBe('admin')
    const bobMember = body.members.find((m: { did: string; role: string }) => m.did === BOB_DID)
    expect(bobMember?.role).toBe('member')
  })
})

// ---------------------------------------------------------------------------
// POST /chat/addMember  (admin-only)
// ---------------------------------------------------------------------------

describe('POST /chat/addMember', () => {
  let stub: DbStub

  afterEach(() => stub?.restore())

  it('returns 403 when caller is a plain member (not admin)', async () => {
    stub = stubDb([{ role: 'member' }]) // caller is member, not admin
    const app = createAuthenticatedChatApp()
    const res = await app.handle(
      new Request('http://localhost/chat/addMember', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ convoId: ALICE_BOB_CONVO_ID, memberDid: 'did:plc:carol' }),
      }),
    )
    expect(res.status).toBe(403)
  })

  it('returns 403 when caller is not a member at all', async () => {
    stub = stubDb([]) // no member row
    const app = createAuthenticatedChatApp()
    const res = await app.handle(
      new Request('http://localhost/chat/addMember', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ convoId: ALICE_BOB_CONVO_ID, memberDid: 'did:plc:carol' }),
      }),
    )
    expect(res.status).toBe(403)
  })

  it('returns 400 with an invalid memberDid', async () => {
    stub = stubDb([])
    const app = createAuthenticatedChatApp()
    const res = await app.handle(
      new Request('http://localhost/chat/addMember', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          convoId: ALICE_BOB_CONVO_ID,
          memberDid: 'a'.repeat(3000), // exceeds max DID len
        }),
      }),
    )
    expect(res.status).toBe(400)
  })
})

// ---------------------------------------------------------------------------
// POST /chat/removeMember  (admin or self)
// ---------------------------------------------------------------------------

describe('POST /chat/removeMember', () => {
  let stub: DbStub

  afterEach(() => stub?.restore())

  it('allows a user to remove themselves (self-leave)', async () => {
    let deleteWasCalled = false
    const dbLike = db as unknown as DbLike
    const origSelect = dbLike.select
    const origDelete = dbLike.delete
    dbLike.select = () => createQueryChain([{ role: 'member' }]) // caller is member
    dbLike.delete = (_table: unknown) => ({
      where: (_cond: unknown) => ({
        then: (resolve: (v: unknown[]) => unknown) => {
          deleteWasCalled = true
          return Promise.resolve([]).then(resolve)
        },
      }),
    })

    stub = {
      rows: [],
      transactionResult: null,
      restore: () => {
        dbLike.select = origSelect
        dbLike.delete = origDelete
      },
    }

    const app = createAuthenticatedChatApp(ALICE_DID)
    const res = await app.handle(
      new Request('http://localhost/chat/removeMember', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ convoId: ALICE_BOB_CONVO_ID, memberDid: ALICE_DID }),
      }),
    )
    expect(res.status).toBe(200)
    expect(deleteWasCalled).toBe(true)
  })

  it('returns 403 when a non-admin tries to remove another user', async () => {
    stub = stubDb([{ role: 'member' }]) // caller is member, not admin
    const app = createAuthenticatedChatApp(ALICE_DID)
    const res = await app.handle(
      new Request('http://localhost/chat/removeMember', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ convoId: ALICE_BOB_CONVO_ID, memberDid: BOB_DID }),
      }),
    )
    expect(res.status).toBe(403)
  })
})
