<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import PostAudioPlayer from '@/components/PostAudioPlayer.vue'
import PostPoll from '@/components/PostPoll.vue'
import PostImageGrid from '@/components/PostImageGrid.vue'
import type { GridImage } from '@/components/PostImageGrid.vue'
import PostLinkPreview from '@/components/PostLinkPreview.vue'
import type { LinkPreviewData } from '@/components/PostLinkPreview.vue'
import AiInterpolatorCard from '@/components/AiInterpolatorCard.vue'
import { useAtBridgeStore, type UnifiedFeedItem, type FeedPoll } from '@/stores/atBridgeStore'

const router = useRouter()
const route = useRoute()
const store = useAtBridgeStore()
const showAiInterpolator = ref(true)

// -----------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------

interface ThreadPost {
  id: number
  authorName: string
  authorHandle: string
  avatarInitials: string
  avatarColor: string
  federationDomain: string
  timeAgo: string
  inReplyToName?: string
  content: string
  viewCount?: string
  replyCount?: string
  likeCount: string
  repostCount: string
  audio?: { filename: string; duration: number }
  poll?: FeedPoll
  images?: GridImage[]
  linkPreview?: LinkPreviewData
}

// -----------------------------------------------------------------------
// State
// -----------------------------------------------------------------------

const loading = ref(true)
const error = ref<string | null>(null)
const rootItem = ref<UnifiedFeedItem | null>(null)
const replyItems = ref<UnifiedFeedItem[]>([])

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

function domainFromWebId(webId: string): string {
  try { return new URL(webId).hostname } catch { return webId }
}

