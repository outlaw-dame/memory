import { ref } from 'vue'
import { buildApiHeaders, getApiBaseUrl } from '@/controller/http'
import { t } from '@/i18n'
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
      replyError.value = t('common.errors.notAuthenticated')
      return null
    }

    isResolving.value = true
    try {
      return await ky
        .post(`${getApiBaseUrl()}/replies/resolve`, {
          headers: buildApiHeaders({ authToken: token, includeJsonContentType: true }),
          json: { objectUri }
        })
        .json<ReplyPolicyResolution>()
    } catch (e) {
      if (e instanceof HTTPError) {
        replyError.value = t('reply.errors.loadPolicyStatus', { status: e.response.status })
      } else {
        replyError.value = t('reply.errors.loadPolicy')
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
      replyError.value = t('common.errors.notAuthenticated')
      return null
    }

    isSubmitting.value = true
    try {
      return await ky
        .post(`${getApiBaseUrl()}/replies`, {
          headers: buildApiHeaders({ authToken: token, includeJsonContentType: true }),
          json: { objectUri, content, isPublic }
        })
        .json<ReplySubmissionResult>()
    } catch (e) {
      if (e instanceof HTTPError) {
        replyError.value = t('reply.errors.submitStatus', { status: e.response.status })
      } else {
        replyError.value = t('reply.errors.submit')
      }
      return null
    } finally {
      isSubmitting.value = false
    }
  }

  return { resolvePolicy, submitReply, replyError, isResolving, isSubmitting }
}
