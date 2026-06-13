/**
 * Unit tests for AppToolbar semantic component
 * 
 * Tests cover:
 * - Props handling
 * - Route-based visibility
 * - Navigation items
 * - Active state detection
 * - Haptic feedback
 * - Icon handling
 * - Badge rendering
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { ref } from 'vue'
import AppToolbar from '@/design/semantic/AppToolbar.vue'

// Mock Framework7 components
const MockF7Toolbar = {
  name: 'f7Toolbar',
  template: '<div class="toolbar"><div class="toolbar-inner"><slot /></div></div>',
  props: ['noShadow', 'noHairline', 'position'],
}

const MockF7Link = {
  name: 'f7Link',
  template: '<a class="link"><slot /></a>',
  props: ['iconOnly'],
}

// Mock AppIcon component
const MockAppIcon = {
  name: 'AppIcon',
  template: '<span class="app-icon">{{ name }}</span>',
  props: ['name', 'size'],
}

// Mock i18n
vi.mock('@/i18n', () => ({
  useI18n: () => ({
    t: vi.fn((key: string) => {
      const translations: Record<string, string> = {
        'nav.home': 'Home',
        'nav.explore': 'Explore',
        'nav.messages': 'Messages',
        'nav.notifications': 'Notifications',
        'nav.profile': 'Profile',
      }
      return translations[key] || key
    }),
  }),
}))

// Mock stores
vi.mock('@/stores/notificationsStore', () => ({
  useNotificationsStore: () => ({
    totalUnreadCount: ref(0),
  }),
}))

// Mock platform utilities
vi.mock('@/platform/hapticPolicy', () => ({
  useHaptics: () => ({
    impact: vi.fn(() => Promise.resolve()),
  }),
}))

vi.mock('@/platform/nativeUiProfile', () => ({
  useNativeUiProfile: () => ({
    theme: 'ios',
  }),
}))

// Mock AppIcon.types
vi.mock('@/components/AppIcon.types', () => ({
  // Type-only import, no runtime value needed
}))

// Mock router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: { template: '<div>Home</div>' } },
    { path: '/explore', name: 'explore', component: { template: '<div>Explore</div>' } },
    { path: '/messages', name: 'messages', component: { template: '<div>Messages</div>' } },
    { path: '/notifications', name: 'notifications', component: { template: '<div>Notifications</div>' } },
    { path: '/profile', name: 'profile', component: { template: '<div>Profile</div>' } },
    { path: '/signin', name: 'signin', component: { template: '<div>Sign In</div>' } },
    { path: '/signup', name: 'signup', component: { template: '<div>Sign Up</div>' } },
    { path: '/welcome', name: 'welcome', component: { template: '<div>Welcome</div>' } },
  ],
}))

// Helper to mount with router
function mountWithRouter(props: any = {}) {
  return mount(AppToolbar, {
    props,
    global: {
      plugins: [router],
      stubs: {
        f7Toolbar: MockF7Toolbar,
        f7Link: MockF7Link,
        AppIcon: MockAppIcon,
      },
      mocks: {
        $t: vi.fn((key: string) => key),
      },
    },
  })
}

describe('AppToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Props', () => {
    it('has correct default prop values', () => {
      const wrapper = mountWithRouter()
      
      const toolbar = wrapper.findComponent(MockF7Toolbar)
      expect(toolbar.exists()).toBe(true)
      expect(toolbar.props('position')).toBe('bottom')
    })

    it('accepts position prop', () => {
      const wrapper = mountWithRouter({ position: 'top' })
      
      const toolbar = wrapper.findComponent(MockF7Toolbar)
      expect(toolbar.props('position')).toBe('top')
    })
  })

  describe('Visibility', () => {
    it('hides toolbar for auth routes', async () => {
      const authRoutes = ['signin', 'signup', 'welcome']
      
      for (const route of authRoutes) {
        await router.push(`/${route}`)
        const wrapper = mountWithRouter()
        
        const toolbar = wrapper.findComponent(MockF7Toolbar)
        // Toolbar should not render for auth routes
        expect(toolbar.exists()).toBe(false)
      }
    })

    it('shows toolbar for non-auth routes', async () => {
      const nonAuthRoutes = ['home', 'explore', 'messages', 'notifications', 'profile']
      
      for (const route of nonAuthRoutes) {
        const path = route === 'home' ? '/' : `/${route}`
        await router.push(path)
        const wrapper = mountWithRouter()
        
        const toolbar = wrapper.findComponent(MockF7Toolbar)
        expect(toolbar.exists()).toBe(true)
      }
    })
  })

  describe('Navigation Items', () => {
    it('renders all navigation items', async () => {
      await router.push('/')
      const wrapper = mountWithRouter()
      
      const links = wrapper.findAllComponents(MockF7Link)
      expect(links.length).toBe(5) // home, explore, messages, notifications, profile
    })

    it('renders navigation items with correct labels', async () => {
      await router.push('/')
      const wrapper = mountWithRouter()
      
      const expectedLabels = ['Home', 'Explore', 'Messages', 'Notifications', 'Profile']
      const labelElements = wrapper.findAll('.app-tabbar-label')
      
      labelElements.forEach((label, index) => {
        expect(label.text()).toBe(expectedLabels[index])
      })
    })

    it('renders navigation items with icons', async () => {
      await router.push('/')
      const wrapper = mountWithRouter()
      
      const icons = wrapper.findAllComponents(MockAppIcon)
      expect(icons.length).toBe(5)
    })
  })

  describe('Active State', () => {
    it('detects home route as active', async () => {
      await router.push('/')
      const wrapper = mountWithRouter()
      
      const links = wrapper.findAllComponents(MockF7Link)
      const homeLink = links[0]
      
      // Home link should be active
      expect(homeLink.classes()).toContain('tab-link-active')
    })

    it('detects explore route as active', async () => {
      await router.push('/explore')
      const wrapper = mountWithRouter()
      
      const links = wrapper.findAllComponents(MockF7Link)
      const exploreLink = links[1]
      
      // Explore link should be active
      expect(exploreLink.classes()).toContain('tab-link-active')
    })

    it('detects messages route as active', async () => {
      await router.push('/messages')
      const wrapper = mountWithRouter()
      
      const links = wrapper.findAllComponents(MockF7Link)
      const messagesLink = links[2]
      
      // Messages link should be active
      expect(messagesLink.classes()).toContain('tab-link-active')
    })
  })

  describe('Icon Handling', () => {
    it('uses filled icons for active items', async () => {
      await router.push('/')
      const wrapper = mountWithRouter()
      
      const icons = wrapper.findAllComponents(MockAppIcon)
      const homeIcon = icons[0]
      
      // Home route is active, so icon should be filled
      expect(homeIcon.props('name')).toBe('home-filled')
    })

    it('uses outline icons for inactive items', async () => {
      await router.push('/')
      const wrapper = mountWithRouter()
      
      const icons = wrapper.findAllComponents(MockAppIcon)
      const exploreIcon = icons[1]
      
      // Explore route is inactive, so icon should be outline
      expect(exploreIcon.props('name')).toBe('explore')
    })
  })

  describe('Badge', () => {
    it('renders badge for notifications with unread count', async () => {
      // Mock notifications store with unread count
      vi.mock('@/stores/notificationsStore', () => ({
        useNotificationsStore: () => ({
          totalUnreadCount: ref(5),
        }),
      }))

      await router.push('/')
      const wrapper = mountWithRouter()
      
      const badges = wrapper.findAll('span[aria-hidden="true"]')
      expect(badges.length).toBeGreaterThan(0)
    })

    it('renders 99+ for large unread count', async () => {
      vi.mock('@/stores/notificationsStore', () => ({
        useNotificationsStore: () => ({
          totalUnreadCount: ref(150),
        }),
      }))

      await router.push('/')
      const wrapper = mountWithRouter()
      
      const badge = wrapper.find('span[aria-hidden="true"]')
      expect(badge.exists()).toBe(true)
      expect(badge.text()).toBe('99+')
    })

    it('does not render badge when unread count is 0', async () => {
      vi.mock('@/stores/notificationsStore', () => ({
        useNotificationsStore: () => ({
          totalUnreadCount: ref(0),
        }),
      }))

      await router.push('/')
      const wrapper = mountWithRouter()
      
      const badges = wrapper.findAll('span[aria-hidden="true"]')
      expect(badges.length).toBe(0)
    })
  })

  describe('Haptic Feedback', () => {
    it('triggers haptic feedback on navigation', async () => {
      const { impact } = require('@/platform/hapticPolicy')
      
      await router.push('/')
      const wrapper = mountWithRouter()
      
      const links = wrapper.findAllComponents(MockF7Link)
      await links[1].trigger('click') // Click explore
      
      expect(impact).toHaveBeenCalled()
    })
  })

  describe('Navigation', () => {
    it('navigates to correct route when item is clicked', async () => {
      await router.push('/')
      const wrapper = mountWithRouter()
      
      const links = wrapper.findAllComponents(MockF7Link)
      await links[1].trigger('click') // Click explore
      
      expect(router.currentRoute.value.path).toBe('/explore')
    })

    it('handles navigation errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      // Mock router.push to reject
      vi.mock('vue-router', async () => {
        const actual = await vi.importActual('vue-router')
        return {
          ...actual,
          useRouter: () => ({
            push: vi.fn(() => Promise.reject(new Error('Navigation failed'))),
          }),
        }
      })

      await router.push('/')
      const wrapper = mountWithRouter()
      
      const links = wrapper.findAllComponents(MockF7Link)
      await links[1].trigger('click')
      
      expect(consoleError).toHaveBeenCalled()
      consoleError.mockRestore()
    })
  })

  describe('Rendering', () => {
    it('renders f7Toolbar with correct props', async () => {
      await router.push('/')
      const wrapper = mountWithRouter()
      
      const toolbar = wrapper.findComponent(MockF7Toolbar)
      expect(toolbar.exists()).toBe(true)
      expect(toolbar.props('noShadow')).toBe(true)
      expect(toolbar.props('noHairline')).toBe(true)
    })

    it('has correct CSS classes', async () => {
      await router.push('/')
      const wrapper = mountWithRouter()
      
      const toolbar = wrapper.find('.toolbar')
      expect(toolbar.exists()).toBe(true)
    })
  })
})
