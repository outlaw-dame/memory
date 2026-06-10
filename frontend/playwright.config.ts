import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for memory. E2E Tests
 * 
 * This configuration supports:
 * - Cross-browser testing (Chromium, Firefox, WebKit)
 * - Mobile device emulation
 * - Desktop testing
 * - Custom viewport sizes
 * - Video recording and screenshots on failure
 */

export default defineConfig({
  // Test directory
  testDir: './tests/e2e',
  
  // Timeout settings
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  
  // Fully parallel test execution
  fullyParallel: true,
  
  // Fail the build on CI if tests fail
  failOnSnapshotDiff: true,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Workers for parallel execution
  workers: process.env.CI ? 4 : undefined,
  
  // Reporter configuration
  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-results/html' }],
    ['json', { outputFolder: 'test-results/json' }]
  ],
  
  // Use baseURL for relative URL navigation
  use: {
    baseURL: 'http://localhost:5173',
    
    // Take trace on first retry for each test
    trace: 'on-first-retry',
    
    // Capture screenshot and video on failure
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Port for test server
    launchOptions: {
      slowMo: 50 // Slow down by 50ms for better debugging
    }
  },
  
  // Projects for different browsers and devices
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // Mobile browsers
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
    },
    
    // iPad
    {
      name: 'iPad',
      use: { ...devices['iPad (gen 7)'] },
    },
  ],
  
  // Global setup and teardown
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
  
  // Web server configuration
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes for dev server to start
  }
});