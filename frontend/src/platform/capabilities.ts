export type PlatformOs = 'ios' | 'android' | 'macos' | 'windows' | 'linux' | 'unknown'

export interface PlatformCapabilities {
  os: PlatformOs
  isMobile: boolean
  isStandalone: boolean
  supportsBadging: boolean
  supportsShare: boolean
  supportsFileShare: boolean
  supportsNotifications: boolean
  supportsInstallPrompt: boolean
}

interface UserAgentDataLike {
  platform?: string
  mobile?: boolean
}

function getUserAgentData(): UserAgentDataLike | undefined {
  return (navigator as Navigator & { userAgentData?: UserAgentDataLike }).userAgentData
}

function detectOs(): PlatformOs {
  const userAgentData = getUserAgentData()
  const platform = userAgentData?.platform || navigator.platform || ''
  const userAgent = navigator.userAgent || ''
  const touchPoints = navigator.maxTouchPoints || 0

  if (/android/i.test(userAgent) || /android/i.test(platform)) return 'android'
  if (/iPad|iPhone|iPod/i.test(userAgent)) return 'ios'
  if (/Mac/i.test(platform) && touchPoints > 1) return 'ios'
  if (/Mac/i.test(platform)) return 'macos'
  if (/Win/i.test(platform)) return 'windows'
  if (/Linux/i.test(platform)) return 'linux'

  return 'unknown'
}

function isStandaloneDisplay(): boolean {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }
  return navigatorWithStandalone.standalone === true || window.matchMedia('(display-mode: standalone)').matches
}

function canShareFiles(): boolean {
  if (!('canShare' in navigator)) return false
  try {
    const file = new File([''], 'memory.txt', { type: 'text/plain' })
    return navigator.canShare?.({ files: [file] }) === true
  } catch {
    return false
  }
}

export function getPlatformCapabilities(): PlatformCapabilities {
  const os = detectOs()
  const userAgentData = getUserAgentData()
  const isMobile = userAgentData?.mobile ?? (os === 'ios' || os === 'android')

  return {
    os,
    isMobile,
    isStandalone: isStandaloneDisplay(),
    supportsBadging: 'setAppBadge' in navigator && 'clearAppBadge' in navigator,
    supportsShare: 'share' in navigator,
    supportsFileShare: canShareFiles(),
    supportsNotifications: 'Notification' in window,
    supportsInstallPrompt: os === 'android' || os === 'windows' || os === 'linux'
  }
}

export function applyPlatformCapabilities(): PlatformCapabilities {
  const capabilities = getPlatformCapabilities()
  const root = document.documentElement

  root.dataset.platformOs = capabilities.os
  root.dataset.platformMobile = String(capabilities.isMobile)
  root.dataset.platformStandalone = String(capabilities.isStandalone)
  root.classList.add(`platform-${capabilities.os}`)
  root.classList.toggle('platform-mobile', capabilities.isMobile)
  root.classList.toggle('platform-standalone', capabilities.isStandalone)

  return capabilities
}
