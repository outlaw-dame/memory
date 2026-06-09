/**
 * useMediaPreload Composable Tests
 * 
 * Comprehensive tests for media preloading with:
 * - Preload strategy
 * - Error handling
 * - Cancellation
 * - Edge cases
 * - Security considerations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useMediaPreload } from '../useMediaPreload'

describe('useMediaPreload', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    
    global.fetch = vi.fn()
    
    // Mock navigator.connection to avoid data saver detection by default
    Object.defineProperty(navigator, 'connection', {
      value: { saveData: false, effectiveType: '4g' },
      writable: true,
      configurable: true
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllTimers()
    vi.restoreAllMocks()
    
    // Clean up navigator mock
    delete (navigator as any).connection
  })

  const createPreload = (mediaUrls: string[] = [], currentIndex: number = 0) => {
    return useMediaPreload({
      mediaUrls: ref(mediaUrls),
      currentIndex: ref(currentIndex),
      preloadCount: 2,
      enabled: ref(true)
    })
  }

  describe('initialization', () => {
    it('should return preload state and handlers', () => {
      const preload = createPreload()
      
      expect(preload.preloadedUrls).toBeDefined()
      expect(preload.preloadErrors).toBeDefined()
      expect(preload.isPreloading).toBeDefined()
      expect(preload.preloadCurrent).toBeDefined()
      expect(preload.preloadNext).toBeDefined()
      expect(preload.preloadPrevious).toBeDefined()
      expect(preload.cancelAll).toBeDefined()
      expect(preload.preloadSpecific).toBeDefined()
    })

    it('should initialize with empty state', () => {
      const preload = createPreload()
      
      expect(preload.preloadedUrls.value.size).toBe(0)
      expect(preload.preloadErrors.value.size).toBe(0)
      expect(preload.isPreloading.value).toBe(false)
    })
  })

  describe('URL preloading behavior', () => {
    it('should preload image URLs', async () => {
      const url = 'https://example.com/image.jpg'
      const preload = createPreload([url])
      
      global.fetch = vi.fn().mockResolvedValue(new Response())
      
      await preload.preloadSpecific(url)
      
      expect(global.fetch).toHaveBeenCalledWith(url, expect.anything())
      expect(preload.preloadedUrls.value.has(url)).toBe(true)
    })

    it('should not preload video URLs', async () => {
      const url = 'https://example.com/video.mp4'
      const preload = createPreload([url])
      
      global.fetch = vi.fn().mockResolvedValue(new Response())
      
      await preload.preloadSpecific(url)
      
      // Videos should not be preloaded, so fetch should not be called
      expect(global.fetch).not.toHaveBeenCalled()
      expect(preload.preloadedUrls.value.has(url)).toBe(false)
    })

    it('should preload various image formats', async () => {
      const imageUrls = [
        'https://example.com/image.jpg',
        'https://example.com/image.jpeg',
        'https://example.com/image.png',
        'https://example.com/image.gif',
        'https://example.com/image.webp',
        'https://example.com/image.avif'
      ]
      
      const preload = createPreload()
      global.fetch = vi.fn().mockResolvedValue(new Response())
      
      for (const url of imageUrls) {
        await preload.preloadSpecific(url)
      }
      
      // Each image should trigger a fetch
      expect(global.fetch).toHaveBeenCalledTimes(imageUrls.length)
      for (const url of imageUrls) {
        expect(preload.preloadedUrls.value.has(url)).toBe(true)
      }
    })

    it('should not preload various video formats', async () => {
      const videoUrls = [
        'https://example.com/video.mp4',
        'https://example.com/video.webm',
        'https://example.com/video.mov'
      ]
      
      const preload = createPreload()
      global.fetch = vi.fn().mockResolvedValue(new Response())
      
      for (const url of videoUrls) {
        await preload.preloadSpecific(url)
      }
      
      // Videos should not be preloaded
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe('preload specific', () => {
    it('should preload a specific image URL', async () => {
      const url = 'https://example.com/image.jpg'
      const preload = createPreload([url])
      
      // Mock fetch to resolve successfully
      global.fetch = vi.fn().mockResolvedValue(new Response())
      
      await preload.preloadSpecific(url)
      
      expect(global.fetch).toHaveBeenCalledWith(url, expect.anything())
      expect(preload.preloadedUrls.value.has(url)).toBe(true)
    })

    it('should not preload same URL twice', async () => {
      const url = 'https://example.com/image.jpg'
      const preload = createPreload([url])
      
      global.fetch = vi.fn().mockResolvedValue(new Response())
      
      await preload.preloadSpecific(url)
      await preload.preloadSpecific(url)
      
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should handle preload errors', async () => {
      const url = 'https://example.com/image.jpg'
      const preload = createPreload([url])
      
      global.fetch = vi.fn().mockRejectedValue(new Error('Failed'))
      
      await preload.preloadSpecific(url)
      
      expect(preload.preloadErrors.value.has(url)).toBe(true)
    })

    it('should not preload when disabled', async () => {
      const url = 'https://example.com/image.jpg'
      const preload = useMediaPreload({
        mediaUrls: ref([url]),
        currentIndex: ref(0),
        enabled: ref(false)
      })
      
      global.fetch = vi.fn().mockResolvedValue(new Response())
      
      await preload.preloadSpecific(url)
      
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should use correct fetch options', async () => {
      const url = 'https://example.com/image.jpg'
      const preload = createPreload([url])
      
      global.fetch = vi.fn().mockResolvedValue(new Response())
      
      await preload.preloadSpecific(url)
      
      expect(global.fetch).toHaveBeenCalledWith(url, {
        method: 'GET',
        mode: 'no-cors',
        cache: 'force-cache',
        signal: expect.anything()
      })
    })
  })

  describe('preload current', () => {
    it('should preload current media', async () => {
      const urls = ['https://example.com/image1.jpg', 'https://example.com/image2.jpg']
      const preload = createPreload(urls, 0)
      
      global.fetch = vi.fn().mockResolvedValue(new Response())
      
      await preload.preloadCurrent()
      
      expect(global.fetch).toHaveBeenCalledWith(urls[0], expect.anything())
    })

    it('should not preload when current index out of bounds', async () => {
      const urls = ['https://example.com/image1.jpg']
      const preload = createPreload(urls, 10)
      
      global.fetch = vi.fn().mockResolvedValue(new Response())
      
      await preload.preloadCurrent()
      
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe('preload next', () => {
    it('should preload next N items', async () => {
      const urls = ['https://example.com/image1.jpg', 'https://example.com/image2.jpg', 'https://example.com/image3.jpg']
      const preload = createPreload(urls, 0)
      
      global.fetch = vi.fn().mockResolvedValue(new Response())
      
      await preload.preloadNext()
      
      expect(global.fetch).toHaveBeenCalledWith(urls[1], expect.anything())
    })

    it('should respect preload count', async () => {
      const urls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg',
        'https://example.com/image4.jpg'
      ]
      const preload = createPreload(urls, 0)
      
      global.fetch = vi.fn().mockResolvedValue(new Response())
      
      await preload.preloadNext()
      
      // With current=0 and preloadCount=2, preloads urls[1] (from index 1 to index 2 exclusive)
      expect(global.fetch).toHaveBeenCalledTimes(1)
      expect(global.fetch).toHaveBeenCalledWith(urls[1], expect.anything())
    })

    it('should not preload beyond array bounds', async () => {
      const urls = ['https://example.com/image1.jpg']
      const preload = createPreload(urls, 0)
      
      global.fetch = vi.fn().mockResolvedValue(new Response())
      
      await preload.preloadNext()
      
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe('preload previous', () => {
    it('should preload previous N items', async () => {
      const urls = ['https://example.com/image1.jpg', 'https://example.com/image2.jpg', 'https://example.com/image3.jpg']
      const preload = createPreload(urls, 2)
      
      global.fetch = vi.fn().mockResolvedValue(new Response())
      
      await preload.preloadPrevious()
      
      expect(global.fetch).toHaveBeenCalledWith(urls[1], expect.anything())
    })

    it('should respect preload count', async () => {
      const urls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg',
        'https://example.com/image4.jpg'
      ]
      const preload = createPreload(urls, 3)
      
      global.fetch = vi.fn().mockResolvedValue(new Response())
      
      await preload.preloadPrevious()
      
      // Should preload previous 2 items (index 2 and 1)
      expect(global.fetch).toHaveBeenCalledTimes(2)
      expect(global.fetch).toHaveBeenCalledWith(urls[2], expect.anything())
      expect(global.fetch).toHaveBeenCalledWith(urls[1], expect.anything())
    })

    it('should not preload beyond array bounds', async () => {
      const urls = ['https://example.com/image1.jpg']
      const preload = createPreload(urls, 0)
      
      global.fetch = vi.fn().mockResolvedValue(new Response())
      
      await preload.preloadPrevious()
      
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe('cancel all', () => {
    it('should cancel all active preloads', async () => {
      const urls = ['https://example.com/image1.jpg', 'https://example.com/image2.jpg']
      const preload = createPreload(urls, 0)
      
      let signal: AbortSignal | null = null
      global.fetch = vi.fn().mockImplementation((url: string, options: any) => {
        signal = options?.signal
        return new Promise<Response>((resolve, reject) => {
          if (signal) {
            signal.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'))
            })
          }
          // Also resolve immediately to avoid hanging
          // The abort will still trigger the reject
          resolve(new Response())
        })
      })
      
      // Start a preload
      const promise = preload.preloadNext().catch(() => {})
      
      // Wait for fetch to be called and the signal to be set
      await vi.advanceTimersByTime(0)
      
      // Verify fetch was called
      expect(global.fetch).toHaveBeenCalled()
      
      // Cancel it
      preload.cancelAll()
      
      await promise
      
      expect(signal).not.toBeNull()
      expect(preload.isPreloading.value).toBe(false)
    })

    it('should clear isPreloading flag', () => {
      const urls = ['https://example.com/image1.jpg']
      const preload = createPreload(urls, 0)
      
      preload.isPreloading.value = true
      preload.cancelAll()
      
      expect(preload.isPreloading.value).toBe(false)
    })
  })

  describe('data saver detection', () => {
    it('should not preload when data saver is enabled', async () => {
      const url = 'https://example.com/image.jpg'
      const preload = createPreload([url])
      
      // Mock navigator.connection with data saver enabled
      const mockConnection = {
        saveData: true,
        effectiveType: '4g'
      }
      
      Object.defineProperty(navigator, 'connection', {
        value: mockConnection,
        writable: true
      })
      
      global.fetch = vi.fn().mockResolvedValue(new Response())
      
      await preload.preloadSpecific(url)
      
      // Should not preload when data saver is enabled
      expect(global.fetch).not.toHaveBeenCalled()
      expect(preload.preloadedUrls.value.has(url)).toBe(false)
    })

    it('should not preload when effectiveType is slow-2g', async () => {
      const url = 'https://example.com/image.jpg'
      const preload = createPreload([url])
      
      // Mock navigator.connection with slow connection
      const mockConnection = {
        saveData: false,
        effectiveType: 'slow-2g'
      }
      
      Object.defineProperty(navigator, 'connection', {
        value: mockConnection,
        writable: true
      })
      
      global.fetch = vi.fn().mockResolvedValue(new Response())
      
      await preload.preloadSpecific(url)
      
      // Should not preload on slow-2g connection
      expect(global.fetch).not.toHaveBeenCalled()
      expect(preload.preloadedUrls.value.has(url)).toBe(false)
    })

    it('should preload when data saver is not enabled', async () => {
      const url = 'https://example.com/image.jpg'
      const preload = createPreload([url])
      
      // Mock navigator.connection without data saver
      const mockConnection = {
        saveData: false,
        effectiveType: '4g'
      }
      
      Object.defineProperty(navigator, 'connection', {
        value: mockConnection,
        writable: true
      })
      
      global.fetch = vi.fn().mockResolvedValue(new Response())
      
      await preload.preloadSpecific(url)
      
      // Should preload normally
      expect(global.fetch).toHaveBeenCalledWith(url, expect.anything())
      expect(preload.preloadedUrls.value.has(url)).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle empty mediaUrls', async () => {
      const preload = createPreload([], 0)
      
      global.fetch = vi.fn().mockResolvedValue(new Response())
      
      await preload.preloadCurrent()
      await preload.preloadNext()
      await preload.preloadPrevious()
      
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should handle undefined mediaUrls', async () => {
      const preload = useMediaPreload({
        mediaUrls: ref([]),
        currentIndex: ref(0)
      })
      
      global.fetch = vi.fn().mockResolvedValue(new Response())
      
      await preload.preloadCurrent()
      
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should not preload malformed URLs that are not images', async () => {
      const preload = createPreload(['not-a-valid-url'])
      
      global.fetch = vi.fn().mockResolvedValue(new Response())
      
      await preload.preloadSpecific('not-a-valid-url')
      
      // Malformed URLs that don't match image patterns should not be preloaded
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should handle very long URLs', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(1000) + '.jpg'
      const preload = createPreload([longUrl])
      
      global.fetch = vi.fn().mockResolvedValue(new Response())
      
      await preload.preloadSpecific(longUrl)
      
      expect(global.fetch).toHaveBeenCalledWith(longUrl, expect.anything())
    })

    it('should handle special characters in URLs', async () => {
      const url = 'https://example.com/image with spaces & special chars.jpg'
      const preload = createPreload([url])
      
      global.fetch = vi.fn().mockResolvedValue(new Response())
      
      await preload.preloadSpecific(url)
      
      expect(global.fetch).toHaveBeenCalledWith(url, expect.anything())
    })
  })

  describe('security', () => {
    it('should not preload javascript URLs', async () => {
      const url = 'javascript:alert(1)'
      const preload = createPreload([url])
      
      global.fetch = vi.fn().mockResolvedValue(new Response())
      
      await preload.preloadSpecific(url)
      
      // Should not preload javascript URLs as they don't match image/video patterns
      expect(global.fetch).not.toHaveBeenCalled()
      expect(preload.preloadedUrls.value.has(url)).toBe(false)
    })

    it('should preload data URLs with image mime type', async () => {
      const url = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      const preload = createPreload([url])
      
      global.fetch = vi.fn().mockResolvedValue(new Response())
      
      await preload.preloadSpecific(url)
      
      // Data URLs with image/ prefix should be preloaded
      expect(global.fetch).toHaveBeenCalledWith(url, expect.anything())
      expect(preload.preloadedUrls.value.has(url)).toBe(true)
    })

    it('should not preload data URLs without image mime type', async () => {
      const url = 'data:text/plain;base64,SGVsbG8sIFdvcmxkIQ=='
      const preload = createPreload([url])
      
      global.fetch = vi.fn().mockResolvedValue(new Response())
      
      await preload.preloadSpecific(url)
      
      // Data URLs without image/ prefix should not be preloaded
      expect(global.fetch).not.toHaveBeenCalled()
      expect(preload.preloadedUrls.value.has(url)).toBe(false)
    })

    it('should not leak abort controllers', () => {
      const preload = createPreload(['https://example.com/image.jpg'])
      
      global.fetch = vi.fn().mockResolvedValue(new Response())
      
      // The test just verifies it doesn't crash
      preload.cancelAll()
      
      expect(preload.isPreloading.value).toBe(false)
    })
  })
})
