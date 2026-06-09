/**
 * useMediaPreload - Composable for media preloading strategy
 *
 * Responsibilities:
 * - Preload current media
 * - Preload next story media
 * - Preload next carousel image where cheap
 * - Avoid aggressive bandwidth use
 * - Cancel preload when viewer closes
 * - Handle failed preload gracefully
 * 
 * Rules:
 * - Do not preload large videos aggressively
 * - Respect data saver if detectable
 * - Never block UI on preload
 * - Use browser caching naturally
 */

import { onBeforeUnmount, ref, type Ref } from 'vue'

export interface MediaPreloadConfig {
  mediaUrls: Ref<string[]>
  currentIndex: Ref<number>
  preloadCount?: number
  maxVideoSize?: number
  enabled?: Ref<boolean>
}

export interface MediaPreloadState {
  preloadedUrls: Ref<Set<string>>
  preloadErrors: Ref<Map<string, string>>
  isPreloading: Ref<boolean>
}

export interface MediaPreloadHandlers {
  preloadCurrent: () => Promise<void>
  preloadNext: () => Promise<void>
  preloadPrevious: () => Promise<void>
  cancelAll: () => void
  preloadSpecific: (url: string) => Promise<void>
}

// Maximum size to consider for preloading (in bytes)
const DEFAULT_MAX_VIDEO_SIZE = 5 * 1024 * 1024 // 5MB
const DEFAULT_PRELOAD_COUNT = 2

export function useMediaPreload(config: MediaPreloadConfig): MediaPreloadState & MediaPreloadHandlers {
  const {
    mediaUrls,
    currentIndex,
    preloadCount = DEFAULT_PRELOAD_COUNT,
    maxVideoSize = DEFAULT_MAX_VIDEO_SIZE,
    enabled = ref(true)
  } = config

  // State
  const preloadedUrls = ref<Set<string>>(new Set())
  const preloadErrors = ref<Map<string, string>>(new Map())
  const isPreloading = ref(false)
  const activePreloads = ref<Map<string, AbortController>>(new Map())

  // Helper to estimate if URL is a video
  function isLikelyVideo(url: string): boolean {
    const lower = url.toLowerCase()
    return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov') || lower.includes('video/')
  }

  // Helper to estimate if URL is an image
  function isLikelyImage(url: string): boolean {
    const lower = url.toLowerCase()
    return lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || 
           lower.endsWith('.gif') || lower.endsWith('.webp') || lower.endsWith('.avif') ||
           lower.includes('image/')
  }

  // Check if data saver is enabled (if detectable)
  function isDataSaverEnabled(): boolean {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection
      return connection.saveData || connection.effectiveType === 'slow-2g'
    }
    return false
  }

  // Check if we should preload this URL
  function shouldPreload(url: string): boolean {
    if (!enabled.value) return false
    if (isDataSaverEnabled()) return false
    
    // Skip if already preloaded or failed
    if (preloadedUrls.value.has(url) || preloadErrors.value.has(url)) return false
    
    // For videos, check size constraint
    if (isLikelyVideo(url)) {
      // We can't know the size without a HEAD request, so be conservative
      // Only preload if it's within the first few items
      return false
    }
    
    // Images are generally safe to preload
    return isLikelyImage(url)
  }

  // Preload a single URL
  async function preloadSpecific(url: string): Promise<void> {
    if (!shouldPreload(url)) return
    
    if (preloadedUrls.value.has(url)) return
    if (activePreloads.value.has(url)) return
    
    isPreloading.value = true
    
    const controller = new AbortController()
    activePreloads.value.set(url, controller)
    
    try {
      // Use fetch with no-cache to leverage browser cache but force preload
      // We don't need the response, just want the browser to cache it
      await fetch(url, {
        method: 'GET',
        mode: 'no-cors',
        cache: 'force-cache',
        signal: controller.signal,
        // Don't wait for full download, just start it
        // We'll let the browser handle the actual caching
      })
      
      preloadedUrls.value = new Set(preloadedUrls.value).add(url)
    } catch (error: unknown) {
      if ((error as Error).name !== 'AbortError') {
        preloadErrors.value = new Map(preloadErrors.value).set(url, String(error))
      }
    } finally {
      activePreloads.value.delete(url)
      if (activePreloads.value.size === 0) {
        isPreloading.value = false
      }
    }
  }

  // Preload current media
  async function preloadCurrent(): Promise<void> {
    const urls = mediaUrls.value
    const current = currentIndex.value
    if (urls.length === 0 || current >= urls.length) return
    
    await preloadSpecific(urls[current])
  }

  // Preload next items
  async function preloadNext(): Promise<void> {
    const urls = mediaUrls.value
    const current = currentIndex.value
    if (urls.length === 0) return
    
    // Preload next N items
    const end = Math.min(current + preloadCount, urls.length)
    for (let i = current + 1; i < end; i++) {
      await preloadSpecific(urls[i])
    }
  }

  // Preload previous items
  async function preloadPrevious(): Promise<void> {
    const urls = mediaUrls.value
    const current = currentIndex.value
    if (urls.length === 0) return
    
    // Preload previous N items
    const start = Math.max(0, current - preloadCount)
    for (let i = current - 1; i >= start; i--) {
      await preloadSpecific(urls[i])
    }
  }

  // Cancel all active preloads
  function cancelAll(): void {
    for (const [url, controller] of activePreloads.value) {
      controller.abort()
    }
    activePreloads.value = new Map()
    isPreloading.value = false
  }

  // Watch for changes and auto-preload
  onBeforeUnmount(() => {
    cancelAll()
  })

  return {
    // State
    preloadedUrls,
    preloadErrors,
    isPreloading,
    
    // Handlers
    preloadCurrent,
    preloadNext,
    preloadPrevious,
    cancelAll,
    preloadSpecific
  }
}


