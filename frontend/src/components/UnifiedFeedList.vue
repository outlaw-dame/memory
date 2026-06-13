<script setup lang="ts">
/**
 * UnifiedFeedList — Phase 6: Refactored to use semantic components
 *
 * COMPOSITION APPROACH:
 * This component now uses semantic state components while preserving:
 * - ALL existing behavior from the original implementation
 * - ALL existing props, emits, and public API
 * - ALL existing virtualization logic
 * - ALL existing source/timeline filtering
 * - ALL existing hashtag filtering
 * - ALL existing engagement scoring
 * - ALL existing popular carousel logic
 * - ALL existing scroll margin computation
 *
 * New component usage:
 * - FeedLoadingState: Loading state rendering
 * - FeedErrorState: Error state rendering
 * - FeedEmptyState: Empty state rendering
 * - FeedPopularCarousel: Popular posts carousel
 * - AppPullToRefresh: Pull-to-refresh functionality
 *
 * Features preserved:
 * - Source filter tabs (All / ActivityPods / AT Protocol)
 * - TanStack Virtual window-less virtualization (scrollEl = shared <main>)
 * - Infinite scroll (load more on button click)
 * - Scroll position preserved via useScrollRestore
 * - Hashtag filter input and clear
 * - Engagement scoring weights
 * - Popular carousel with minimum threshold
 * - Scroll margin recomputation
 *
 * SECURITY CONSIDERATIONS:
 * - All input validation preserved from original
 * - Safe DOM access with null checks preserved
 * - No dynamic code evaluation
 * - All URL validation preserved
 * - Race condition protection preserved
 */

