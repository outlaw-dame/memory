import { ref } from 'vue'
import { buildApiHeaders, getApiBaseUrl } from '@/controller/http'
import { t } from '@/i18n'
import ky, { HTTPError } from 'ky'

const isAbsoluteHttpsUrl = (value: string): boolean => {
  try {
    const u = new URL(value)
    return u.protocol === 'https:'
  } catch {
    return false
  }
}

export function useFollow() {
  const followingSet = ref<Set<string>>(new Set())
  const followError = ref<string | null>(null)

  async function follow(objectUri: string): Promise<boolean> {
    followError.value = null
    const token = localStorage.getItem('token')
    if (!token) {
      followError.value = t('common.errors.notAuthenticated')
      return false
    }
    if (!isAbsoluteHttpsUrl(objectUri)) {
      followError.value = t('follow.errors.invalidTarget')
      return false
    }
    try {
      await ky.post(`${getApiBaseUrl()}/follows`, {
        headers: buildApiHeaders({ authToken: token, includeJsonContentType: true }),
        json: { objectUri }
      })
      followingSet.value = new Set([...followingSet.value, objectUri])
      return true
    } catch (e) {
      if (e instanceof HTTPError) {
        followError.value = t('follow.errors.failedStatus', { status: e.response.status })
      } else {
        followError.value = t('follow.errors.failed')
      }
      return false
    }
  }

  function isFollowing(objectUri: string): boolean {
    return followingSet.value.has(objectUri)
  }

  return { follow, isFollowing, followError }
}
