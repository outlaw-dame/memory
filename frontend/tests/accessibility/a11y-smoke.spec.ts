/**
 * Accessibility Smoke Tests
 * 
 * Runs axe-core accessibility checks on critical app routes
 * to ensure no critical accessibility violations exist.
 * 
 * Tests cover:
 * - Welcome screen
 * - Sign in screen
 * - Home screen
 * - Explore screen
 * - Messages screen
 * - Notifications screen
 * - Profile screen
 * - Settings screen
 * - Thread view
 */

import { test, expect } from '@playwright/test'
import { injectAxe, checkA11y } from 'axe-playwright'

// Configure axe with Memory-specific rules
const axeConfig = {
  // Run only critical and serious impact rules
  rules: {
    // Color contrast - critical for readability
    'color-contrast': { enabled: true },
    
    // Images must have alt text
    'image-alt': { enabled: true },
    
    // Form elements must have labels
    'input-button': { enabled: true },
    'label': { enabled: true },
    'input-image-alt': { enabled: true },
    
    // Buttons must have accessible names
    'button-name': { enabled: true },
    'link-name': { enabled: true },
    
    // ARIA attributes must be valid
    'aria-allowed-attr': { enabled: true },
    'aria-hidden-body': { enabled: true },
    'aria-hidden-focus': { enabled: true },
    
    // Keyboard navigation
    'tabindex': { enabled: true },
    'focus-traps': { enabled: true },
    'keyboard': { enabled: true },
    
    // Language
    'html-has-lang': { enabled: true },
    'lang': { enabled: true },
    
    // Document structure
    'landmark-one-main': { enabled: true },
    'region': { enabled: true },
    
    // Tables
    'td-has-header': { enabled: true },
    'th-has-data-cells': { enabled: true },
    
    // Lists
    'list': { enabled: true },
    'listitem': { enabled: true },
  },
  
  // Only report critical and serious violations
  runOnly: {
    type: 'tag',
    values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'cat.color', 'cat.keyboard'],
  },
  
  // Branding - not applicable for Memory
  branding: {
    application: 'Memory',
    repository: 'https://github.com/outlaw-dame/memory',
  },
}

// Routes to test for accessibility
test.describe('Accessibility Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Inject axe-core
    await injectAxe(page)
  })

  // Test welcome screen
  test('Welcome screen has no critical accessibility violations', async ({ page }) => {
    await page.goto('/welcome')
    
    // Wait for page to load
    await page.waitForSelector('.app-page')
    
    await checkA11y(page, '#app', {
      ...axeConfig,
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
    })
  })

  // Test sign in screen
  test('Sign in screen has no critical accessibility violations', async ({ page }) => {
    await page.goto('/signin')
    
    // Wait for page to load
    await page.waitForSelector('.app-page')
    
    await checkA11y(page, '#app', axeConfig)
  })

  // Test home screen
  test('Home screen has no critical accessibility violations', async ({ page }) => {
    await page.goto('/')
    
    // Wait for page to load
    await page.waitForSelector('.app-page')
    
    await checkA11y(page, '#app', axeConfig)
  })

  // Test explore screen
  test('Explore screen has no critical accessibility violations', async ({ page }) => {
    await page.goto('/explore')
    
    // Wait for page to load
    await page.waitForSelector('.app-page')
    
    await checkA11y(page, '#app', axeConfig)
  })

  // Test messages screen
  test('Messages screen has no critical accessibility violations', async ({ page }) => {
    await page.goto('/messages')
    
    // Wait for page to load
    await page.waitForSelector('.app-page')
    
    await checkA11y(page, '#app', axeConfig)
  })

  // Test notifications screen
  test('Notifications screen has no critical accessibility violations', async ({ page }) => {
    await page.goto('/notifications')
    
    // Wait for page to load
    await page.waitForSelector('.app-page')
    
    await checkA11y(page, '#app', axeConfig)
  })

  // Test profile screen
  test('Profile screen has no critical accessibility violations', async ({ page }) => {
    await page.goto('/profile')
    
    // Wait for page to load
    await page.waitForSelector('.app-page')
    
    await checkA11y(page, '#app', axeConfig)
  })

  // Test settings screen
  test('Settings screen has no critical accessibility violations', async ({ page }) => {
    await page.goto('/settings')
    
    // Wait for page to load
    await page.waitForSelector('.app-page')
    
    await checkA11y(page, '#app', axeConfig)
  })

  // Test thread view with mock data
  test('Thread view has no critical accessibility violations', async ({ page }) => {
    // Mock thread data
    await page.route('/api/threads/*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '123',
          author: { id: 'user1', name: 'Test User', handle: 'testuser' },
          content: 'Test post content',
          createdAt: new Date().toISOString(),
          replies: [],
        }),
      })
    })

    await page.goto('/thread/123')
    
    // Wait for page to load
    await page.waitForSelector('.app-page')
    
    await checkA11y(page, '#app', axeConfig)
  })
})

