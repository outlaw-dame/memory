import { getPlatformCapabilities, type PlatformCapabilities } from '@/platform/capabilities'

let _cached: PlatformCapabilities | null = null

export function usePlatform(): PlatformCapabilities {
  if (!_cached) _cached = getPlatformCapabilities()
  return _cached
}
