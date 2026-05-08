import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PostLinkPreview from './PostLinkPreview.vue'

vi.mock('@/i18n', () => ({
  useI18n: () => ({
    t: (key: string, values?: Record<string, string>) => {
      if (key === 'feed.preview.byline') {
        return `More from ${values?.name ?? ''}`.trim()
      }
      if (key === 'feed.preview.authorVerified') {
        return 'Verified creator'
      }
      if (key === 'feed.preview.authorClaimed') {
        return 'Claimed creator'
      }
      return key
    }
  })
}))

describe('PostLinkPreview', () => {
  it('renders a verified author byline when preview authors are present', () => {
    const wrapper = mount(PostLinkPreview, {
      props: {
        preview: {
          url: 'https://example.com/articles/1',
          title: 'Story title',
          description: 'Story summary',
          authors: [
            {
              name: 'Alice Example',
              url: 'https://social.example/@alice',
              verificationState: 'verified'
            }
          ]
        }
      }
    })

    expect(wrapper.text()).toContain('More from Alice Example')
    expect(wrapper.text()).toContain('Verified creator')
    const authorLink = wrapper.find('a[href="https://social.example/@alice"]')
    expect(authorLink.exists()).toBe(true)
  })
})
