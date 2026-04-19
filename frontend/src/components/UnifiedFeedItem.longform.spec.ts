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
    t: (key: string) => {
      if (key === 'feed.article.badge') return 'Article'
      if (key === 'feed.article.open') return 'Open article'
      return key
    },
  }),
}))

function buildArticleItem(): UnifiedFeedItemModel {
  return {
    id: 42,
    content: 'Long-form body preview with #interop details.',
    postType: 'article',
    title: 'Bridgeing the old web back',
    summary: '<p>A short summary for the article.</p>',
    canonicalUrl: 'https://example.com/articles/bridgeing-old-web',
    createdAt: '2026-04-10T10:00:00.000Z',
    isPublic: true,
    authorId: 1,
    authorName: 'Alice',
    authorWebId: 'https://pods.example/users/alice',
    authorProviderEndpoint: 'https://pods.example',
    source: 'activitypods',
    atUri: null,
    objectUri: 'https://pods.example/objects/42',
  }
}

describe('UnifiedFeedItem long-form rendering', () => {
  it('renders article metadata and an external open link', () => {
    const wrapper = shallowMount(UnifiedFeedItem, {
      props: { item: buildArticleItem() },
      global: {
        stubs: {
          HashtagText: {
            props: ['text'],
            template: '<div data-testid="article-body">{{ text }}</div>',
          },
          InlineReplyComposer: true,
          MoreActionsSheet: true,
          PostEmbedCard: true,
          PostPoll: true,
        },
      },
    })

    expect(wrapper.text()).toContain('Article')
    expect(wrapper.text()).toContain('Bridgeing the old web back')
    expect(wrapper.text()).toContain('A short summary for the article.')
    expect(wrapper.get('[data-testid="article-body"]').text()).toContain('Long-form body preview')

    const openLink = wrapper.get('a[href="https://example.com/articles/bridgeing-old-web"]')
    expect(openLink.text()).toContain('Open article')
    expect(openLink.attributes('target')).toBe('_blank')
  })
})