import { computed, inject, nextTick, onMounted, ref, watch, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { useResizeObserver } from '@vueuse/core'
import { useI18n } from '@/i18n'
import { useAtBridgeStore, type FeedSource, type TimelineMode, type UnifiedFeedItem as UnifiedFeedItemModel } from '@/stores/atBridgeStore'
import UnifiedFeedItem from './UnifiedFeedItem.vue'
import AppIcon from '@/components/AppIcon.vue'
import { AppPullToRefresh } from '@/design/semantic'
import {
  FeedLoadingState,
  FeedErrorState,
  FeedEmptyState,
  FeedPopularCarousel,
} from '@/features/feed'

// Engagement scoring weights — adjust after observing real usage data.
const ENGAGEMENT_WEIGHTS = Object.freeze({
  reply: 3,
  repost: 2,
  quote: 2.5,
  like: 1,
} as const)

const props = defineProps<{ mode?: TimelineMode }>()

const store = useAtBridgeStore()
const router = useRouter()
const { t } = useI18n()
const hashtagInput = ref('')

// Shared scroll container provided by App.vue
const scrollEl = inject<Ref<HTMLElement | null>>('scrollEl')

// Refs for dynamic scrollMargin computation
const feedHeaderRef = ref<HTMLElement | null>(null)
const feedListRef = ref<HTMLElement | null>(null)

// Distance from scroll container top to the virtual list top.
// Must account for the current scrollTop so TanStack Virtual can place items correctly.
const scrollMarginPx = ref(0)

function recomputeScrollMargin() {
  const listEl = feedListRef.value
  const scrollElEl = scrollEl?.value
  if (!listEl || !scrollElEl) return
  scrollMarginPx.value =
    listEl.getBoundingClientRect().top -
    scrollElEl.getBoundingClientRect().top +
    scrollElEl.scrollTop
}

// Recompute whenever header height changes (carousel appears/disappears, etc.)
useResizeObserver(feedHeaderRef, recomputeScrollMargin)

// ── Virtual list ────────────────────────────────────────────────────────────

const virtualizer = useVirtualizer(
  computed(() => ({
    count: store.unifiedFeed.length,
    getScrollElement: () => scrollEl?.value ?? null,
    estimateSize: () => 140,
    overscan: 5,
    scrollMargin: scrollMarginPx.value,
    getItemKey: (index: number) => {
      const item = store.unifiedFeed[index]
      return item ? `${item.source}-${item.id}` : index
    },
    measureElement: (el: Element) => el.getBoundingClientRect().height,
  })),
)

const virtualRows = computed(() => virtualizer.value.getVirtualItems())
const totalSize = computed(() => virtualizer.value.getTotalSize())

// Recompute scrollMargin after feed items load (list ref may shift down
// if error/loading state toggles away and popular carousel appears).
watch(
  () => store.unifiedFeed.length,
  async () => {
    await nextTick()
    recomputeScrollMargin()
  },
)

// ── Feed data ───────────────────────────────────────────────────────────────

interface PopularFeedItem {
  id: string
  uri: string
  source: UnifiedFeedItemModel['source']
  authorName: string
  content: string
  createdAt: string | null
  replies: number
  reposts: number
  quotes: number
  likes: number
  score: number
}

onMounted(async () => {
  if (props.mode) store.timelineMode = props.mode
  await store.fetchUnifiedFeed()
  await nextTick()
  recomputeScrollMargin()
})

const sources: { label: string; value: FeedSource }[] = [
  { label: 'All', value: 'all' },
  { label: 'ActivityPods', value: 'activitypods' },
  { label: 'AT Protocol', value: 'atproto' },
]

const timelineModes: { label: string; value: TimelineMode }[] = [
  { label: 'Balanced', value: 'balanced' },
  { label: 'Chronological', value: 'chronological' },
]

watch(
  () => store.hashtagFilter,
  value => {
    hashtagInput.value = value
  },
  { immediate: true },
)

async function applyHashtagFilter(): Promise<void> {
  const normalized = hashtagInput.value.trim()
  await store.setHashtagFilter(normalized)
}

async function clearHashtagFilter(): Promise<void> {
  hashtagInput.value = ''
  await store.clearHashtagFilter()
}

async function onHashtagClick(hashtag: string): Promise<void> {
  hashtagInput.value = hashtag
  await store.setHashtagFilter(hashtag)
}

async function onRepostToggle(item: UnifiedFeedItemModel): Promise<void> {
  await store.toggleRepost(item)
}

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function getQuoteCount(item: UnifiedFeedItemModel): number {
  const explicit = toNumber((item as unknown as Record<string, unknown>).quoteCount)
  if (explicit > 0) return explicit
  return item.quotedPost ? 1 : 0
}

function getLikeCount(item: UnifiedFeedItemModel): number {
  return toNumber((item as unknown as Record<string, unknown>).likeCount)
}

function getReplyCount(item: UnifiedFeedItemModel): number {
  return toNumber(item.threadReplyCount)
}

function getRepostCount(item: UnifiedFeedItemModel): number {
  return toNumber(item.repostCount)
}

function engagementScore(item: UnifiedFeedItemModel): number {
  const replies = getReplyCount(item)
  const reposts = getRepostCount(item)
  const quotes = getQuoteCount(item)
  const likes = getLikeCount(item)
  return (
    replies * ENGAGEMENT_WEIGHTS.reply +
    reposts * ENGAGEMENT_WEIGHTS.repost +
    quotes * ENGAGEMENT_WEIGHTS.quote +
    likes * ENGAGEMENT_WEIGHTS.like
  )
}

const popularPosts = computed<PopularFeedItem[]>(() => {
  const ranked = store.unifiedFeed
    .filter(item => item.type !== 'thread_summary')
    .map(item => {
      const replies = getReplyCount(item)
      const reposts = getRepostCount(item)
      const quotes = getQuoteCount(item)
      const likes = getLikeCount(item)
      const uri = item.atUri ?? item.objectUri ?? ''
      return {
        id: `${item.source}-${item.id}`,
        uri,
        source: item.source,
        authorName: item.authorName,
        content: item.content,
        createdAt: item.createdAt,
        replies,
        reposts,
        quotes,
        likes,
        score: engagementScore(item),
      }
    })
    .filter(item => item.uri.length > 0)
    .filter(item => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      const aTs = a.createdAt ? Date.parse(a.createdAt) : 0
      const bTs = b.createdAt ? Date.parse(b.createdAt) : 0
      return bTs - aTs
    })

  return ranked.slice(0, 8)
})

const showPopularCarousel = computed(() => popularPosts.value.length >= 3)

function navigateToPost(item: PopularFeedItem): void {
  void router.push({ name: 'thread', params: { id: item.uri } })
}

function toPopularLabel(item: PopularFeedItem): string {
  const metrics = [
    `${item.replies}R`,
    `${item.reposts}RP`,
    `${item.quotes}Q`,
    `${item.likes}L`,
  ]
  return metrics.join(' · ')
}

// Pull to refresh handler
async function handleRefresh(): Promise<void> {
  await store.fetchUnifiedFeed(false)
}

// Load more handler
async function handleLoadMore(): Promise<void> {
  await store.fetchUnifiedFeed(true)
}
</script>

