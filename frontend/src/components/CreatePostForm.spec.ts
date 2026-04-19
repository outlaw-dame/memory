import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import CreatePostForm from './CreatePostForm.vue'

const createPostMock = vi.fn()
const fetchUnifiedFeedMock = vi.fn()

vi.mock('@/stores/postsStore', () => ({
  usePostsStore: () => ({
    createPost: createPostMock,
  }),
}))

vi.mock('@/stores/atBridgeStore', () => ({
  useAtBridgeStore: () => ({
    fetchUnifiedFeed: fetchUnifiedFeedMock,
  }),
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    user: { name: 'Alice Example' },
  }),
}))

vi.mock('@/i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}))

describe('CreatePostForm', () => {
  beforeEach(() => {
    createPostMock.mockReset()
    fetchUnifiedFeedMock.mockReset()
    createPostMock.mockResolvedValue({ id: 1 })
    fetchUnifiedFeedMock.mockResolvedValue(undefined)
  })

  it('submits article posts with title and summary metadata', async () => {
    const wrapper = mount(CreatePostForm, {
      global: {
        stubs: {
          GifPicker: true,
          PostAdvancedSettings: true,
        },
      },
    })

    await wrapper.get('button').trigger('click')
    const articleToggle = wrapper.findAll('button').find(button => button.text() === 'composer.types.article')
    expect(articleToggle).toBeTruthy()
    await articleToggle!.trigger('click')

    await wrapper.get('#composer-article-title').setValue('My article title')
    await wrapper.get('#composer-article-summary').setValue('A short article summary')
    await wrapper.get('#composer-textarea').setValue('## Heading\n\nLong-form body')
    await wrapper.get('form').trigger('submit.prevent')

    expect(createPostMock).toHaveBeenCalledWith({
      content: '## Heading\n\nLong-form body',
      poll: null,
      postType: 'article',
      name: 'My article title',
      summary: 'A short article summary',
    })
    expect(fetchUnifiedFeedMock).toHaveBeenCalledTimes(1)
  })
})
