/**
 * Unit tests for AppNavbar semantic component
 * 
 * Tests cover:
 * - Props handling
 * - Route-based title computation
 * - Back button visibility
 * - i18n integration
 * - Platform-specific icon selection
 * - Slot rendering
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { ref } from 'vue'
import AppNavbar from '@/design/semantic/AppNavbar.vue'

// Mock Framework7 components
const MockF7Navbar = {
  name: 'f7Navbar',
  template: '<div class="navbar"><div class="navbar-inner"><div class="navbar-left"><slot name="left" /></div><div class="navbar-center"><slot name="center" /></div><div class="navbar-right"><slot name="right" /></div></div></div>',
  props: ['noShadow', 'noHairline'],
}

const MockF7NavLeft = {
  name: 'f7NavLeft',
  template: '<div class="navbar-left"><slot /></div>',
}

const MockF7NavTitle = {
  name: 'f7NavTitle',
  template: '<div class="navbar-title">{{ title }}</div>',
  props: ['title'],
}

const MockF7Link = {
  name: 'f7Link',
  template: '<a class="link"><slot /></a>',
  props: ['iconOnly', 'icon'],
}

// Mock i18n
vi.mock('@/i18n', () => ({
  useI18n: () => ({
    t: vi.fn((key: string) => key),
  }),
}))

// Mock composables
vi.mock('@/composables/useLargeTitle', () => ({
  useLargeTitle: () => ({
    largeTitleVisible: ref(false),
  }),
}))

// Mock nativeUiProfile
vi.mock('@/platform/nativeUiProfile', () => ({
  useNativeUiProfile: () => ({
    theme: 'ios',
  }),
}))

// Mock router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: { template: '<div>Home</div>' }, meta: { titleKey: 'app.name' } },
    { path: '/explore', name: 'explore', component: { template: '<div>Explore</div>' }, meta: { titleKey: 'nav.explore' } },
    { path: '/thread/123', name: 'thread', component: { template: '<div>Thread</div>' } },
  ],
})

// Helper to mount with router
function mountWithRouter(props: any = {}) {
  return mount(AppNavbar, {
    props,
    global: {
      plugins: [router],
      stubs: {
        f7Navbar: MockF7Navbar,
        f7NavLeft: MockF7NavLeft,
        f7NavTitle: MockF7NavTitle,
        f7Link: MockF7Link,
      },
      mocks: {
        $t: vi.fn((key: string) => key),
      },
    },
  })
}

describe('AppNavbar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Props', () => {
    it('has correct default prop values', () => {
      const wrapper = mountWithRouter()
      
      const navbar = wrapper.findComponent(MockF7Navbar)
      expect(navbar.exists()).toBe(true)
    })

    it('accepts showBack prop', () => {
      const wrapper = mountWithRouter({ showBack: true })
      
      const backLink = wrapper.findComponent(MockF7Link)
      expect(backLink.exists()).toBe(true)
    })

    it('hides back link when showBack is false', () => {
      const wrapper = mountWithRouter({ showBack: false })
      
      // With showBack: false, the back link should not render
      const links = wrapper.findAllComponents(MockF7Link)
      expect(links.length).toBe(0)
    })

    it('accepts title prop', () => {
      const title = 'Custom Title'
      const wrapper = mountWithRouter({ title })
      
      const navTitle = wrapper.findComponent(MockF7NavTitle)
      expect(navTitle.props('title')).toBe(title)
    })

    it('accepts titleKey prop', () => {
      const titleKey = 'nav.custom'
      const wrapper = mountWithRouter({ titleKey })
      
      const navTitle = wrapper.findComponent(MockF7NavTitle)
      // The titleKey should be translated
      expect(navTitle.props('title')).toBe(titleKey)
    })
  })

  describe('Title Computation', () => {
    it('uses explicit title prop when provided', () => {
      const title = 'Explicit Title'
      const wrapper = mountWithRouter({ title })
      
      const navTitle = wrapper.findComponent(MockF7NavTitle)
      expect(navTitle.props('title')).toBe(title)
    })

    it('uses translated titleKey when provided', () => {
      const titleKey = 'nav.custom'
      const wrapper = mountWithRouter({ titleKey })
      
      const navTitle = wrapper.findComponent(MockF7NavTitle)
      expect(navTitle.props('title')).toBe(titleKey)
    })

    it('uses route meta titleKey for home route', () => {
      router.push('/')
      const wrapper = mountWithRouter()
      
      const navTitle = wrapper.findComponent(MockF7NavTitle)
      // Home route has titleKey in meta
      expect(navTitle.props('title')).toBe('memory.')
    })

    it('uses route meta titleKey for explore route', async () => {
      await router.push('/explore')
      const wrapper = mountWithRouter()
      
      const navTitle = wrapper.findComponent(MockF7NavTitle)
      expect(navTitle.props('title')).toBe('nav.explore')
    })

    it('uses default app.name for routes without titleKey', async () => {
      await router.push('/thread/123')
      const wrapper = mountWithRouter()
      
      const navTitle = wrapper.findComponent(MockF7NavTitle)
      expect(navTitle.props('title')).toBe('app.name')
    })
  })

  describe('Back Button', () => {
    it('renders back link when showBack is true', () => {
      const wrapper = mountWithRouter({ showBack: true })
      
      const links = wrapper.findAllComponents(MockF7Link)
      expect(links.length).toBeGreaterThan(0)
      
      const backLink = links[0]
      expect(backLink.props('iconOnly')).toBe(true)
      expect(backLink.props('icon')).toBe('chevron_back')
    })

    it('uses ios icon when theme is ios', () => {
      vi.mock('@/platform/nativeUiProfile', () => ({
        useNativeUiProfile: () => ({
          theme: 'ios',
        }),
      }))

      const wrapper = mountWithRouter({ showBack: true })
      
      const backLink = wrapper.findComponent(MockF7Link)
      expect(backLink.props('icon')).toBe('chevron_back')
    })

    it('uses arrow_back icon when theme is md', () => {
      vi.mock('@/platform/nativeUiProfile', () => ({
        useNativeUiProfile: () => ({
          theme: 'md',
        }),
      }))

      const wrapper = mountWithRouter({ showBack: true })
      
      const backLink = wrapper.findComponent(MockF7Link)
      expect(backLink.props('icon')).toBe('arrow_back')
    })

    it('emits back event when back link is clicked', async () => {
      const wrapper = mountWithRouter({ showBack: true })
      
      const backLink = wrapper.findComponent(MockF7Link)
      await backLink.trigger('click')
      
      expect(wrapper.emitted('back')).toBeTruthy()
    })
  })

  describe('Rendering', () => {
    it('renders f7Navbar with correct props', () => {
      const wrapper = mountWithRouter()
      
      const navbar = wrapper.findComponent(MockF7Navbar)
      expect(navbar.exists()).toBe(true)
      expect(navbar.props('noShadow')).toBe(true)
      expect(navbar.props('noHairline')).toBe(true)
    })

    it('renders f7NavTitle', () => {
      const wrapper = mountWithRouter()
      
      const navTitle = wrapper.findComponent(MockF7NavTitle)
      expect(navTitle.exists()).toBe(true)
    })

    it('has correct CSS classes', () => {
      const wrapper = mountWithRouter()
      
      const navbar = wrapper.find('.navbar')
      expect(navbar.exists()).toBe(true)
    })
  })

  describe('Large Title Integration', () => {
    it('hides title when largeTitleVisible is true on home route', () => {
      vi.mock('@/composables/useLargeTitle', () => ({
        useLargeTitle: () => ({
          largeTitleVisible: ref(true),
        }),
      }))

      router.push('/')
      const wrapper = mountWithRouter()
      
      const navTitle = wrapper.findComponent(MockF7NavTitle)
      // When large title is visible on home, title should be empty
      expect(navTitle.props('title')).toBe('')
    })

    it('shows title when largeTitleVisible is false on home route', () => {
      vi.mock('@/composables/useLargeTitle', () => ({
        useLargeTitle: () => ({
          largeTitleVisible: ref(false),
        }),
      }))

      router.push('/')
      const wrapper = mountWithRouter()
      
      const navTitle = wrapper.findComponent(MockF7NavTitle)
      expect(navTitle.props('title')).toBe('memory.')
    })
  })
})
