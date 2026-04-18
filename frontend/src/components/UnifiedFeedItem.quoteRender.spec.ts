import { describe, it, expect, vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { defineComponent, type PropType } from 'vue'
import UnifiedFeedItem from './UnifiedFeedItem.vue'
import type { UnifiedFeedItem as UnifiedFeedItemModel } from '@/stores/atBridgeStore'
import type { EmbeddedPost } from './PostEmbedCard.vue'

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

const PostEmbedCardStub = defineComponent({
  name: 'PostEmbedCard',
  props: {
    post: {
      type: Object as PropType<EmbeddedPost>,
      required: true,
    },
  },
  template: `
    <div data-testid="quote-card">
      <div data-testid="quote-content">{{ post.content }}</div>
      <div data-testid="quote-has-preview">{{ Boolean(post.linkPreview) }}</div>
      <div data-testid="quote-media-count">{{ post.media?.length ?? 0 }}</div>
      <div data-testid="quote-preview-title">{{ post.linkPreview?.title ?? '' }}</div>
    </div>
  `,
})

function buildBaseItem(): UnifiedFeedItemModel {
  return {
    id: 1,
    content: 'Root post',
    createdAt: '2026-04-10T10:00:00.000Z',
    isPublic: true,
    authorId: 1,
    authorName: 'Root Author',
    authorWebId: 'https://pods.example/users/root',
    authorProviderEndpoint: 'https://pods.example',
    source: 'activitypods',
    atUri: null,
    objectUri: 'https://pods.example/objects/1',
  }
}

function mountWithItem(item: UnifiedFeedItemModel) {
  return shallowMount(UnifiedFeedItem, {
    props: { item },
    global: {
      stubs: {
        HashtagText: true,
        InlineReplyComposer: true,
        MoreActionsSheet: true,
        PostEmbedCard: PostEmbedCardStub,
      },
    },
  })
}

describe('UnifiedFeedItem quote rendering', () => {
  it('renders quote-only posts', () => {
    const item: UnifiedFeedItemModel = {
      ...buildBaseItem(),
      quotedPost: {
        id: 2,
        authorName: 'Quoted Author',
        authorWebId: 'https://pods.example/users/quoted',
        authorProviderEndpoint: 'https://pods.example',
        content: 'Quoted text body',
        createdAt: '2026-04-10T09:00:00.000Z',
        source: 'activitypods',
      },
    }

    const wrapper = mountWithItem(item)

    expect(wrapper.find('[data-testid="quote-card"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="quote-content"]').text()).toContain('Quoted text body')
    expect(wrapper.get('[data-testid="quote-has-preview"]').text()).toBe('false')
    expect(wrapper.get('[data-testid="quote-media-count"]').text()).toBe('0')
  })

  it('renders quote posts with link preview', () => {
    const item: UnifiedFeedItemModel = {
      ...buildBaseItem(),
      quotedPost: {
        id: 2,
        authorName: 'Quoted Author',
        authorWebId: 'https://pods.example/users/quoted',
        authorProviderEndpoint: 'https://pods.example',
        content: 'Quoted with preview',
        createdAt: '2026-04-10T09:00:00.000Z',
        source: 'activitypods',
        linkPreview: {
          url: 'https://example.org/article',
          title: 'Example Article',
          description: 'A short summary',
          image: 'https://example.org/image.png',
          domain: 'example.org',
        },
      },
    }

    const wrapper = mountWithItem(item)

    expect(wrapper.find('[data-testid="quote-card"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="quote-has-preview"]').text()).toBe('true')
    expect(wrapper.get('[data-testid="quote-preview-title"]').text()).toBe('Example Article')
  })

  it('renders quote posts with media', () => {
    const item: UnifiedFeedItemModel = {
      ...buildBaseItem(),
      quotedPost: {
        id: 2,
        authorName: 'Quoted Author',
        authorWebId: 'https://pods.example/users/quoted',
        authorProviderEndpoint: 'https://pods.example',
        content: 'Quoted with media',
        createdAt: '2026-04-10T09:00:00.000Z',
        source: 'activitypods',
        media: [
          {
            type: 'image',
            url: 'https://cdn.example.org/media/1.jpg',
            alt: 'Image one',
          },
          {
            type: 'video',
            url: 'https://cdn.example.org/media/2.mp4',
          },
        ],
      },
    }

    const wrapper = mountWithItem(item)

    expect(wrapper.find('[data-testid="quote-card"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="quote-media-count"]').text()).toBe('2')
  })
})
