import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
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

function buildBaseItem(): UnifiedFeedItemModel {
  return {
    id: 11,
    content: 'Root post body',
    createdAt: '2026-04-10T10:00:00.000Z',
    isPublic: true,
    authorId: 4,
    authorName: 'Root Author',
    authorWebId: 'https://pods.example/users/root',
    authorProviderEndpoint: 'https://pods.example',
    source: 'activitypods',
    atUri: null,
    objectUri: 'https://pods.example/objects/11',
  }
}

describe('UnifiedFeedItem quote rendering integration', () => {
  it('renders real preview and media elements inside the quote card', () => {
    const item: UnifiedFeedItemModel = {
      ...buildBaseItem(),
      quotedPost: {
        id: 12,
        authorName: 'Quoted Author',
        authorWebId: 'https://pods.example/users/quoted',
        authorProviderEndpoint: 'https://pods.example',
        content: 'Quoted text with rich embeds',
        createdAt: '2026-04-10T09:30:00.000Z',
        source: 'activitypods',
        linkPreview: {
          url: 'https://example.org/readme',
          title: 'Example Org Readme',
          description: 'A test link preview for integration assertions.',
          image: 'https://example.org/preview.png',
          domain: 'example.org',
        },
        media: [
          {
            type: 'image',
            url: 'https://cdn.example.org/photo.jpg',
            alt: 'Photo in quote',
          },
          {
            type: 'video',
            url: 'https://cdn.example.org/clip.mp4',
            poster: 'https://cdn.example.org/poster.jpg',
          },
        ],
      },
    }

    const wrapper = mount(UnifiedFeedItem, {
      props: { item },
      global: {
        stubs: {
          HashtagText: true,
          InlineReplyComposer: true,
          MoreActionsSheet: true,
        },
      },
    })

    // Quote content remains visible.
    expect(wrapper.text()).toContain('Quoted text with rich embeds')

    // Link preview content from PostLinkPreview.
    expect(wrapper.text()).toContain('Example Org Readme')
    expect(wrapper.text()).toContain('example.org')

    // Media elements from PostMediaCarousel.
    const images = wrapper.findAll('img')
    const videos = wrapper.findAll('video')

    expect(images.some((img) => img.attributes('src') === 'https://cdn.example.org/photo.jpg')).toBe(true)
    expect(videos.some((video) => video.attributes('src') === 'https://cdn.example.org/clip.mp4')).toBe(true)
  })
})
