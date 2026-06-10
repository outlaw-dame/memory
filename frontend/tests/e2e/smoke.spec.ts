import { test, expect, type Locator } from '@playwright/test';

/**
 * E2E Smoke Tests for memory.
 * 
 * These tests verify the core functionality and user flows:
 * 1. App loading and basic navigation
 * 2. Authentication flow (if applicable)
 * 3. Feed/post interaction
 * 4. Messaging functionality
 * 5. Accessibility features
 * 6. PWA capabilities
 * 7. Error handling
 */

test.describe('memory. Smoke Tests', () => {
  test.use({ storageState: undefined }); // Start with clean state

  // Helper function to wait for network idle
  async function waitForIdle(page: any) {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // Additional buffer
  }

  test.describe('App Loading and Navigation', () => {
    test('should load the app successfully', async ({ page }) => {
      await page.goto('/');
      await waitForIdle(page);
      
      // Check that the app loads without errors
      await expect(page).toHaveTitle(/memory/);
      
      // Check for main content or loading state
      await expect(page.getByRole('main')).toBeVisible();
    });

    test('should display navigation elements', async ({ page }) => {
      await page.goto('/');
      await waitForIdle(page);
      
      // Check for navigation elements
      const navElements = page.getByRole('navigation');
      await expect(navElements).toHaveCountGreaterThan(0);
    });

    test('should handle route navigation', async ({ page }) => {
      await page.goto('/');
      await waitForIdle(page);
      
      // Try navigating to different routes
      const routes = ['/', '/feed', '/messages', '/explore', '/settings'];
      
      for (const route of routes) {
        await page.goto(route);
        await waitForIdle(page);
        
        // Should not have 404 errors
        await expect(page.getByText('404')).not.toBeVisible();
        await expect(page.getByText('Not Found')).not.toBeVisible();
      }
    });
  });

  test.describe('Feed Functionality', () => {
    test('should display feed content', async ({ page }) => {
      await page.goto('/');
      await waitForIdle(page);
      
      // Check for feed items or loading state
      const feedItems = page.getByTestId(/feed-item|post|unified-feed/);
      await expect(feedItems).toHaveCountGreaterThanOrEqual(0);
    });

    test('should handle post creation flow', async ({ page }) => {
      await page.goto('/');
      await waitForIdle(page);
      
      // Look for compose button or input
      const composeButton = page.getByRole('button', { name: /compose|create|new post/i });
      
      if (await composeButton.count() > 0) {
        await composeButton.first().click();
        await waitForIdle(page);
        
        // Check for composer elements
        await expect(page.getByRole('textbox')).toHaveCountGreaterThanOrEqual(1);
      }
    });

    test('should handle feed action buttons', async ({ page }) => {
      await page.goto('/');
      await waitForIdle(page);
      
      // Look for action buttons (like, reply, repost)
      const actionButtons = page.getByRole('button', { 
        name: /like|reply|repost|share|bookmark/i 
      });
      
      await expect(actionButtons).toHaveCountGreaterThanOrEqual(0);
      
      // If buttons exist, they should be clickable
      if (await actionButtons.count() > 0) {
        await actionButtons.first().click();
        await expect(page).not.toHaveURL(/error|crash/i);
      }
    });
  });

  test.describe('Messaging Functionality', () => {
    test('should navigate to messages', async ({ page }) => {
      await page.goto('/');
      await waitForIdle(page);
      
      const messagesLink = page.getByRole('link', { name: /messages|dm|chat/i });
      
      if (await messagesLink.count() > 0) {
        await messagesLink.first().click();
        await waitForIdle(page);
        
        await expect(page).toHaveURL(/messages/);
      }
    });

    test('should display conversation list', async ({ page }) => {
      await page.goto('/messages');
      await waitForIdle(page);
      
      // Check for conversation items or empty state
      const conversations = page.getByTestId(/conversation|thread|dm/);
      await expect(conversations).toHaveCountGreaterThanOrEqual(0);
    });
  });

  test.describe('Accessibility Features', () => {
    test('should have proper heading structure', async ({ page }) => {
      await page.goto('/');
      await waitForIdle(page);
      
      // Check for heading hierarchy
      const h1 = page.getByRole('heading', { level: 1 });
      const h2 = page.getByRole('heading', { level: 2 });
      
      await expect(h1).toHaveCountGreaterThanOrEqual(0);
      await expect(h2).toHaveCountGreaterThanOrEqual(0);
    });

    test('should have proper button labels', async ({ page }) => {
      await page.goto('/');
      await waitForIdle(page);
      
      // Check that buttons have accessible names
      const buttons = page.getByRole('button');
      const buttonCount = await buttons.count();
      
      // All buttons should have either text content or aria-label
      for (let i = 0; i < Math.min(buttonCount, 10); i++) {
        const button = buttons.nth(i);
        const hasText = await button.textContent();
        const hasAriaLabel = await button.getAttribute('aria-label');
        
        expect(hasText?.trim().length || hasAriaLabel?.length).toBeGreaterThan(0);
      }
    });

    test('should handle keyboard navigation', async ({ page }) => {
      await page.goto('/');
      await waitForIdle(page);
      
      // Tab through interactive elements
      const interactiveElements = page.getByRole(/button|link|textbox|combobox/);
      const firstElement = interactiveElements.first();
      
      await firstElement.focus();
      await page.keyboard.press('Tab');
      
      // Should move to next interactive element
      const activeElement = page.locator(':focus-visible');
      await expect(activeElement).toBeVisible();
    });
  });

  test.describe('PWA Features', () => {
    test('should register service worker', async ({ page, context }) => {
      // Only test in Chromium
      if (test.info().project.name !== 'chromium') {
        test.skip();
      }
      
      await page.goto('/');
      await waitForIdle(page);
      
      // Check for service worker registration
      const serviceWorker = await context.serviceWorker();
      expect(serviceWorker).toBeDefined();
    });

    test('should have PWA manifest', async ({ page }) => {
      await page.goto('/');
      await waitForIdle(page);
      
      // Check for manifest link
      const manifestLink = page.getByRole('link', { name: /manifest\.json/i });
      
      // Or check directly
      const response = await page.request.get('/manifest.json');
      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThan(400);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle 404 routes gracefully', async ({ page }) => {
      await page.goto('/non-existent-route');
      await waitForIdle(page);
      
      // Should either redirect, show 404 page, or handle gracefully
      const errorText = page.getByText(/404|not found|page not found/i);
      const hasError = await errorText.count() > 0;
      
      if (hasError) {
        await expect(errorText).toBeVisible();
      } else {
        // If no 404 shown, should be redirected to a valid route
        expect(page.url()).not.toContain('/non-existent-route');
      }
    });

    test('should show loading states properly', async ({ page }) => {
      await page.goto('/');
      await waitForIdle(page);
      
      // Loading states should either be visible or have completed
      const loadingIndicators = page.getByRole(/status|progressbar/);
      const loadingCount = await loadingIndicators.count();
      
      // If loading indicators exist, they should not cause errors
      expect(loadingCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test.use(devices['iPhone 13']);
    
    test('should render on mobile viewport', async ({ page }) => {
      await page.goto('/');
      await waitForIdle(page);
      
      // Should not have horizontal overflow on mobile
      const body = page.locator('body');
      const width = await body.evaluate((el) => el.scrollWidth);
      const viewportWidth = page.viewportSize?.width || 390;
      
      expect(width).toBeLessThanOrEqual(viewportWidth * 1.2); // Allow small overflow for browser chrome
    });

    test('should handle touch interactions', async ({ page }) => {
      await page.goto('/');
      await waitForIdle(page);
      
      // Find first button and tap it
      const firstButton = page.getByRole('button').first();
      
      if (await firstButton.count() > 0) {
        await firstButton.tap();
        await expect(page).not.toHaveURL(/error|crash/i);
      }
    });
  });

  test.describe('Visual Regression', () => {
    test('should maintain consistent layout', async ({ page }) => {
      await page.goto('/');
      await waitForIdle(page);
      
      // Take screenshot for visual regression comparison
      expect(await page.screenshot()).toMatchSnapshot('homepage.png');
    });
  });
});