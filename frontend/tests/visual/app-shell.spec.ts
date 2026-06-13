/**
 * Visual Regression Tests - App Shell
 * 
 * Tests cover:
 * - App shell layout consistency
 * - Home screen visual state
 * - Navigation bar appearance
 * - Tab bar appearance
 * - Auth screen differences (no shell)
 * - Responsive behavior
 */

import { test, expect } from '@playwright/test'

// Viewport configurations for testing
const viewports = {
  iPhoneSE: { width: 375, height: 667 },
  iPhone13: { width: 390, height: 844 },
  Android: { width: 412, height: 915 },
  iPadPortrait: { width: 768, height: 1024 },
  DesktopNarrow: { width: 800, height: 600 },
  DesktopWide: { width: 1280, height: 800 },
}

// Test configurations
const testConfigs = [
  { name: 'iPhone SE', viewport: viewports.iPhoneSE },
  { name: 'iPhone 13', viewport: viewports.iPhone13 },
  { name: 'Android', viewport: viewports.Android },
  { name: 'iPad Portrait', viewport: viewports.iPadPortrait },
  { name: 'Desktop Narrow', viewport: viewports.DesktopNarrow },
  { name: 'Desktop Wide', viewport: viewports.DesktopWide },
]

test.describe('App Shell Visual Regression', () => {
  testConfigs.forEach(({ name, viewport }) => {
    test(`App shell layout - ${name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      // Set viewport
      await page.setViewportSize(viewport)
      
      // Navigate to home
      await page.goto('/')
      
      // Wait for app to load
      await page.waitForSelector('.app-shell-main')
      
      // Wait for any animations to settle
      await page.waitForTimeout(500)
      
      // Take screenshot of the entire app shell
      const screenshot = await page.screenshot({
        fullPage: false,
        clip: {
          x: 0,
          y: 0,
          width: viewport.width,
          height: viewport.height,
        },
      })
      
      // Compare with baseline
      expect(screenshot).toMatchSnapshot(`app-shell-${name.replace(/\s+/g, '-').toLowerCase()}.png`)
    })
  })

  test(`App shell with navbar and tabbar visible`, async ({ page }) => {
    await page.setViewportSize(viewports.iPhone13)
    await page.goto('/')
    
    // Wait for shell to be visible
    await page.waitForSelector('.app-shell-topbar')
    await page.waitForSelector('.app-shell-tabbar')
    await page.waitForSelector('.app-shell-main')
    
    await page.waitForTimeout(500)
    
    // Capture the full shell
    const screenshot = await page.screenshot({
      clip: {
        x: 0,
        y: 0,
        width: 390,
        height: 844,
      },
    })
    
    expect(screenshot).toMatchSnapshot('app-shell-full.png')
  })

  test(`Auth screen has no shell chrome`, async ({ page }) => {
    await page.setViewportSize(viewports.iPhone13)
    await page.goto('/signin')
    
    // Wait for auth page to load
    await page.waitForSelector('.app-page')
    
    // Verify shell is not present
    const navbarCount = await page.locator('.app-shell-topbar').count()
    const tabbarCount = await page.locator('.app-shell-tabbar').count()
    
    expect(navbarCount).toBe(0)
    expect(tabbarCount).toBe(0)
    
    await page.waitForTimeout(500)
    
    // Capture auth screen without shell
    const screenshot = await page.screenshot({
      clip: {
        x: 0,
        y: 0,
        width: 390,
        height: 844,
      },
    })
    
    expect(screenshot).toMatchSnapshot('auth-screen-no-shell.png')
  })

  test(`Explore screen with search focused`, async ({ page }) => {
    await page.setViewportSize(viewports.iPhone13)
    await page.goto('/explore')
    
    // Wait for page to load
    await page.waitForSelector('.app-shell-main')
    
    // Focus search input if it exists
    try {
      await page.focus('input[type="search"]')
      await page.waitForTimeout(300)
    } catch {
      // Search input may not exist, continue without focusing
    }
    
    await page.waitForTimeout(500)
    
    const screenshot = await page.screenshot({
      clip: {
        x: 0,
        y: 0,
        width: 390,
        height: 844,
      },
    })
    
    expect(screenshot).toMatchSnapshot('explore-search-focused.png')
  })

  test(`Settings screen layout`, async ({ page }) => {
    await page.setViewportSize(viewports.iPhone13)
    await page.goto('/settings')
    
    // Wait for page to load
    await page.waitForSelector('.app-shell-main')
    
    await page.waitForTimeout(500)
    
    const screenshot = await page.screenshot({
      clip: {
        x: 0,
        y: 0,
        width: 390,
        height: 844,
      },
    })
    
    expect(screenshot).toMatchSnapshot('settings-screen.png')
  })
})

test.describe('Navigation Visual States', () => {
  test(`Tab bar active states`, async ({ page }) => {
    await page.setViewportSize(viewports.iPhone13)
    await page.goto('/')
    
    // Wait for tab bar to load
    await page.waitForSelector('.app-tabbar')
    
    // Get tab links
    const tabs = await page.locator('.app-tabbar-link').all()
    
    // Home tab should be active
    const homeTab = tabs[0]
    await expect(homeTab).toHaveClass(/tab-link-active/)
    
    // Take screenshot of tab bar
    const tabBar = await page.locator('.app-tabbar')
    const screenshot = await tabBar.screenshot()
    
    expect(screenshot).toMatchSnapshot('tabbar-home-active.png')
  })

  test(`Tab bar explore active`, async ({ page }) => {
    await page.setViewportSize(viewports.iPhone13)
    await page.goto('/explore')
    
    await page.waitForSelector('.app-tabbar')
    
    // Explore tab should be active
    const tabs = await page.locator('.app-tabbar-link').all()
    const exploreTab = tabs[1]
    await expect(exploreTab).toHaveClass(/tab-link-active/)
    
    const tabBar = await page.locator('.app-tabbar')
    const screenshot = await tabBar.screenshot()
    
    expect(screenshot).toMatchSnapshot('tabbar-explore-active.png')
  })

  test(`Navbar back button visibility`, async ({ page }) => {
    await page.setViewportSize(viewports.iPhone13)
    await page.goto('/thread/123')
    
    // Wait for navbar to load
    await page.waitForSelector('.app-topbar-back-link')
    
    // Back button should be visible
    const backButton = await page.locator('.app-topbar-back-link').first()
    await expect(backButton).toBeVisible()
    
    // Take screenshot of navbar
    const navbar = await page.locator('.app-topbar')
    const screenshot = await navbar.screenshot()
    
    expect(screenshot).toMatchSnapshot('navbar-with-back.png')
  })

  test(`Navbar without back button on home`, async ({ page }) => {
    await page.setViewportSize(viewports.iPhone13)
    await page.goto('/')
    
    await page.waitForSelector('.app-shell-topbar')
    
    // Back button should not be visible on home
    const backButtonCount = await page.locator('.app-topbar-back-link').count()
    expect(backButtonCount).toBe(0)
    
    const navbar = await page.locator('.app-shell-topbar')
    const screenshot = await navbar.screenshot()
    
    expect(screenshot).toMatchSnapshot('navbar-home-no-back.png')
  })
})

test.describe('Theme and Styling', () => {
  test(`Light theme appearance`, async ({ page }) => {
    await page.setViewportSize(viewports.iPhone13)
    await page.goto('/')
    
    await page.waitForSelector('.app-shell-main')
    await page.waitForTimeout(500)
    
    // Capture with light theme
    const screenshot = await page.screenshot({
      clip: {
        x: 0,
        y: 0,
        width: 390,
        height: 844,
      },
    })
    
    expect(screenshot).toMatchSnapshot('light-theme.png')
  })

  test(`Reduced motion state`, async ({ page }) => {
    // Enable reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' })
    
    await page.setViewportSize(viewports.iPhone13)
    await page.goto('/')
    
    await page.waitForSelector('.app-shell-main')
    await page.waitForTimeout(500)
    
    const screenshot = await page.screenshot({
      clip: {
        x: 0,
        y: 0,
        width: 390,
        height: 844,
      },
    })
    
    expect(screenshot).toMatchSnapshot('reduced-motion.png')
  })
})

test.describe('Responsive Behavior', () => {
  test(`Narrow to wide viewport transition`, async ({ page }) => {
    // Start with narrow viewport
    await page.setViewportSize(viewports.DesktopNarrow)
    await page.goto('/')
    await page.waitForSelector('.app-shell-main')
    
    // Take screenshot at narrow viewport
    const narrowScreenshot = await page.screenshot({
      clip: {
        x: 0,
        y: 0,
        width: 800,
        height: 600,
      },
    })
    expect(narrowScreenshot).toMatchSnapshot('responsive-narrow.png')
    
    // Resize to wide viewport
    await page.setViewportSize(viewports.DesktopWide)
    await page.waitForTimeout(300) // Wait for resize to settle
    
    // Take screenshot at wide viewport
    const wideScreenshot = await page.screenshot({
      clip: {
        x: 0,
        y: 0,
        width: 1280,
        height: 800,
      },
    })
    expect(wideScreenshot).toMatchSnapshot('responsive-wide.png')
  })

  test(`Mobile to tablet transition`, async ({ page }) => {
    // Start with mobile viewport
    await page.setViewportSize(viewports.iPhone13)
    await page.goto('/')
    await page.waitForSelector('.app-shell-main')
    
    // Take screenshot at mobile viewport
    const mobileScreenshot = await page.screenshot({
      clip: {
        x: 0,
        y: 0,
        width: 390,
        height: 844,
      },
    })
    expect(mobileScreenshot).toMatchSnapshot('responsive-mobile.png')
    
    // Resize to tablet viewport
    await page.setViewportSize(viewports.iPadPortrait)
    await page.waitForTimeout(300)
    
    // Take screenshot at tablet viewport
    const tabletScreenshot = await page.screenshot({
      clip: {
        x: 0,
        y: 0,
        width: 768,
        height: 1024,
      },
    })
    expect(tabletScreenshot).toMatchSnapshot('responsive-tablet.png')
  })
})

test.describe('Loading and Empty States', () => {
  test(`Home screen empty state`, async ({ page }) => {
    // Mock empty feed
    await page.route('/api/posts', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [] }),
      })
    })
    
    await page.setViewportSize(viewports.iPhone13)
    await page.goto('/')
    
    await page.waitForSelector('.app-shell-main')
    await page.waitForTimeout(500)
    
    const screenshot = await page.screenshot({
      clip: {
        x: 0,
        y: 0,
        width: 390,
        height: 844,
      },
    })
    
    expect(screenshot).toMatchSnapshot('home-empty.png')
  })

  test(`Messages screen empty state`, async ({ page }) => {
    // Mock empty messages
    await page.route('/api/messages', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ threads: [] }),
      })
    })
    
    await page.setViewportSize(viewports.iPhone13)
    await page.goto('/messages')
    
    await page.waitForSelector('.app-shell-main')
    await page.waitForTimeout(500)
    
    const screenshot = await page.screenshot({
      clip: {
        x: 0,
        y: 0,
        width: 390,
        height: 844,
      },
    })
    
    expect(screenshot).toMatchSnapshot('messages-empty.png')
  })
})
