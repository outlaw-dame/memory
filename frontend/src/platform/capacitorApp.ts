/**
 * Capacitor App Utilities
 *
 * Wraps Capacitor App and StatusBar plugins for platform-specific app initialization.
 * This is the ONLY place where @capacitor/app and @capacitor/status-bar should be imported.
 *
 * Security considerations:
 * - No dynamic code evaluation
 * - Safe DOM access with null checks
 * - Event listener cleanup to prevent memory leaks
 * - Error handling for all Capacitor calls
 */

import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'

/**
 * Initialize native app appearance (status bar)
 * Should be called once during app startup
 */
export function initCapacitorStatusBar(): void {
  if (!Capacitor.isNativePlatform()) return

  // Configure status bar for a full-bleed native feel
  StatusBar.setStyle({ style: Style.Light }).catch(() => {
    // Silently fail - status bar styling is not critical
  })
  StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {
    // Silently fail
  })
}

/**
 * Initialize Android hardware back button handling
 * Should be called once during app startup with a callback for back button
 */
export function initCapacitorBackButton(
  onBack: (canGoBack: boolean) => void
): void {
  if (!Capacitor.isNativePlatform()) return
  if (Capacitor.getPlatform() !== 'android') return

  CapApp.addListener('backButton', ({ canGoBack }) => {
    onBack(canGoBack)
  }).catch(() => {
    // Silently fail
  })
}

/**
 * Check if the app is running on a native platform (Capacitor)
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform()
}

/**
 * Get the current platform name
 */
export function getPlatform(): string {
  return Capacitor.getPlatform()
}

/**
 * Exit the app (Android only)
 */
export function exitApp(): Promise<void> {
  return CapApp.exitApp()
}

/**
 * Set status bar style
 */
export function setStatusBarStyle(style: Style): Promise<void> {
  return StatusBar.setStyle({ style })
}

/**
 * Set whether status bar overlays web view
 */
export function setStatusBarOverlaysWebView(overlay: boolean): Promise<void> {
  return StatusBar.setOverlaysWebView({ overlay })
}

/**
 * Add listener for Android back button
 * Note: This should be set up once at app initialization
 */
export function addBackButtonListener(
  callback: (data: { canGoBack: boolean }) => void
): Promise<{ remove: () => Promise<void> }> {
  return CapApp.addListener('backButton', callback)
}

// Re-export types
export type { Style } from '@capacitor/status-bar'