function initialsFrom(name: string): string {
  return name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

const AVATAR_PALETTE = ['#2d2d2d', '#6364f6', '#22c55e', '#1d9bf0', '#f59e0b', '#ef4444']
function avatarColor(id: number): string {
  return AVATAR_PALETTE[id % AVATAR_PALETTE.length]
}

function relativeTime(iso: string | null): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function toThreadPost(item: UnifiedFeedItem, inReplyToName?: string): ThreadPost {
  return {
    id: item.id,
    authorName: item.authorName,
    authorHandle: item.authorWebId,
    avatarInitials: initialsFrom(item.authorName),
    avatarColor: avatarColor(item.id),
    federationDomain: domainFromWebId(item.authorProviderEndpoint || item.authorWebId),
    timeAgo: relativeTime(item.createdAt),
    inReplyToName,
    content: item.content,
    likeCount: '0',
    repostCount: '0',
    poll: item.poll ?? undefined,
  }
}

// -----------------------------------------------------------------------
// Derived
// -----------------------------------------------------------------------

const rootPost = computed<ThreadPost | null>(() =>
  rootItem.value ? toThreadPost(rootItem.value) : null,
)

const replies = computed<ThreadPost[]>(() => {
  const rootAuthorName = rootItem.value?.authorName
  return replyItems.value.map(item =>
    toThreadPost(item, item.replyParentUri ? rootAuthorName : undefined),
  )
})

// -----------------------------------------------------------------------
// Load
// -----------------------------------------------------------------------

onMounted(async () => {
  const rootUri = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id
  if (!rootUri) {
    error.value = 'No thread URI provided.'
    loading.value = false
    return
  }
  try {
    const ctx = await store.fetchThreadContext(rootUri)
    if (!ctx) {
      error.value = 'Thread not found.'
    } else {
      rootItem.value = ctx.root
      replyItems.value = ctx.items
    }
  } catch (e) {
    error.value = 'Failed to load thread.'
  } finally {
    loading.value = false
  }
})

function formatCount(n: string | undefined): string {
  return n ?? '0'
}
</script>

<template>
  <div class="min-h-screen flex flex-col" style="background: var(--color-pastel-light, #faf7f3);">

    <!-- Sticky header -->
    <div class="sticky top-0 z-30 flex items-center justify-between px-4 py-3"
      style="background: var(--color-pastel-light, #faf7f3);">
      <button
        type="button"
        class="w-9 h-9 rounded-full bg-dark-10 flex items-center justify-center hover:bg-dark-20 transition-colors"
        @click="router.back()"
      >
        <svg class="w-4 h-4 text-dark ml-[-2px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>

      <span class="text-h2 font-black text-dark" style="letter-spacing: -0.03em;">thread.</span>

      <button
        type="button"
        class="w-9 h-9 rounded-full bg-dark-10 flex items-center justify-center hover:bg-dark-20 transition-colors"
        @click="router.back()"
      >
        <svg class="w-4 h-4 text-dark" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    </div>

    <!-- Scrollable content -->
    <div class="flex-1 overflow-y-auto px-4 pb-8 flex flex-col gap-3">

      <!-- Loading state -->
      <div v-if="loading" class="flex items-center justify-center py-16 text-dark-50 text-sm">
        Loading thread…
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="rounded-[var(--radius-default,25px)] bg-white shadow-sm p-6 text-center text-dark-50 text-sm">
        {{ error }}
      </div>

      <template v-else-if="rootPost">

      <!-- ── Root post card ── -->
      <div class="rounded-[var(--radius-default,25px)] bg-white shadow-sm p-4 flex flex-col gap-3">

        <!-- Author row -->
        <div class="flex items-start gap-3">
          <div
            class="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-full text-white text-sm font-bold select-none"
            :style="{ background: rootPost.avatarColor }"
          >{{ rootPost.avatarInitials }}</div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="text-subHeader font-bold text-dark">{{ rootPost.authorName }}</span>
              <span class="flex items-center justify-center w-4 h-4 rounded-full flex-shrink-0" style="background: #1d9bf0;">
                <svg class="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                </svg>
              </span>
            </div>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span class="text-caption text-dark-50">{{ rootPost.timeAgo }}</span>
              <svg class="w-3 h-3 flex-shrink-0" viewBox="0 0 20 20" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round">
                <circle cx="10" cy="10" r="4"/><path d="M10 1v3M10 16v3M1 10h3M16 10h3"/>
              </svg>
              <span class="text-caption font-medium" style="color: #22c55e;">{{ rootPost.federationDomain }}</span>
            </div>
          </div>

          <button
            type="button"
            class="rounded-full px-4 py-1.5 text-footnote font-bold text-white flex-shrink-0"
            style="background: rgb(99,100,246);"
          >Follow</button>
        </div>

        <!-- Content -->
        <p class="text-base text-dark leading-snug">{{ rootPost.content }}</p>

        <!-- Audio player -->
        <PostAudioPlayer
          v-if="rootPost.audio"
          :filename="rootPost.audio.filename"
          :duration="rootPost.audio.duration"
          :start-at="30"
        />

        <!-- Link preview -->
        <PostLinkPreview v-if="rootPost.linkPreview" :preview="rootPost.linkPreview" />

        <!-- View count -->
        <p v-if="rootPost.viewCount" class="text-caption text-dark-50">{{ rootPost.viewCount }} views</p>

        <!-- Action bar -->
        <div class="flex items-center gap-2">
          <!-- Reply -->
          <button type="button"
            class="flex items-center gap-1.5 rounded-full px-3 py-2 text-footnote font-semibold transition-colors"
            style="background: rgba(99,100,246,0.12); color: rgb(99,100,246);">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
            </svg>
            {{ formatCount(rootPost.replyCount) }}
          </button>
          <!-- Like -->
          <button type="button"
            class="flex items-center gap-1.5 rounded-full px-3 py-2 text-footnote font-semibold text-dark transition-colors hover:bg-dark-10"
            style="background: rgba(55,55,55,0.07);">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            {{ rootPost.likeCount }}
          </button>
          <!-- Repost -->
          <button type="button"
            class="flex items-center gap-1.5 rounded-full px-3 py-2 text-footnote font-semibold transition-colors"
            style="background: rgba(34,197,94,0.12); color: #22c55e;">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
            </svg>
            {{ rootPost.repostCount }}
          </button>
          <!-- More -->
          <button type="button"
            class="ml-auto w-9 h-9 rounded-full flex items-center justify-center text-dark-50 hover:bg-dark-10 transition-colors"
            style="background: rgba(55,55,55,0.07);">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- ── AI Interpolator ── -->
      <AiInterpolatorCard
        v-if="showAiInterpolator"
        @close="showAiInterpolator = false"
      />

      <!-- ── Replies ── -->
      <div
        v-for="(reply, idx) in replies"
        :key="reply.id"
        class="relative"
      >
        <!-- Left connector bracket -->
        <div class="absolute left-7 top-0 bottom-4 w-0.5 rounded-full bg-dark-10 z-0" />

        <div class="relative z-10 rounded-[var(--radius-default,25px)] bg-white shadow-sm p-4 flex flex-col gap-3">

          <!-- Author row -->
          <div class="flex items-start gap-3">
            <div
              class="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-full text-white text-sm font-bold select-none"
              :style="{ background: reply.avatarColor }"
            >{{ reply.avatarInitials }}</div>

            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="text-subHeader font-bold text-dark">{{ reply.authorName }}</span>
                <span class="flex items-center justify-center w-4 h-4 rounded-full flex-shrink-0" style="background: #1d9bf0;">
                  <svg class="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                  </svg>
                </span>
              </div>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span class="text-caption text-dark-50">{{ reply.timeAgo }}</span>
                <svg class="w-3 h-3 flex-shrink-0" viewBox="0 0 20 20" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round">
                  <circle cx="10" cy="10" r="4"/><path d="M10 1v3M10 16v3M1 10h3M16 10h3"/>
                </svg>
                <span class="text-caption font-medium" style="color: #22c55e;">{{ reply.federationDomain }}</span>
              </div>
              <!-- answering to -->
              <p v-if="reply.inReplyToName" class="text-caption text-dark-50 mt-0.5">
                answering to
                <span class="font-semibold" style="color: rgb(99,100,246);">{{ reply.inReplyToName }}</span>
              </p>
            </div>

            <button
              type="button"
              class="rounded-full px-4 py-1.5 text-footnote font-bold text-white flex-shrink-0"
              style="background: rgb(99,100,246);"
            >Follow</button>
          </div>

          <!-- Content -->
          <p class="text-base text-dark leading-snug">{{ reply.content }}</p>

          <!-- Poll -->
          <PostPoll v-if="reply.poll" :poll="reply.poll" />

          <!-- Image grid -->
          <PostImageGrid v-if="reply.images?.length" :images="reply.images" />

          <!-- Link preview -->
          <PostLinkPreview v-if="reply.linkPreview" :preview="reply.linkPreview" />

          <!-- Action bar (no reply button for replies) -->
          <div class="flex items-center gap-2">
            <!-- Like -->
            <button type="button"
              class="flex items-center gap-1.5 rounded-full px-3 py-2 text-footnote font-semibold text-dark transition-colors hover:bg-dark-10"
              style="background: rgba(55,55,55,0.07);">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              {{ reply.likeCount }}
            </button>
            <!-- Repost -->
            <button type="button"
              class="flex items-center gap-1.5 rounded-full px-3 py-2 text-footnote font-semibold transition-colors"
              style="background: rgba(34,197,94,0.12); color: #22c55e;">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
              </svg>
              {{ reply.repostCount }}
            </button>
            <!-- More -->
            <button type="button"
              class="ml-auto w-9 h-9 rounded-full flex items-center justify-center text-dark-50 hover:bg-dark-10 transition-colors"
              style="background: rgba(55,55,55,0.07);">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      </template>
    </div>
  </div>
</template>
