import { usePlatform } from '@/composables/usePlatform'

export function useKonstaTheme(): 'ios' | 'material' {
  const platform = usePlatform()
  return platform.os === 'android' ? 'material' : 'ios'
}
