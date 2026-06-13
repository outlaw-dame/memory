/**
 * Unit tests for AppPage semantic component
 * 
 * Tests cover:
 * - Props handling
 * - Default prop values
 * - f7Page rendering
 * - CSS classes
 * - Slot rendering
 */

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppPage from '@/design/semantic/AppPage.vue'

// Mock Framework7 f7Page component
const MockF7Page = {
  name: 'f7Page',
  template: '<div class="page"><div class="page-content"><slot /></div></div>',
  props: ['noNavbar', 'noToolbar', 'noSwipeback'],
}

describe('AppPage', () => {
  describe('Props', () => {
    it('has correct default prop values', () => {
      const wrapper = mount(AppPage, {
        global: {
          stubs: {
            f7Page: MockF7Page,
          },
        },
      })

      const f7Page = wrapper.findComponent(MockF7Page)
      expect(f7Page.props('noNavbar')).toBe(true)
      expect(f7Page.props('noToolbar')).toBe(true)
      expect(f7Page.props('noSwipeback')).toBe(true)
    })

    it('accepts and passes noNavbar prop', () => {
      const wrapper = mount(AppPage, {
        props: { noNavbar: false },
        global: {
          stubs: {
            f7Page: MockF7Page,
          },
        },
      })

      const f7Page = wrapper.findComponent(MockF7Page)
      expect(f7Page.props('noNavbar')).toBe(false)
    })

    it('accepts and passes noToolbar prop', () => {
      const wrapper = mount(AppPage, {
        props: { noToolbar: false },
        global: {
          stubs: {
            f7Page: MockF7Page,
          },
        },
      })

      const f7Page = wrapper.findComponent(MockF7Page)
      expect(f7Page.props('noToolbar')).toBe(false)
    })

    it('accepts and passes noSwipeback prop', () => {
      const wrapper = mount(AppPage, {
        props: { noSwipeback: false },
        global: {
          stubs: {
            f7Page: MockF7Page,
          },
        },
      })

      const f7Page = wrapper.findComponent(MockF7Page)
      expect(f7Page.props('noSwipeback')).toBe(false)
    })

    it('accepts all props simultaneously', () => {
      const wrapper = mount(AppPage, {
        props: { noNavbar: false, noToolbar: false, noSwipeback: false },
        global: {
          stubs: {
            f7Page: MockF7Page,
          },
        },
      })

      const f7Page = wrapper.findComponent(MockF7Page)
      expect(f7Page.props('noNavbar')).toBe(false)
      expect(f7Page.props('noToolbar')).toBe(false)
      expect(f7Page.props('noSwipeback')).toBe(false)
    })
  })

  describe('Rendering', () => {
    it('renders f7Page component', () => {
      const wrapper = mount(AppPage, {
        global: {
          stubs: {
            f7Page: MockF7Page,
          },
        },
      })

      const f7Page = wrapper.findComponent(MockF7Page)
      expect(f7Page.exists()).toBe(true)
    })

    it('renders with correct CSS classes', () => {
      const wrapper = mount(AppPage, {
        global: {
          stubs: {
            f7Page: MockF7Page,
          },
        },
      })

      const f7Page = wrapper.findComponent(MockF7Page)
      const element = f7Page.element
      
      expect(element.classList.contains('flex')).toBe(true)
      expect(element.classList.contains('flex-col')).toBe(true)
      expect(element.classList.contains('overflow-hidden')).toBe(true)
      expect(element.classList.contains('bg-background')).toBe(true)
      expect(element.classList.contains('h-lvh')).toBe(true)
    })
  })

  describe('Slot Content', () => {
    it('renders default slot content', () => {
      const wrapper = mount(AppPage, {
        global: {
          stubs: {
            f7Page: MockF7Page,
          },
        },
        slots: {
          default: '<div class="page-content">Page Content</div>',
        },
      })

      const content = wrapper.find('.page-content')
      expect(content.exists()).toBe(true)
      expect(content.text()).toBe('Page Content')
    })

    it('renders multiple elements in slot', () => {
      const wrapper = mount(AppPage, {
        global: {
          stubs: {
            f7Page: MockF7Page,
          },
        },
        slots: {
          default: '<div>First</div><div>Second</div><div>Third</div>',
        },
      })

      const divs = wrapper.findAll('div')
      expect(divs.length).toBeGreaterThanOrEqual(3)
    })

    it('renders nested components in slot', () => {
      const TestComponent = {
        template: '<span>Test Component</span>',
      }

      const wrapper = mount(AppPage, {
        global: {
          stubs: {
            f7Page: MockF7Page,
          },
          components: {
            TestComponent,
          },
        },
        slots: {
          default: '<TestComponent />',
        },
      })

      const testComponent = wrapper.findComponent(TestComponent)
      expect(testComponent.exists()).toBe(true)
    })
  })

  describe('Type Safety', () => {
    it('accepts valid AppPageProps', () => {
      const props: any = {
        noNavbar: true,
        noToolbar: true,
        noSwipeback: true,
      }

      const wrapper = mount(AppPage, {
        props,
        global: {
          stubs: {
            f7Page: MockF7Page,
          },
        },
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('handles undefined props gracefully', () => {
      const wrapper = mount(AppPage, {
        global: {
          stubs: {
            f7Page: MockF7Page,
          },
        },
      })

      expect(wrapper.exists()).toBe(true)
    })
  })
})
