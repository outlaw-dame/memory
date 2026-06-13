/**
 * Unit tests for AppShell semantic component
 * 
 * Tests cover:
 * - Shell visibility based on route
 * - Back button visibility
 * - Auth route handling
 * - Slot rendering
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import AppShell from '@/design/semantic/AppShell.vue'
import AppNavbar from '@/design/semantic/AppNavbar.vue'
import AppToolbar from '@/design/semantic/AppToolbar.vue'

// Mock child components
const MockNavbar = {
  name: 'AppNavbar',
  template: '<nav class="navbar"><slot /></nav>',
  props: ['showBack'],
}

const MockToolbar = {
  name: 'AppToolbar',
  template: '<div class="toolbar"><slot /></div>',
  props: ['position'],
}

// Create test router
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
    { path: '/thread/123', name: 'thread', component: { template: '<div>Thread</div>' } },
  ],
})

// Helper to mount with router
function mountWithRouter(component: any, routePath: string = '/') {
  router.push(routePath)
  return mount(component, {
    global: {
      plugins: [router],
      stubs: {
        AppNavbar: MockNavbar,
        AppToolbar: MockToolbar,
      },
    },
  })
}

describe('AppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Auth Routes', () => {
    const authRoutes = ['signin', 'signup', 'welcome', 'experience', 'auth-callback']

    authRoutes.forEach((routeName) => {
      it(`renders full-screen layout for auth route: ${routeName}`, async () => {
        const wrapper = mountWithRouter(AppShell, `/${routeName === 'home' ? '' : routeName}`)
        
        // Should have flex container
        const flexContainer = wrapper.find('div.flex.flex-col.h-full')
        expect(flexContainer.exists()).toBe(true)
        
        // Should NOT have AppNavbar or AppToolbar for auth routes
        expect(wrapper.findComponent(MockNavbar).exists()).toBe(false)
        expect(wrapper.findComponent(MockToolbar).exists()).toBe(false)
      })
    })
  })

  describe('Non-Auth Routes', () => {
    const rootRoutes = ['home', 'explore', 'messages', 'notifications', 'profile']
    const nonRootRoutes = ['thread']

    rootRoutes.forEach((routeName) => {
      it(`hides back button for root route: ${routeName}`, async () => {
        const path = routeName === 'home' ? '/' : `/${routeName}`
        const wrapper = mountWithRouter(AppShell, path)
        
        // Should have shell structure
        expect(wrapper.findComponent(MockNavbar).exists()).toBe(true)
        expect(wrapper.findComponent(MockToolbar).exists()).toBe(true)
        
        // Navbar should NOT show back button for root routes
        const navbar = wrapper.findComponent(MockNavbar)
        expect(navbar.props('showBack')).toBe(false)
      })
    })

    nonRootRoutes.forEach((routeName) => {
      it(`shows back button for non-root route: ${routeName}`, async () => {
        const wrapper = mountWithRouter(AppShell, `/${routeName}/123`)
        
        // Should have shell structure
        expect(wrapper.findComponent(MockNavbar).exists()).toBe(true)
        expect(wrapper.findComponent(MockToolbar).exists()).toBe(true)
        
        // Navbar should show back button for non-root routes
        const navbar = wrapper.findComponent(MockNavbar)
        expect(navbar.props('showBack')).toBe(true)
      })
    })
  })

  describe('Shell Structure', () => {
    it('renders navbar with correct class for non-auth routes', () => {
      const wrapper = mountWithRouter(AppShell, '/explore')
      
      const navbar = wrapper.findComponent(MockNavbar)
      expect(navbar.exists()).toBe(true)
      expect(navbar.classes()).toContain('app-shell-topbar')
    })

    it('renders toolbar with bottom position for non-auth routes', () => {
      const wrapper = mountWithRouter(AppShell, '/explore')
      
      const toolbar = wrapper.findComponent(MockToolbar)
      expect(toolbar.exists()).toBe(true)
      expect(toolbar.props('position')).toBe('bottom')
    })

    it('renders main content area with correct classes', () => {
      const wrapper = mountWithRouter(AppShell, '/explore')
      
      const main = wrapper.find('main.app-shell-main')
      expect(main.exists()).toBe(true)
      expect(main.classes()).toContain('min-h-0')
      expect(main.classes()).toContain('flex-1')
      expect(main.classes()).toContain('overflow-y-auto')
    })
  })

  describe('Slot Content', () => {
    it('renders default slot content for auth routes', () => {
      const wrapper = mountWithRouter(AppShell, '/signin')
      
      // Mount with custom slot content
      const wrapperWithSlot = mount(AppShell, {
        global: {
          plugins: [router],
          stubs: {
            AppNavbar: MockNavbar,
            AppToolbar: MockToolbar,
          },
        },
        slots: {
          default: '<div class="auth-content">Auth Content</div>',
        },
      })
      
      const authContent = wrapperWithSlot.find('.auth-content')
      expect(authContent.exists()).toBe(true)
      expect(authContent.text()).toBe('Auth Content')
    })

    it('renders default slot content within main for non-auth routes', () => {
      const wrapper = mountWithRouter(AppShell, '/explore')
      
      const wrapperWithSlot = mount(AppShell, {
        global: {
          plugins: [router],
          stubs: {
            AppNavbar: MockNavbar,
            AppToolbar: MockToolbar,
          },
        },
        slots: {
          default: '<div class="page-content">Page Content</div>',
        },
      })
      
      const main = wrapperWithSlot.find('main.app-shell-main')
      expect(main.exists()).toBe(true)
      expect(main.find('.page-content').exists()).toBe(true)
    })
  })

  describe('CSS Styles', () => {
    it('applies correct padding to main content area', () => {
      const wrapper = mountWithRouter(AppShell, '/explore')
      
      const main = wrapper.find('main.app-shell-main')
      const style = main.attributes('style') || ''
      
      // Should have padding for navbar and toolbar
      expect(style).toContain('padding-top: 44px')
      expect(style).toContain('padding-bottom: 56px')
    })
  })
})
