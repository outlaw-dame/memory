import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useConversationsStore } from './conversationsStore'

const fetchMock = vi.fn()

vi.stubGlobal('fetch', fetchMock)

vi.mock('@/controller/http', () => ({
  getApiBaseUrl: () => 'https://memory.example/api',
  buildApiHeaders: () => ({ 'content-type': 'application/json' }),
}))

vi.mock('@/i18n', () => ({
  t: (key: string, params?: Record<string, string | number>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}))

vi.mock('./authStore', () => ({
  useAuthStore: () => ({
    token: '',
    user: {
      webId: 'https://alice.example/profile/card#me',
    },
  }),
}))

function jsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  } as Response
}

describe('conversationsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    fetchMock.mockReset()
  })

  it('hydrates conversation previews from the live chat API', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({
        convos: [
          {
            id: 'convo_1234567890abcdef1234567890abcd',
            convoType: 'direct',
            name: null,
            rev: '1',
            createdAt: '2026-05-02T11:00:00.000Z',
            updatedAt: '2026-05-02T12:00:00.000Z',
          },
        ],
      }))
      .mockResolvedValueOnce(jsonResponse({
        id: 'convo_1234567890abcdef1234567890abcd',
        convoType: 'direct',
        name: null,
        rev: '1',
        createdAt: '2026-05-02T11:00:00.000Z',
        updatedAt: '2026-05-02T12:00:00.000Z',
        members: [
          { userDid: 'https://alice.example/profile/card#me', role: 'member' },
          { userDid: 'https://bob.example/profile/card#me', role: 'member' },
        ],
      }))
      .mockResolvedValueOnce(jsonResponse({
        messages: [
          {
            id: 'msg-1',
            convoId: 'convo_1234567890abcdef1234567890abcd',
            senderDid: 'https://bob.example/profile/card#me',
            text: 'hello from bob',
            mentions: [],
            hashtags: [],
            attachments: [],
            inReplyToMessageId: null,
            quoteMessageId: null,
            sentAt: '2026-05-02T12:00:00.000Z',
            rev: '1',
          },
        ],
      }))

    const store = useConversationsStore()
    await store.fetchConversations()

    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(store.conversations).toEqual([
      expect.objectContaining({
        id: 'convo_1234567890abcdef1234567890abcd',
        type: 'direct',
        name: 'bob.example',
        preview: 'hello from bob',
        otherUserWebId: 'https://bob.example/profile/card#me',
        members: [
          'https://alice.example/profile/card#me',
          'https://bob.example/profile/card#me',
        ],
      }),
    ])
  })

  it('uses the scoped member autocomplete route', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({
      suggestions: [
        'https://bob.example/profile/card#me',
        'https://carol.example/profile/card#me',
      ],
    }))

    const store = useConversationsStore()
    const suggestions = await store.memberAutocomplete('convo_1234567890abcdef1234567890abcd', 'bo')

    expect(fetchMock).toHaveBeenCalledWith(
      'https://memory.example/api/chat/memberAutocomplete?convoId=convo_1234567890abcdef1234567890abcd&q=bo&limit=8',
      expect.objectContaining({
        headers: { 'content-type': 'application/json' },
      }),
    )
    expect(suggestions).toEqual([
      'https://bob.example/profile/card#me',
      'https://carol.example/profile/card#me',
    ])
  })
})
