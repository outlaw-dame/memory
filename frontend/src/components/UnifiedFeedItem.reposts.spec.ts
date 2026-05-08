import { describe, expect, it, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import UnifiedFeedItem from './UnifiedFeedItem.vue'
import type { UnifiedFeedItem as UnifiedFeedItemModel } from '@/stores/atBridgeStore'

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

vi.mock('@/composables/useFollow', () => ({
  useFollow: () => ({
    follow: vi.fn(),
    isFollowing: vi.fn(() => false),
  }),
}))

vi.mock('@/composables/useReply', () => ({
  useReply: () => ({
    resolvePolicy: vi.fn(async () => null),
    submitReply: vi.fn(async () => null),
    replyError: null,
    isResolving: false,
    isSubmitting: false,
  }),
}))

vi.mock('@/i18n', () => ({
  useI18n: () => ({
    t: (key: string, params: Record<string, string | number> = {}) => {
      const messages: Record<string, string> = {
        'feed.reposts.action': 'Repost',
        'feed.reposts.reposted': 'Reposted',
        'feed.reposts.byMany': '{names} and {count} others reposted',
      }
      return (messages[key] ?? key).replace(/\{(\w+)\}/g, (_, token: string) => String(params[token]))
    },
  }),
}))

function buildItem(): UnifiedFeedItemModel {
  return {
    id: 1,
    content: 'Root post',
    postType: 'note',
    title: null,
    summary: null,
    canonicalUrl: null,
    createdAt: '2026-04-10T10:00:00.000Z',
    isPublic: true,
    authorId: 1,
    authorName: 'Root Author',
    authorWebId: 'https://pods.example/users/root',
    authorProviderEndpoint: 'https://pods.example',
    source: 'activitypods',
    atUri: null,
    objectUri: 'https://pods.example/objects/1',
    repostCount: 4,
    viewerHasReposted: true,
    repostGroup: {
      subjectUri: 'https://pods.example/objects/1',
      count: 4,
      boostedAt: '2026-04-10T11:00:00.000Z',
      actorLimitExceeded: true,
      viewerHasReposted: true,
      actors: [
        {
          actorId: 'https://pods.example/users/viewer',
          displayName: 'You',
          sourceProtocol: 'activitypub',
          boostedAt: '2026-04-10T11:00:00.000Z',
          repostUri: 'canonical://share/viewer',
        },
        {
          actorId: 'https://pods.example/users/alice',
          displayName: 'Alice',
          sourceProtocol: 'activitypub',
          boostedAt: '2026-04-10T10:30:00.000Z',
          repostUri: 'canonical://share/alice',
        },
      ],
    },
  }
}

describe('UnifiedFeedItem repost rendering', () => {
  it('renders grouped repost context and emits repost toggle', async () => {
    const wrapper = shallowMount(UnifiedFeedItem, {
      props: { item: buildItem() },
      global: {
        stubs: {
          HashtagText: true,
          InlineReplyComposer: true,
          MoreActionsSheet: true,
          PostEmbedCard: true,
          PostPoll: true,
          ThreadSummary: true,
        },
      },
    })

    expect(wrapper.text()).toContain('You, Alice and 2 others reposted')
    expect(wrapper.text()).toContain('Reposted')
    expect(wrapper.text()).toContain('4')

    await wrapper.findAll('button').find(button => button.text().includes('Reposted'))?.trigger('click')

    expect(wrapper.emitted('repostToggle')?.[0]?.[0]).toMatchObject({
      objectUri: 'https://pods.example/objects/1',
    })
  })
})
