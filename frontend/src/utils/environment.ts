/**
 * Environment Detection Utilities
 *
 * This module provides consistent environment detection and assertion utilities
 * for the Memory application. It centralizes environment-related checks to ensure
 * consistent behavior across the codebase.
 *
 * @module utils/environment
 * @see {@link https://github.com/outlaw-dame/memory | Memory Project}
 */

/**
 * Environment mode type
 */
export type EnvironmentMode = 'development' | 'production' | 'test'

/**
 * Environment information derived from Vite's import.meta.env
 */
export interface EnvironmentInfo {
  /** Current mode (development, production, or test) */
  mode: EnvironmentMode
  /** True if in development mode */
  isDev: boolean
  /** True if in production mode */
  isProd: boolean
  /** True if in test mode */
  isTest: boolean
  /** True if running in Node.js (SSR) */
  isSSR: boolean
  /** True if running in a browser */
  isBrowser: boolean
  /** Base URL for the application */
  baseUrl: string
}

/**
 * Gets the current environment mode from Vite's import.meta.env
 */
function getMode(): EnvironmentMode {
  const mode = import.meta.env.MODE
  if (mode === 'development' || mode === 'production' || mode === 'test') {
    return mode
  }
  // Default to development if MODE is not set
  return 'development'
}

/**
 * Cached environment information
 */
let environmentInfo: EnvironmentInfo | null = null

/**
 * Gets comprehensive environment information
 * 
 * @returns EnvironmentInfo object with all environment flags
 * 
 * @example
 * ```ts
 * import { getEnvironment } from '@/utils/environment'
 * 
 * const env = getEnvironment()
 * if (env.isDev) {
 *   console.log('Development mode')
 * }
 * ```
 */
export function getEnvironment(): EnvironmentInfo {
  if (environmentInfo) {
    return environmentInfo
  }

  const mode = getMode()
  const isDev = import.meta.env.DEV === true
  const isProd = import.meta.env.PROD === true
  const isSSR = import.meta.env.SSR === true

  environmentInfo = {
    mode,
    isDev,
    isProd,
    isTest: mode === 'test',
    isSSR,
    isBrowser: typeof window !== 'undefined',
    baseUrl: import.meta.env.BASE_URL || '/',
  }

  return environmentInfo
}

/**
 * Shorthand for checking if in development mode
 * 
 * @example
 * ```ts
 * import { isDev } from '@/utils/environment'
 * 
 * if (isDev) {
 *   // Development-only code
 * }
 * ```
 */
export const isDev = getEnvironment().isDev

/**
 * Shorthand for checking if in production mode
 * 
 * @example
 * ```ts
 * import { isProd } from '@/utils/environment'
 * 
 * if (isProd) {
 *   // Production-only code
 * }
 * ```
 */
export const isProd = getEnvironment().isProd

/**
 * Shorthand for checking if in test mode
 * 
 * @example
 * ```ts
 * import { isTest } from '@/utils/environment'
 * 
 * if (isTest) {
 *   // Test-only code
 * }
 * ```
 */
export const isTest = getEnvironment().isTest

/**
 * Shorthand for checking if running in Node.js (SSR)
 * 
 * @example
 * ```ts
 * import { isSSR } from '@/utils/environment'
 * 
 * if (isSSR) {
 *   // Server-side only code
 * }
 * ```
 */
export const isSSR = getEnvironment().isSSR

/**
 * Shorthand for checking if running in a browser
 * 
 * @example
 * ```ts
 * import { isBrowser } from '@/utils/environment'
 * 
 * if (isBrowser) {
 *   // Browser-only code
 * }
 * ```
 */
export const isBrowser = getEnvironment().isBrowser

/**
 * Shorthand for getting the base URL
 * 
 * @example
 * ```ts
 * import { baseUrl } from '@/utils/environment'
 * 
 * const apiUrl = `${baseUrl}/api`
 * ```
 */
export const baseUrl = getEnvironment().baseUrl

/**
 * Feature flags derived from environment variables
 * 
 * These are configured in .env files and provide runtime feature toggles
 */

/**
 * Check if demo mode is enabled
 * 
 * Demo mode should only be enabled in development or with explicit flag
 * 
 * @example
 * ```ts
 * import { isDemoMode } from '@/utils/environment'
 * 
 * if (isDemoMode) {
 *   // Show demo data
 * }
 * ```
 */
