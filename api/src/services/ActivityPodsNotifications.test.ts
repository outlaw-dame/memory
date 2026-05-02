import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { db } from '../db/client'
import { maybePersistDirectMessage } from './ActivityPodsNotifications'

type DbLike = Record<string, unknown>

function createSelectChain(rows: unknown[]) {
  const chain = {
    from: () => chain,
    where: () => chain,
    limit: () => Promise.resolve(rows),
  }
  return chain
}

describe('maybePersistDirectMessage', () => {
  const dbLike = db as unknown as DbLike
  const originalSelect = dbLike.select
  const originalTransaction = dbLike.transaction

  let insertedValues: unknown[]
  let transactionCalls: number

  beforeEach(() => {
    insertedValues = []
    transactionCalls = 0

    dbLike.select = () => createSelectChain([
      {
        id: 7,
        webId: 'https://alice.example/profile/card#me',
        podToken: 'pod-token',
      },
    ])

    dbLike.transaction = async (fn: (tx: unknown) => Promise<unknown>) => {
      transactionCalls += 1
      const tx = {
        insert: (_table: unknown) => ({
          values: (vals: unknown) => {
            insertedValues.push(vals)
            return {
              onConflictDoNothing: async () => [],
            }
          },
        }),
      }
      return fn(tx)
    }
  })

  afterEach(() => {
    dbLike.select = originalSelect
    dbLike.transaction = originalTransaction
  })

  it('persists an embedded transient Add(Create(Note)) direct message', async () => {
    const payload = {
      type: 'Add',
      object: {
        id: 'https://bridge.example/_bridge/canonical/abc#event',
        type: 'Create',
        actor: 'https://bob.example/profile/card#me',
        to: ['https://alice.example/profile/card#me'],
        cc: [],
        published: '2026-05-02T12:00:00.000Z',
        object: {
          id: 'https://bridge.example/_bridge/canonical/abc#note',
          type: 'Note',
          to: ['https://alice.example/profile/card#me'],
          cc: [],
          content: '  hello\u0000world  ',
          tag: [
            { type: 'Mention', href: 'https://alice.example/profile/card#me' },
            { type: 'Mention', href: 'https://mallory.example/profile/card#me' },
            { type: 'Hashtag', name: '#PrivateTag' },
          ],
          attachment: [
            { type: 'Link', url: 'https://cdn.example/files/demo.png', mediaType: 'image/png' },
          ],
        },
      },
      target: 'https://alice.example/inbox',
    }

    await maybePersistDirectMessage(7, payload)

    expect(transactionCalls).toBe(1)
    expect(insertedValues.length).toBe(4)

    const chatMessageInsert = insertedValues[3] as {
      senderDid: string
      text: string
      id: string
      convoId: string
      mentions: string[]
      hashtags: string[]
      attachments: Array<Record<string, unknown>>
    }

    expect(chatMessageInsert.senderDid).toBe('https://bob.example/profile/card#me')
    expect(chatMessageInsert.text).toBe('helloworld')
    expect(chatMessageInsert.id.length).toBe(36)
    expect(chatMessageInsert.convoId.startsWith('convo_')).toBe(true)
    expect(chatMessageInsert.mentions).toEqual(['https://alice.example/profile/card#me'])
    expect(chatMessageInsert.hashtags).toEqual(['privatetag'])
    expect(chatMessageInsert.attachments.length).toBe(1)
  })

  it('does nothing for non-Add payloads', async () => {
    await maybePersistDirectMessage(7, {
      type: 'Create',
      object: {},
    })

    expect(transactionCalls).toBe(0)
    expect(insertedValues.length).toBe(0)
  })

  it('does not persist when audience is public', async () => {
    await maybePersistDirectMessage(7, {
      type: 'Add',
      object: {
        id: 'https://remote.example/activities/123',
        type: 'Create',
        actor: 'https://bob.example/profile/card#me',
        to: ['https://www.w3.org/ns/activitystreams#Public'],
        object: {
          id: 'https://remote.example/objects/123',
          type: 'Note',
          content: 'public post',
        },
      },
    })

    expect(transactionCalls).toBe(0)
    expect(insertedValues.length).toBe(0)
  })

  it('does not persist self-messages', async () => {
    await maybePersistDirectMessage(7, {
      type: 'Add',
      object: {
        id: 'https://remote.example/activities/555',
        type: 'Create',
        actor: 'https://alice.example/profile/card#me',
        to: ['https://alice.example/profile/card#me'],
        object: {
          id: 'https://remote.example/objects/555',
          type: 'Note',
          content: 'self note',
        },
      },
    })

    expect(transactionCalls).toBe(0)
    expect(insertedValues.length).toBe(0)
  })
})
