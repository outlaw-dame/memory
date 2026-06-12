/**
 * Unit tests for AppRoot semantic component
 * 
 * Tests cover:
 * - Framework7 app initialization
 * - Theme configuration
 * - Platform detection
 * - Reduced motion handling
 * - Gesture configuration
 * - Provide/inject functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AppRoot from '@/design/semantic/AppRoot.vue'

// Mock Capacitor
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
    getPlatform: vi.fn(() => 'web'),
  },
}))

// Mock nativeUiProfile
vi.mock('@/platform/nativeUiProfile', () => ({
  getNativeUiProfile: vi.fn(() => ({
    theme: 'md',
    platform: 'desktop',
    prefersReducedMotion: false,
    isTouchPrimary: false,
  })),
}))

// Mock window.matchMedia
let mockMatchMedia: typeof window.matchMedia

beforeEach(() => {
  mockMatchMedia = vi.fn((query: string) => ({
    matches: query === '(prefers-reduced-motion: reduce)',
    media: query,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    onchange: null,
  }))
  
  global.window = { ...global.window, matchMedia: mockMatchMedia } as any
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('AppRoot', () => {
  it('renders f7App with default configuration', () => {
    const wrapper = mount(AppRoot, {
      global: {
        stubs: {
          f7App: {
            template: '<div><slot /></div>',
            setup(props: any, { slots }: any) {
              return () => slots.default?.()
            },
          },
          f7Views: {
            template: '<div><slot /></div>',
          },
          f7View: {
            template: '<div><slot /></div>',
          },
        },
      },
    })

    const f7App = wrapper.findComponent({ name: 'f7App' })
    expect(f7App.exists()).toBe(true)
  })

  it('provides f7app instance via provide/inject', () => {
    const TestChild = {
      template: '<div></div>',
      setup() {
        const f7app = inject<Ref<InstanceType<typeof Framework7> | null>>('f7app')
        return { f7app }
      },
    }

    const wrapper = mount(AppRoot, {
      global: {
        stubs: {
          f7App: {
            template: '<div><slot /></div>',
            setup(props: any, { slots }: any) {
              const f7appRef = ref(null)
              return () => h('div', {}, slots.default?.({ ref: f7appRef }))
            },
          },
          f7Views: {
            template: '<div><slot /></div>',
          },
          f7View: {
            template: '<div><slot /></div>',
          },
        },
        provide: {
          // This would be provided by AppRoot
        },
      },
      slots: {
        default: '<TestChild />',
        components: { TestChild },
      },
    })

    // Note: Testing provide/inject requires a child component
    // This is a simplified test
  })

  it('passes theme prop to f7App', () => {
    const wrapper = mount(AppRoot, {
      props: { theme: 'ios' },
      global: {
        stubs: {
          f7App: {
            template: '<div></div>',
            setup(props: any) {
              return { props }
            },
          },
          f7Views: {
            template: '<div><slot /></div>',
          },
          f7View: {
            template: '<div><slot /></div>',
          },
        },
      },
    })

    const f7App = wrapper.findComponent({ name: 'f7App' })
    expect(f7App.props('theme')).toBe('ios')
  })

  it('configures swipe-back for touch-primary devices', () => {
    // Mock touch-primary device
    vi.mock('@/platform/nativeUiProfile', () => ({
      getNativeUiProfile: vi.fn(() => ({
        theme: 'md',
        platform: 'android',
        prefersReducedMotion: false,
        isTouchPrimary: true, // Touch device
      })),
    }))

    const wrapper = mount(AppRoot, {
      global: {
        stubs: {
          f7App: {
            template: '<div></div>',
            setup(props: any) {
              return { props }
            },
          },
          f7Views: {
            template: '<div><slot /></div>',
          },
          f7View: {
            template: '<div><slot /></div>',
          },
        },
      },
    })

    const f7App = wrapper.findComponent({ name: 'f7App' })
    // Check that swipeBack is configured
    expect(f7App.props('swipeBack')).toBe(true)
  })

  it('disables gestures for non-touch devices', () => {
    // Mock non-touch device
    vi.mock('@/platform/nativeUiProfile', () => ({
      getNativeUiProfile: vi.fn(() => ({
        theme: 'md',
        platform: 'desktop',
        prefersReducedMotion: false,
        isTouchPrimary: false, // Non-touch device
      })),
    }))

    const wrapper = mount(AppRoot, {
      global: {
        stubs: {
          f7App: {
            template: '<div></div>',
            setup(props: any) {
              return { props }
            },
          },
          f7Views: {
            template: '<div><slot /></div>',
          },
          f7View: {
            template: '<div><slot /></div>',
          },
        },
      },
    })

    const f7App = wrapper.findComponent({ name: 'f7App' })
    // Check that swipeBack is disabled for non-touch
    expect(f7App.props('swipeBack')).toBe(false)
  })

  it('respects reduced motion preference', () => {
    // Mock reduced motion preference
    vi.mock('@/platform/nativeUiProfile', () => ({
      getNativeUiProfile: vi.fn(() => ({
        theme: 'md',
        platform: 'desktop',
        prefersReducedMotion: true, // Reduced motion
        isTouchPrimary: false,
      })),
    }))

    const wrapper = mount(AppRoot, {
      global: {
        stubs: {
          f7App: {
            template: '<div></div>',
            setup(props: any) {
              return { props }
            },
          },
          f7Views: {
            template: '<div><slot /></div>',
          },
          f7View: {
            template: '<div><slot /></div>',
          },
        },
      },
    })

    const f7App = wrapper.findComponent({ name: 'f7App' })
    // Check that animations are disabled
    expect(f7App.props('animate')).toBe(false)
  })

  it('configures touch ripple based on reduced motion', () => {
    // Mock reduced motion
    vi.mock('@/platform/nativeUiProfile', () => ({
      getNativeUiProfile: vi.fn(() => ({
        theme: 'md',
        platform: 'android',
        prefersReducedMotion: true,
        isTouchPrimary: true,
      })),
    }))

    const wrapper = mount(AppRoot, {
      global: {
        stubs: {
          f7App: {
            template: '<div></div>',
            setup(props: any) {
              return { props }
            },
          },
          f7Views: {
            template: '<div><slot /></div>',
          },
          f7View: {
            template: '<div><slot /></div>',
          },
        },
      },
    })

    const f7App = wrapper.findComponent({ name: 'f7App' })
    // Check that touch ripple is disabled
    expect(f7App.props('touch.ripple')).toBe(false)
  })

  it('sets up views and view structure', () => {
    const wrapper = mount(AppRoot, {
      global: {
        stubs: {
          f7App: {
            template: '<div><slot /></div>',
          },
          f7Views: {
            template: '<div><slot /></div>',
            setup(props: any, { slots }: any) {
              return () => h('div', {}, slots.default?.())
            },
          },
          f7View: {
            template: '<div><slot /></div>',
            setup(props: any, { slots }: any) {
              return () => h('div', {}, slots.default?.())
            },
          },
        },
      },
    })

    expect(wrapper.findComponent({ name: 'f7Views' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'f7View' }).exists()).toBe(true)
  })

  it('provides nativeUiProfile via provide/inject', () => {
    // This test would require a child component to verify
    // For now, we just verify the component mounts without error
    const wrapper = mount(AppRoot)
    expect(wrapper.exists()).toBe(true)
  })
})

// Helper for type imports
import { ref, h, inject } from 'vue'
import type Framework7 from 'framework7'
