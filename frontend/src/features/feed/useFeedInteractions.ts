/**
 * useFeedInteractions - Composable for feed interaction state management
 *
 * Manages:
 * - Reply composer state
 * - Repost toggle state
 * - Like toggle state
 * - More actions sheet state
 * - Feed item interaction handlers
 */

import { ref, computed, type ComputedRef, type Ref } from 'vue'
import { useI18n } from '@/i18n'
import type { UnifiedFeedItem } from '@/stores/atBridgeStore'
import type { ReplyPolicyResolution, ReplySubmissionResult } from '@/composables/useReply'
import { useFollow } from '@/composables/useFollow'
import { useReply } from '@/composables/useReply'

interface FeedInteractionsState {
  isReplying: Ref<boolean>
  isMoreActionsOpen: Ref<boolean>
  isRepostProcessing: Ref<boolean>
  replyPolicy: Ref<ReplyPolicyResolution | null>
  replyError: Ref<string | null>
  isResolving: Ref<boolean>
  isSubmitting: Ref<boolean>
}

interface FeedInteractionsHandlers {
  openReplyComposer: () => Promise<void>
  closeReplyComposer: () => void
  onReplySubmit: (content: string) => Promise<void>
  onRepostClick: () => Promise<void>
  toggleMoreActions: () => void
  closeMoreActions: () => void
}

interface FeedInteractionsComputed {
  repostSummary: ComputedRef<string | null>
  repostCount: ComputedRef<number>
  viewerHasReposted: ComputedRef<boolean>
  repostLabel: ComputedRef<string>
}

interface FeedInteractionsFollow {
  isFollowing: (objectUri: string) => boolean
  follow: (objectUri: string) => Promise<boolean>
}

interface FeedInteractionsConfig {
  item: UnifiedFeedItem
  emit: {
    hashtagClick: (hashtag: string) => void
    repostToggle: (item: UnifiedFeedItem) => void
  }
}

export function useFeedInteractions(config: FeedInteractionsConfig): FeedInteractionsState & FeedInteractionsHandlers & FeedInteractionsComputed & FeedInteractionsFollow {
  const { follow, isFollowing } = useFollow()
  const { resolvePolicy, submitReply, replyError: useReplyError, isResolving, isSubmitting } = useReply()
  const { t } = useI18n()

  // Individual refs for reactive state
  const isReplying = ref(false)
  const isMoreActionsOpen = ref(false)
  const isRepostProcessing = ref(false)
  const replyPolicy = ref<ReplyPolicyResolution | null>(null)
  const replyError = ref<string | null>(null)

  // Computed properties
  const repostGroup = computed(() => config.item.repostGroup ?? null)
  const repostCount = computed(() => config.item.repostCount ?? repostGroup.value?.count ?? 0)
  const viewerHasReposted = computed(() => config.item.viewerHasReposted || repostGroup.value?.viewerHasReposted === true)
  const repostLabel = computed(() => (viewerHasReposted.value ? t('feed.reposts.reposted') : t('feed.reposts.action')))

  const repostSummary = computed(() => {
    const group = repostGroup.value
    if (!group || group.count <= 0 || group.actors.length === 0) return null

    const names = group.actors.map(actor => actor.displayName)
    if (group.count === 1) {
      return t('feed.reposts.byOne', { name: names[0] })
    }

    if (group.count === 2 && names.length >= 2) {
      return t('feed.reposts.byTwo', { first: names[0], second: names[1] })
    }

    const visibleNames = names.slice(0, 2).join(', ')
    const remainingCount = Math.max(1, group.count - Math.min(2, names.length))
    return t('feed.reposts.byMany', { names: visibleNames, count: remainingCount })
  })

  // Handlers
  async function openReplyComposer() {
    if (!config.item.objectUri) return
    isReplying.value = true
    replyPolicy.value = await resolvePolicy(config.item.objectUri)
    isResolving.value = isResolving.value // Mirror useReply's isResolving state
  }

  function closeReplyComposer() {
    isReplying.value = false
    replyPolicy.value = null
    replyError.value = null
  }

  async function onReplySubmit(content: string) {
    if (!config.item.objectUri) return
    const result = await submitReply(config.item.objectUri, content, true)
    if (result) {
      // Close composer on successful submit
      closeReplyComposer()
    }
    replyError.value = useReplyError.value // Mirror useReply's replyError state
  }

  async function onRepostClick() {
    if (isRepostProcessing.value) return
    isRepostProcessing.value = true
    config.emit.repostToggle(config.item)
    // Reset processing state after a short delay
    setTimeout(() => {
      isRepostProcessing.value = false
    }, 350)
  }

  function toggleMoreActions() {
    isMoreActionsOpen.value = !isMoreActionsOpen.value
  }

  function closeMoreActions() {
    isMoreActionsOpen.value = false
  }

  return {
    // State refs
    isReplying,
    isMoreActionsOpen,
    isRepostProcessing,
    replyPolicy,
    replyError,
    
    // Re-export useReply refs
    isResolving,
    isSubmitting,
    
    // Computed properties
    repostSummary,
    repostCount,
    viewerHasReposted,
    repostLabel,
    
    // Handlers
    openReplyComposer,
    closeReplyComposer,
    onReplySubmit,
    onRepostClick,
    toggleMoreActions,
    closeMoreActions,
    
    // Follow utilities
    isFollowing,
    follow,
  }
}

export type { FeedInteractionsState, FeedInteractionsHandlers, FeedInteractionsConfig, FeedInteractionsComputed, FeedInteractionsFollow }
