<script setup lang="ts">
/**
 * UnifiedFeedList — Renders the combined AT Protocol + ActivityPods feed.
 *
 * Features:
 *   - Source filter tabs (All / ActivityPods / AT Protocol)
 *   - Infinite scroll (load more on button click)
 *   - Loading and error states
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/i18n'
import { useAtBridgeStore, type FeedSource, type TimelineMode, type UnifiedFeedItem as UnifiedFeedItemModel } from '@/stores/atBridgeStore'
import UnifiedFeedItem from './UnifiedFeedItem.vue'

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

interface PopularFeedItem {
  id: string
  /** Canonical URI used for thread navigation (atUri or objectUri). */
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
</script>

<template>
  <div class="UnifiedFeedList flex flex-col gap-[var(--gap-default)] py-[var(--gap-default)]">

    <!-- Controls row: source chips + firehose dot -->
    <div class="flex items-center gap-2 flex-wrap">
      <!-- Source filter chips -->
      <button
        v-for="src in sources"
        :key="src.value"
        class="rounded-full px-3.5 py-1 text-footnote font-semibold transition-colors"
        :class="store.feedSource === src.value
          ? 'text-white'
          : 'bg-white text-dark-50 hover:bg-dark-10 shadow-sm'"
        :style="store.feedSource === src.value ? 'background: rgb(99,100,246);' : ''"
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
        :style="store.timelineMode === m.value ? 'background: rgb(99,100,246);' : ''"
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
        style="background: rgb(99,100,246);"
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

    <!-- Loading state -->
    <div
      v-if="store.isLoading && store.unifiedFeed.length === 0"
      class="rounded-default bg-white shadow-sm flex flex-col items-center gap-3 py-14 text-center"
    >
      <box-icon name="loader-circle" animation="spin" size="28px" color="rgba(99,100,246,0.5)"></box-icon>
      <p class="text-footnote text-dark-50">Loading feed…</p>
    </div>

    <!-- Error state -->
    <div v-else-if="store.error" class="rounded-default bg-white shadow-sm p-[var(--padding-main)]">
      <p class="text-footnote text-red-500 font-medium">{{ store.error }}</p>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!store.isLoading && store.unifiedFeed.length === 0"
      class="rounded-default bg-white shadow-sm flex flex-col items-center gap-4 py-16 px-8 text-center"
    >
      <!-- Icon -->
      <div class="w-16 h-16 rounded-full flex items-center justify-center" style="background: rgba(99,100,246,0.08);">
        <svg class="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="rgb(99,100,246)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
      </div>

      <div class="flex flex-col gap-1.5">
        <p class="text-subHeader font-bold text-dark">
          <template v-if="store.hashtagFilter">No posts for #{{ store.hashtagFilter }}</template>
          <template v-else-if="store.feedSource === 'atproto'">No AT Protocol posts yet</template>
          <template v-else-if="store.feedSource === 'activitypods'">No ActivityPods posts yet</template>
          <template v-else>Nothing here yet</template>
        </p>
        <p class="text-footnote text-dark-50 max-w-[260px] leading-relaxed">
          <template v-if="store.hashtagFilter">Try a different hashtag or clear the filter.</template>
          <template v-else>Posts from your federated network will appear as they arrive.</template>
        </p>
      </div>

      <button
        v-if="store.hashtagFilter"
        class="rounded-full px-4 py-2 text-footnote font-semibold text-white transition-opacity hover:opacity-85"
        style="background: rgb(99,100,246);"
        @click="store.clearHashtagFilter()"
      >
        Clear filter
      </button>
    </div>

    <!-- Popular posts carousel (current feed scope) -->
    <section
      v-if="showPopularCarousel"
      class="rounded-default bg-white shadow-sm p-4 flex flex-col gap-3"
    >
      <div class="flex items-center justify-between">
        <div class="flex flex-col">
          <h3 class="text-subHeader font-bold text-dark">{{ t('feed.popular.heading') }}</h3>
          <p class="text-footnote text-dark-50">{{ t('feed.popular.subtitle') }}</p>
        </div>
      </div>

      <div class="overflow-x-auto">
        <div class="flex gap-3 pb-1 min-w-max">
          <article
            v-for="item in popularPosts"
            :key="item.id"
            class="w-[260px] rounded-xl border border-dark-10 bg-white p-3 flex flex-col gap-2 cursor-pointer hover:border-indigo-300 transition-colors"
            role="button"
            :aria-label="item.authorName"
            tabindex="0"
            @click="navigateToPost(item)"
            @keydown.enter="navigateToPost(item)"
            @keydown.space.prevent="navigateToPost(item)"
          >
            <div class="flex items-center justify-between gap-2">
              <p class="text-footnote font-semibold text-dark truncate">{{ item.authorName }}</p>
              <span
                class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
                :class="item.source === 'atproto' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'"
              >
                {{ item.source === 'atproto' ? 'AT' : 'AP' }}
              </span>
            </div>

            <p class="text-sm text-dark leading-relaxed line-clamp-3">{{ item.content }}</p>

            <div class="flex items-center justify-between">
              <span class="text-[11px] text-dark-50">{{ toPopularLabel(item) }}</span>
              <span
                class="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style="background: rgba(99,100,246,0.12); color: rgb(99,100,246);"
              >
                Score {{ item.score.toFixed(1) }}
              </span>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- Feed items -->
    <UnifiedFeedItem
      v-for="item in store.unifiedFeed"
      :key="`${item.source}-${item.id}`"
      :item="item"
      @hashtag-click="onHashtagClick"
      @repost-toggle="onRepostToggle"
    />

    <!-- Load more -->
    <div v-if="store.unifiedFeed.length > 0" class="flex justify-center py-2">
      <button
        class="rounded-full px-5 py-2 text-footnote font-semibold transition-opacity hover:opacity-80"
        style="background: rgba(99,100,246,0.1); color: rgb(99,100,246);"
        :disabled="store.isLoading"
        @click="store.fetchUnifiedFeed(true)"
      >
        {{ store.isLoading ? 'Loading…' : 'Load more' }}
      </button>
    </div>
  </div>
</template>
