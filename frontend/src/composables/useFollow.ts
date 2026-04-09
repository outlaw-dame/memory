import { ref } from 'vue'
import ky, { HTTPError } from 'ky'

export function useFollow() {
  const followingSet = ref<Set<string>>(new Set())
  const followError = ref<string | null>(null)

  async function follow(objectUri: string): Promise<boolean> {
    followError.value = null
    const token = localStorage.getItem('token')
    if (!token) {
      followError.value = 'Not authenticated'
      return false
    }
    try {
      await ky.post(`${import.meta.env.VITE_API_URL}/follows`, {
        headers: { auth: token },
        json: { objectUri }
      })
      followingSet.value = new Set([...followingSet.value, objectUri])
      return true
    } catch (e) {
      if (e instanceof HTTPError) {
        followError.value = `Follow failed (${e.response.status})`
      } else {
        followError.value = 'Follow failed'
      }
      return false
    }
  }

  function isFollowing(objectUri: string): boolean {
    return followingSet.value.has(objectUri)
  }

  return { follow, isFollowing, followError }
}