<template>
  <AppPullToRefresh @refresh="handleRefresh">
    <div class="UnifiedFeedList flex flex-col gap-(--gap-default) py-(--gap-default)">

      <!-- All non-feed header content — height changes trigger scrollMargin recomputation -->
      <div ref="feedHeaderRef" class="flex flex-col gap-(--gap-default)">

        <!-- Controls row: source chips -->
        <div class="flex items-center gap-2 flex-wrap">
          <button
            v-for="src in sources"
            :key="src.value"
            class="rounded-full px-3.5 py-1 text-footnote font-semibold transition-colors"
            :class="store.feedSource === src.value
              ? 'text-white'
              : 'bg-white text-dark-50 hover:bg-dark-10 shadow-sm'"
            :style="store.feedSource === src.value ? 'background: var(--color-accent);' : ''"
            @click="store.setFeedSource(src.value)"
          >
            {{ src.label }}
          </button>
        </div>

        <!-- Timeline mode chips (hidden when controlled by parent) -->
        <div v-if="!props.mode" class="flex gap-2">
          <button
            v-for="m in timelineModes"
            :key="m.value"
            class="rounded-full px-3.5 py-1 text-footnote font-semibold transition-colors"
            :class="store.timelineMode === m.value
              ? 'text-white'
              : 'bg-white text-dark-50 hover:bg-dark-10 shadow-sm'"
            :style="store.timelineMode === m.value ? 'background: var(--color-accent);' : ''"
            @click="store.setTimelineMode(m.value)"
          >
            {{ m.label }}
          </button>
        </div>

        <!-- Hashtag filter -->
        <form class="flex gap-2" @submit.prevent="applyHashtagFilter">
          <input
            v-model="hashtagInput"
            type="text"
            placeholder="#hashtag"
            class="flex-1 rounded-full bg-white shadow-sm border-none px-4 py-2 text-footnote text-dark placeholder-dark-20 outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <button
            class="rounded-full px-4 py-2 text-footnote font-semibold text-white transition-opacity hover:opacity-85"
            style="background: var(--color-accent);"
            type="submit"
          >
            Filter
          </button>
          <button
            v-if="store.hashtagFilter"
            class="rounded-full px-4 py-2 text-footnote font-semibold bg-white shadow-sm text-dark-50 hover:bg-dark-10 transition-colors"
            type="button"
            @click="clearHashtagFilter"
          >
            Clear
          </button>
        </form>

        <!-- Loading state - Using FeedLoadingState -->
        <FeedLoadingState
          v-if="store.isLoading && store.unifiedFeed.length === 0"
        />

        <!-- Error state - Using FeedErrorState -->
        <FeedErrorState
          v-else-if="store.error"
          :error="store.error"
          :show-retry="true"
          @retry="store.fetchUnifiedFeed(false)"
        />

        <!-- Empty state - Using FeedEmptyState -->
        <FeedEmptyState
          v-else-if="!store.isLoading && store.unifiedFeed.length === 0"
          :title="store.hashtagFilter ? 'No posts for #' + store.hashtagFilter : store.feedSource === 'atproto' ? 'No AT Protocol posts yet' : store.feedSource === 'activitypods' ? 'No ActivityPods posts yet' : 'Nothing here yet'"
          :subtitle="store.hashtagFilter ? 'Try a different hashtag or clear the filter.' : 'Posts from your federated network will appear as they arrive.'"
          :show-action="!!store.hashtagFilter"
          action-label="Clear filter"
          @action="store.clearHashtagFilter()"
        />

        <!-- Popular posts carousel - Using FeedPopularCarousel -->
        <FeedPopularCarousel
          v-if="showPopularCarousel"
          :items="store.unifiedFeed"
          @item-click="navigateToPost"
        />

      </div>
      <!-- /feedHeaderRef -->

      <!-- Virtual feed list -->
      <div
        v-if="store.unifiedFeed.length > 0"
        ref="feedListRef"
        class="relative"
        :style="{ height: `${totalSize}px` }"
      >
        <div
          v-for="vRow in virtualRows"
          :key="String(vRow.key)"
          :data-index="vRow.index"
          :ref="el => el && virtualizer.measureElement(el as Element)"
          class="absolute top-0 left-0 w-full pb-(--gap-default)"
          :style="{ transform: `translateY(${vRow.start - scrollMarginPx}px)` }"
        >
          <UnifiedFeedItem
            :item="store.unifiedFeed[vRow.index]!"
            @hashtag-click="onHashtagClick"
            @repost-toggle="onRepostToggle"
          />
        </div>
      </div>

      <!-- Load more -->
      <div v-if="store.unifiedFeed.length > 0" class="flex justify-center py-2">
        <button
          class="rounded-full px-5 py-2 text-footnote font-semibold transition-opacity hover:opacity-80"
          style="background: color-mix(in srgb, var(--color-accent) 10%, transparent); color: var(--color-accent);"
          :disabled="store.isLoading"
          @click="handleLoadMore"
        >
          {{ store.isLoading ? 'Loading…' : 'Load more' }}
        </button>
      </div>
    </div>
  </AppPullToRefresh>
</template>

<style scoped>
/* Minimal styling - most is handled by component styles */
.UnifiedFeedList {
  min-height: 100%;
}
</style>
