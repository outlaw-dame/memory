<script setup lang="ts">
/**
 * ThreadSummary — Expandable thread context with lazy-loaded replies
 * 
 * Features:
 *   - Shows thread metadata (reply count, participants, last activity)
 *   - Expand button to fetch and display replies
 *   - Paginated reply loading with cursor
 *   - Reply list rendering
 */
import { ref, computed, watch } from 'vue'
import { useAtBridgeStore, type UnifiedFeedItem, type ThreadContextResponse } from '@/stores/atBridgeStore'
import { DateTime } from 'luxon'
import UnifiedFeedItemComponent from './UnifiedFeedItem.vue'

const props = defineProps<{
  item: UnifiedFeedItem
  rootUri: string
}>()

const emit = defineEmits<{
  hashtagClick: [hashtag: string]
}>()

const store = useAtBridgeStore()
const isExpanded = ref(false)
const threadContext = ref<ThreadContextResponse | null>(null)
const isLoadingThread = ref(false)
const threadError = ref<string | null>(null)

const replyCountDisplay = computed(() => {
  return threadContext.value?.replyCount ?? props.item.threadReplyCount ?? 0
})

const participantCountDisplay = computed(() => {
  return threadContext.value?.participantCount ?? props.item.threadParticipantCount ?? 0
})

const lastActivityDisplay = computed(() => {
  const rawValue = threadContext.value?.lastActivityAt ?? props.item.threadLastActivityAt
  if (!rawValue) return null
  try {
    return DateTime.fromISO(rawValue).toRelative()
  } catch {
    return null
  }
})

async function toggleExpand() {
  if (isExpanded.value) {
    isExpanded.value = false
    return
  }

  if (threadContext.value) {
    isExpanded.value = true
    return
  }

  await expandThread()
}

async function expandThread() {
  isLoadingThread.value = true
  threadError.value = null

  try {
    threadContext.value = await store.fetchThreadContext(props.rootUri, {
      limit: 5,
    })
    isExpanded.value = true
  } catch (err) {
    threadError.value = `Failed to load thread: ${err instanceof Error ? err.message : String(err)}`
    console.error('[ThreadSummary] expandThread error:', err)
  } finally {
    isLoadingThread.value = false
  }
}

async function loadMoreReplies() {
  if (!threadContext.value || !threadContext.value.hasMore) return

  isLoadingThread.value = true
  threadError.value = null

  try {
    const nextContext = await store.fetchThreadContext(props.rootUri, {
      limit: 5,
      cursor: threadContext.value.nextCursor ?? undefined,
    })

    if (threadContext.value && nextContext) {
      threadContext.value.items.push(...nextContext.items)
      threadContext.value.nextCursor = nextContext.nextCursor
      threadContext.value.hasMore = nextContext.hasMore
    }
  } catch (err) {
    threadError.value = `Failed to load more replies: ${err instanceof Error ? err.message : String(err)}`
    console.error('[ThreadSummary] loadMoreReplies error:', err)
  } finally {
    isLoadingThread.value = false
  }
}

watch(
  () => store.moderationRevision,
  async (revision, previousRevision) => {
    if (revision === previousRevision || !isExpanded.value) return

    const currentReplyCount = threadContext.value?.items.length ?? 0
    const refreshLimit = Math.min(50, Math.max(5, currentReplyCount || 5))

    isLoadingThread.value = true
    threadError.value = null

    try {
      threadContext.value = await store.fetchThreadContext(props.rootUri, {
        limit: refreshLimit,
        forceRefresh: true,
      })
    } catch (err) {
      threadError.value = `Failed to refresh thread: ${err instanceof Error ? err.message : String(err)}`
      console.error('[ThreadSummary] moderation refresh error:', err)
    } finally {
      isLoadingThread.value = false
    }
  },
)
</script>

<template>
  <div class="ThreadSummary flex flex-col gap-2">
    <!-- Thread metadata + expand button -->
    <div class="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg" style="background: rgba(99,100,246,0.06);">
      <div class="flex items-center gap-3">
        <!-- Metrics -->
        <div class="flex items-center gap-2">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="rgba(99,100,246,0.7)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span class="text-footnote font-semibold" style="color: rgb(99,100,246);">{{ replyCountDisplay }} {{ replyCountDisplay === 1 ? 'reply' : 'replies' }}</span>
        </div>

        <span class="text-footnote text-dark-20">·</span>

        <div class="flex items-center gap-1.5">
          <span class="text-caption text-dark-50">{{ participantCountDisplay }} {{ participantCountDisplay === 1 ? 'person' : 'people' }}</span>
        </div>

        <!-- Last activity -->
        <span v-if="lastActivityDisplay" class="text-caption text-dark-20">·</span>
        <span v-if="lastActivityDisplay" class="text-caption text-dark-50">{{ lastActivityDisplay }}</span>
      </div>

      <!-- Expand button -->
      <button
        :disabled="isLoadingThread"
        class="flex-shrink-0 rounded-full px-4 py-1.5 text-footnote font-semibold transition-opacity"
        :class="isExpanded
          ? 'text-white'
          : 'bg-white text-indigo-600 hover:bg-indigo-50 shadow-sm'"
        :style="isExpanded ? 'background: rgb(99,100,246);' : ''"
        @click="toggleExpand"
      >
        {{ isLoadingThread ? 'Loading…' : (isExpanded ? 'Hide' : 'View thread') }}
      </button>
    </div>

    <!-- Expanded thread context -->
    <div v-if="isExpanded && threadContext" class="flex flex-col gap-3 mt-2 pt-2 border-t border-dark-10">
      <!-- Error state -->
      <div v-if="threadError" class="rounded-lg bg-red-50 p-3 text-footnote text-red-700">
        {{ threadError }}
      </div>

      <!-- Reply items -->
      <template v-if="threadContext.items.length > 0">
        <div class="flex flex-col gap-3 pl-4 border-l-2 border-dark-10">
          <UnifiedFeedItemComponent
            v-for="reply in threadContext.items"
            :key="`${reply.source}-${reply.id}`"
            :item="reply"
            @hashtag-click="emit('hashtagClick', $event)"
          />
        </div>

        <!-- Load more button -->
        <div v-if="threadContext.hasMore" class="flex justify-center pt-2">
          <button
            :disabled="isLoadingThread"
            class="rounded-full px-4 py-2 text-footnote font-semibold transition-opacity hover:opacity-80"
            style="background: rgba(99,100,246,0.1); color: rgb(99,100,246);"
            @click="loadMoreReplies"
          >
            {{ isLoadingThread ? 'Loading…' : 'Load more replies' }}
          </button>
        </div>
      </template>

      <!-- Empty replies state -->
      <div v-else class="text-center py-4">
        <p class="text-footnote text-dark-50">No replies to show</p>
      </div>
    </div>

    <!-- Expand loading state (before first fetch) -->
    <div v-else-if="isLoadingThread" class="flex items-center justify-center gap-2 py-4">
      <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="rgba(99,100,246,0.6)" stroke-width="2">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-opacity="0.1" />
        <path d="M4 12a8 8 0 0 1 15.464-3.535" stroke="currentColor" />
      </svg>
      <span class="text-footnote text-dark-50">Loading thread…</span>
    </div>
  </div>
</template>

<style scoped>
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
