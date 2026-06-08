import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

export { ImpactStyle, NotificationType }

const isNative = Capacitor.isNativePlatform()

async function impact(style: ImpactStyle = ImpactStyle.Light): Promise<void> {
  if (!isNative) return
  await Haptics.impact({ style }).catch(() => {})
}

async function notification(type: NotificationType = NotificationType.Success): Promise<void> {
  if (!isNative) return
  await Haptics.notification({ type }).catch(() => {})
}

async function selectionChanged(): Promise<void> {
  if (!isNative) return
  await Haptics.selectionChanged().catch(() => {})
}

export function useHaptics() {
  return { impact, notification, selectionChanged }
}