export const isDemoMode = import.meta.env.VITE_ENABLE_DEMO_MODE === 'true' || isDev

/**
 * Check if mock API is enabled
 * 
 * Mock API replaces real API calls with simulated responses
 * 
 * @example
 * ```ts
 * import { isMockAPI } from '@/utils/environment'
 * 
 * if (isMockAPI) {
 *   // Use mock API client
 * }
 * ```
 */
export const isMockAPI = import.meta.env.VITE_MOCK_API === 'true'

/**
 * Check if analytics is enabled
 * 
 * Analytics should be disabled in development and test modes
 * 
 * @example
 * ```ts
 * import { isAnalyticsEnabled } from '@/utils/environment'
 * 
 * if (isAnalyticsEnabled) {
 *   // Track event
 * }
 * ```
 */
export const isAnalyticsEnabled = isProd && import.meta.env.VITE_ANALYTICS_ENABLED !== 'false'

/**
 * Check if error reporting is enabled
 * 
 * Error reporting should be configurable per environment
 * 
 * @example
 * ```ts
 * import { isErrorReportingEnabled } from '@/utils/environment'
 * 
 * if (isErrorReportingEnabled) {
 *   // Report error to service
 * }
 * ```
 */
export const isErrorReportingEnabled = import.meta.env.VITE_ERROR_REPORTING_ENABLED !== 'false'

/**
 * Check if logging is enabled
 * 
 * Logging can be disabled in production for performance
 * 
 * @example
 * ```ts
 * import { isLoggingEnabled } from '@/utils/environment'
 * 
 * if (isLoggingEnabled) {
 *   logger.debug('Debug info')
 * }
 * ```
 */
export const isLoggingEnabled = import.meta.env.VITE_LOGGING_ENABLED !== 'false'

/**
 * Type guard utilities for environment assertions
 */

/**
 * Asserts that the current environment is development
 * 
 * Use this in functions that should only be called in development
 * 
 * @throws Error if not in development mode
 * 
 * @example
 * ```ts
 * import { assertDev } from '@/utils/environment'
 * 
 * function debugOnlyFunction() {
 *   assertDev()
 *   // ... development-only code
 * }
 * ```
 */
export function assertDev(): asserts isDev {
  if (!isDev) {
    throw new Error('This function should only be called in development mode')
  }
}

/**
 * Asserts that the current environment is production
 * 
 * Use this in functions that should only be called in production
 * 
 * @throws Error if not in production mode
 * 
 * @example
 * ```ts
 * import { assertProd } from '@/utils/environment'
 * 
 * function prodOnlyFunction() {
 *   assertProd()
 *   // ... production-only code
 * }
 * ```
 */
export function assertProd(): asserts isProd {
  if (!isProd) {
    throw new Error('This function should only be called in production mode')
  }
}

/**
 * Asserts that the current environment is browser
 * 
 * Use this in functions that should only be called in browser
 * 
 * @throws Error if not in browser environment
 * 
 * @example
 * ```ts
 * import { assertBrowser } from '@/utils/environment'
 * 
 * function browserOnlyFunction() {
 *   assertBrowser()
 *   // ... browser-only code (e.g., window, document)
 * }
 * ```
 */
export function assertBrowser(): asserts isBrowser {
  if (!isBrowser) {
    throw new Error('This function should only be called in a browser environment')
  }
}

/**
 * Asserts that the current environment is Node.js (SSR)
 * 
 * Use this in functions that should only be called in SSR
 * 
 * @throws Error if not in SSR environment
 * 
 * @example
 * ```ts
 * import { assertSSR } from '@/utils/environment'
 * 
 * function ssrOnlyFunction() {
 *   assertSSR()
 *   // ... server-side only code
 * }
 * ```
 */
export function assertSSR(): asserts isSSR {
  if (!isSSR) {
    throw new Error('This function should only be called in an SSR environment')
  }
}

/**
 * Utility for creating environment-specific configurations
 */

/**
 * Configuration that varies by environment
 */
export interface EnvironmentConfig<T> {
  development: T
  production: T
  test?: T
}

/**
 * Gets the appropriate configuration value for the current environment
 * 
 * @param config - Environment-specific configuration
 * @returns The configuration value for the current environment
 * 
 * @example
 * ```ts
 * import { getEnvConfig } from '@/utils/environment'
 * 
 * const config = getEnvConfig({
 *   development: { apiUrl: 'http://localhost:3000/api' },
 *   production: { apiUrl: 'https://api.memory.app/api' },
 *   test: { apiUrl: 'http://localhost:3001/api' },
 * })
 * 
 * fetch(`${config.apiUrl}/users`)
 * ```
 */
