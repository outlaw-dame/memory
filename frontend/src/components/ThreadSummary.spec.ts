import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ThreadSummary from './ThreadSummary.vue'
import type { ThreadContextResponse, UnifiedFeedItem } from '@/stores/atBridgeStore'

const fetchThreadContextMock = vi.fn<(...args: unknown[]) => Promise<ThreadContextResponse | null>>()

vi.mock('@/stores/atBridgeStore', () => ({
  useAtBridgeStore: () => ({
    fetchThreadContext: fetchThreadContextMock,
  }),
}))

vi.mock('./UnifiedFeedItem.vue', () => ({
  default: {
    name: 'UnifiedFeedItem',
    props: ['item'],
    template: '<div class="reply-item">{{ item.content }}</div>',
  },
}))

function buildItem(): UnifiedFeedItem {
  return {
    id: 42,
    content: 'Root post',
    postType: 'note',
    createdAt: '2026-04-20T10:00:00.000Z',
    isPublic: true,
    authorId: 1,
    authorName: 'Alice',
    authorWebId: 'https://pods.example/users/alice',
    authorProviderEndpoint: 'https://pods.example',
    source: 'activitypods',
    atUri: null,
    objectUri: 'https://pods.example/posts/root',
    type: 'thread_summary',
    threadReplyCount: 9,
    threadParticipantCount: 4,
    threadLastActivityAt: '2026-04-20T10:30:00.000Z',
  }
}

describe('ThreadSummary', () => {
  it('switches to viewer-projected counts after loading thread context', async () => {
    fetchThreadContextMock.mockResolvedValueOnce({
      rootUri: 'https://pods.example/posts/root',
      root: null,
      items: [
        {
          id: 43,
          content: 'Visible reply',
          postType: 'note',
          createdAt: '2026-04-20T11:00:00.000Z',
          isPublic: true,
          authorId: 2,
          authorName: 'Bob',
          authorWebId: 'https://pods.example/users/bob',
          authorProviderEndpoint: 'https://pods.example',
          source: 'activitypods',
          atUri: null,
          objectUri: 'https://pods.example/posts/reply-1',
          type: 'post',
        },
      ],
      nextCursor: null,
      hasMore: false,
      replyCount: 1,
      participantCount: 1,
      lastActivityAt: '2026-04-20T11:00:00.000Z',
    })

    const wrapper = mount(ThreadSummary, {
      props: {
        item: buildItem(),
        rootUri: 'https://pods.example/posts/root',
      },
    })

    expect(wrapper.text()).toContain('9 replies')
    expect(wrapper.text()).toContain('4 people')

    await wrapper.get('button').trigger('click')
    await vi.waitFor(() => {
      expect(fetchThreadContextMock).toHaveBeenCalledWith('https://pods.example/posts/root', { limit: 5 })
    })

    expect(wrapper.text()).toContain('1 reply')
    expect(wrapper.text()).toContain('1 person')
    expect(wrapper.text()).toContain('Visible reply')
  })
})