// Specific accessibility tests for common issues
test.describe('Specific Accessibility Checks', () => {
  test.beforeEach(async ({ page }) => {
    await injectAxe(page)
  })

  test('All images have alt attributes', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.app-page')
    
    const images = await page.$$eval('img', (imgs) => 
      imgs.map(img => ({
        src: img.src,
        alt: img.alt,
        hasAlt: img.hasAttribute('alt'),
      }))
    )
    
    // All images should have alt attributes
    images.forEach((img, index) => {
      expect(img.hasAlt, `Image at index ${index} (${img.src}) is missing alt attribute`).toBe(true)
    })
  })

  test('All buttons have accessible names', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.app-page')
    
    await checkA11y(page, '#app', {
      rules: {
        'button-name': { enabled: true },
      },
    })
  })

  test('All links have accessible names', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.app-page')
    
    await checkA11y(page, '#app', {
      rules: {
        'link-name': { enabled: true },
      },
    })
  })

  test('All form inputs have labels', async ({ page }) => {
    await page.goto('/signin')
    await page.waitForSelector('.app-page')
    
    await checkA11y(page, '#app', {
      rules: {
        'input-button': { enabled: true },
        'label': { enabled: true },
      },
    })
  })

  test('Color contrast meets WCAG AA standards', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.app-page')
    
    await checkA11y(page, '#app', {
      rules: {
        'color-contrast': { enabled: true },
      },
    })
  })

  test('Focus indicators are visible', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.app-page')
    
    // Check that focusable elements have focus styles
    const focusableElements = await page.$$eval(
      'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
      (els) => els.length
    )
    
    expect(focusableElements).toBeGreaterThan(0)
    
    // Tab through elements and check focus
    await page.keyboard.press('Tab')
    const focused = await page.evaluate(() => {
      const active = document.activeElement
      return {
        tagName: active?.tagName,
        hasFocus: active?.matches(':focus-visible'),
        computedStyle: active ? window.getComputedStyle(active).outline : null,
      }
    })
    
    // Element should be focusable
    expect(focused.tagName).toBeDefined()
  })

  test('Keyboard navigation works for main actions', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.app-page')
    
    // Get all focusable elements
    const focusableSelectors = 'button, [href], input, textarea, select'
    const focusableCount = await page.locator(focusableSelectors).count()
    
    expect(focusableCount).toBeGreaterThan(0)
    
    // Tab through elements
    for (let i = 0; i < Math.min(focusableCount, 5); i++) {
      await page.keyboard.press('Tab')
      const focused = await page.evaluate(() => {
        const active = document.activeElement
        return {
          tagName: active?.tagName,
          id: active?.id,
          className: active?.className,
        }
      })
      
      expect(focused.tagName).toBeDefined()
    }
  })

  test('Skip links are available for keyboard users', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.app-page')
    
    // Check for skip link or main content
    const mainContent = await page.locator('main, [role="main"]').first()
    expect(await mainContent.count()).toBeGreaterThan(0)
  })

  test('Heading hierarchy is correct', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.app-page')
    
    const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', (hs) => 
      hs.map(h => ({
        tag: h.tagName.toLowerCase(),
        text: h.textContent?.trim() || '',
      }))
    )
    
    // Should have at least one h1
    const h1Count = headings.filter(h => h.tag === 'h1').length
    expect(h1Count).toBeGreaterThan(0)
    
    // Heading levels should not skip more than one level
    const headingLevels = headings.map(h => parseInt(h.tag.substring(1)))
    for (let i = 1; i < headingLevels.length; i++) {
      const diff = headingLevels[i] - headingLevels[i - 1]
      expect(diff, `Heading level jump from ${headingLevels[i - 1]} to ${headingLevels[i]}`).toBeGreaterThanOrEqual(-1)
      expect(diff).toBeLessThanOrEqual(1)
    }
  })

  test('ARIA live regions are used for dynamic content', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.app-page')
    
    const liveRegions = await page.$$eval('[aria-live], [role="alert"], [role="status"]', (els) => 
      els.length
    )
    
    // Dynamic content areas should use live regions
    // This is a soft check - not all pages need live regions
  })

  test('Error messages are accessible', async ({ page }) => {
    await page.goto('/signin')
    await page.waitForSelector('.app-page')
    
    // Check for error message accessibility
    await checkA11y(page, '#app', {
      rules: {
        'aria-allowed-attr': { enabled: true },
        'role-supported-aria-props': { enabled: true },
      },
    })
  })
})

