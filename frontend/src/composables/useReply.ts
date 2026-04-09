import { ref } from 'vue'
import ky, { HTTPError } from 'ky'

export interface ReplyPolicyResolution {
  objectUri: string
  mayReply: boolean
  requiresApproval: boolean
  canReplyIsSet: boolean
  authorityUri: string | null
  policyLabel: string
  reason: string
}

export interface ReplySubmissionResult {
  success: boolean
  pendingApproval: boolean
  policyLabel: string
  objectUri: string
}

export function useReply() {
  const replyError = ref<string | null>(null)
  const isResolving = ref(false)
  const isSubmitting = ref(false)

  async function resolvePolicy(objectUri: string): Promise<ReplyPolicyResolution | null> {
    replyError.value = null
    const token = localStorage.getItem('token')
    if (!token) {
      replyError.value = 'Not authenticated'
      return null
    }

    isResolving.value = true
    try {
      return await ky
        .post(`${import.meta.env.VITE_API_URL}/replies/resolve`, {
          headers: { auth: token },
          json: { objectUri }
        })
        .json<ReplyPolicyResolution>()
    } catch (e) {
      if (e instanceof HTTPError) {
        replyError.value = `Could not load reply policy (${e.response.status})`
      } else {
        replyError.value = 'Could not load reply policy'
      }
      return null
    } finally {
      isResolving.value = false
    }
  }

  async function submitReply(objectUri: string, content: string, isPublic = true): Promise<ReplySubmissionResult | null> {
    replyError.value = null
    const token = localStorage.getItem('token')
    if (!token) {
      replyError.value = 'Not authenticated'
      return null
    }

    isSubmitting.value = true
    try {
      return await ky
        .post(`${import.meta.env.VITE_API_URL}/replies`, {
          headers: { auth: token },
          json: { objectUri, content, isPublic }
        })
        .json<ReplySubmissionResult>()
    } catch (e) {
      if (e instanceof HTTPError) {
        replyError.value = `Reply failed (${e.response.status})`
      } else {
        replyError.value = 'Reply failed'
      }
      return null
    } finally {
      isSubmitting.value = false
    }
  }

  return { resolvePolicy, submitReply, replyError, isResolving, isSubmitting }
}