export function getEnvConfig<T>(config: EnvironmentConfig<T>): T {
  const mode = getMode()
  
  if (mode === 'test' && config.test !== undefined) {
    return config.test
  }
  
  if (mode === 'development') {
    return config.development
  }
  
  return config.production
}

/**
 * Utility for conditional code based on environment
 */

/**
 * Executes a callback based on the current environment
 * 
 * @param callbacks - Environment-specific callbacks
 * @returns The result of the appropriate callback
 * 
 * @example
 * ```ts
 * import { runByEnv } from '@/utils/environment'
 * 
 * const result = runByEnv({
 *   development: () => console.log('Dev mode'),
 *   production: () => console.log('Prod mode'),
 *   test: () => console.log('Test mode'),
 * })
 * ```
 */
export function runByEnv<T>(callbacks: {
  development: () => T
  production: () => T
  test?: () => T
}): T {
  const mode = getMode()
  
  if (mode === 'test' && callbacks.test !== undefined) {
    return callbacks.test()
  }
  
  if (mode === 'development') {
    return callbacks.development()
  }
  
  return callbacks.production()
}

/**
 * Global feature flag utility
 * 
 * Use this to create feature flags that can be toggled at runtime
 */

/**
 * Feature flag registry
 */
const featureFlags: Record<string, boolean> = {}

/**
 * Registers a feature flag
 * 
 * @param name - Feature flag name
 * @param defaultValue - Default value
 * @returns The feature flag value
 * 
 * @example
 * ```ts
 * import { registerFeatureFlag, isFeatureEnabled } from '@/utils/environment'
 * 
 * // In initialization code
 * registerFeatureFlag('newUI', false)
 * 
 * // In component
 * if (isFeatureEnabled('newUI')) {
 *   // Use new UI
 * }
 * ```
 */
export function registerFeatureFlag(name: string, defaultValue: boolean): boolean {
  const envValue = import.meta.env[`VITE_FEATURE_${name.toUpperCase()}`]
  const isEnabled = envValue === 'true' || (envValue !== 'false' && defaultValue)
  featureFlags[name] = isEnabled
  return isEnabled
}

/**
 * Checks if a feature flag is enabled
 * 
 * @param name - Feature flag name
 * @returns True if the feature is enabled
 * 
 * @example
 * ```ts
 * import { isFeatureEnabled } from '@/utils/environment'
 * 
 * if (isFeatureEnabled('newUI')) {
 *   // Use new UI
 * }
 * ```
 */
export function isFeatureEnabled(name: string): boolean {
  return featureFlags[name] ?? false
}

/**
 * Sets a feature flag at runtime (useful for testing or runtime toggles)
 * 
 * @param name - Feature flag name
 * @param enabled - Whether to enable the feature
 * 
 * @example
 * ```ts
 * import { setFeatureFlag, isFeatureEnabled } from '@/utils/environment'
 * 
 * // Enable feature for testing
 * setFeatureFlag('newUI', true)
 * 
 * if (isFeatureEnabled('newUI')) {
 *   // Use new UI
 * }
 * ```
 */
export function setFeatureFlag(name: string, enabled: boolean): void {
  featureFlags[name] = enabled
}

/**
 * Gets all registered feature flags
 * 
 * @returns Object with all feature flags and their values
 * 
 * @example
 * ```ts
 * import { getAllFeatureFlags } from '@/utils/environment'
 * 
 * console.log(getAllFeatureFlags())
 * // { newUI: false, darkMode: true, ... }
 * ```
 */
export function getAllFeatureFlags(): Record<string, boolean> {
  return { ...featureFlags }
}

/**
 * Resets all feature flags to their default values
 * 
 * Useful for testing
 * 
 * @example
 * ```ts
 * import { resetFeatureFlags } from '@/utils/environment'
 * 
 * afterEach(() => {
 *   resetFeatureFlags()
 * })
 * ```
 */
export function resetFeatureFlags(): void {
  Object.keys(featureFlags).forEach(key => {
    delete featureFlags[key]
  })
}

// Export all utility functions
export {
  getEnvironment,
  getMode,
}