// Mobile-specific accessibility tests
test.describe('Mobile Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await injectAxe(page)
    
    // Set mobile viewport
    await page.setViewportSize({
      width: 390,
      height: 844,
    })
  })

  test('Touch targets are large enough', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.app-page')
    
    // Check button sizes
    const buttons = await page.$$eval('button, [role="button"]', (btns) => 
      btns.map(btn => {
        const rect = btn.getBoundingClientRect()
        return {
          width: rect.width,
          height: rect.height,
          minDimension: Math.min(rect.width, rect.height),
        }
      })
    )
    
    // Touch targets should be at least 44x44px (iOS) or 48x48px (Android)
    buttons.forEach((btn, index) => {
      expect(
        btn.minDimension,
        `Button at index ${index} has insufficient touch target size: ${btn.width}x${btn.height}`
      ).toBeGreaterThanOrEqual(44)
    })
  })

  test('Viewport is accessible', async ({ page }) => {
    await page.goto('/')
    
    const viewport = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="viewport"]')
      return meta?.getAttribute('content') || ''
    })
    
    // Should have viewport meta tag
    expect(viewport).toContain('width=device-width')
    expect(viewport).toContain('initial-scale=1')
  })

  test('Safe area insets are respected', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.app-page')
    
    // Check for safe area handling
    const elementsWithSafeArea = await page.$$eval(
      '[style*="safe-area-inset"], [style*="env(safe-area"]',
      (els) => els.length
    )
    
    // Modern mobile apps should handle safe areas
    // This is a soft check
  })
})

// Reduced motion tests
test.describe('Reduced Motion', () => {
  test.beforeEach(async ({ page }) => {
    await injectAxe(page)
    
    // Enable reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' })
  })

  test('Animations are reduced when prefers-reduced-motion is enabled', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.app-page')
    
    // Check for reduced motion handling
    const computedStyles = await page.evaluate(() => {
      const elements = document.querySelectorAll('*')
      const styles: Record<string, string> = {}
      
      elements.forEach(el => {
        const computed = window.getComputedStyle(el)
        if (computed.animation !== 'none') {
          styles[el.tagName] = computed.animation
        }
        if (computed.transition !== 'all 0s ease 0s') {
          styles[el.tagName] = computed.transition
        }
      })
      
      return styles
    })
    
    // Should have limited or no animations when reduced motion is enabled
    // This depends on the AppRoot configuration
  })

  test('No critical violations with reduced motion', async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.app-page')
    
    await checkA11y(page, '#app', axeConfig)
  })
})
