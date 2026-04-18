<script setup lang="ts">
import { DateTime } from 'luxon'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import HashtagText from './HashtagText.vue'
import PostEmbedCard from './PostEmbedCard.vue'
import type { EmbeddedPost } from './PostEmbedCard.vue'
import type { LinkPreviewData } from './PostLinkPreview.vue'
import type { CarouselMediaItem } from './PostMediaCarousel.vue'
import InlineReplyComposer from './InlineReplyComposer.vue'
import MoreActionsSheet from './MoreActionsSheet.vue'
import type { UnifiedFeedItem } from '@/stores/atBridgeStore'
import { useFollow } from '@/composables/useFollow'
import { useReply, type ReplyPolicyResolution, type ReplySubmissionResult } from '@/composables/useReply'

const props = defineProps<{
  item: UnifiedFeedItem
}>()

const emit = defineEmits<{
  hashtagClick: [hashtag: string]
}>()

const { follow, isFollowing } = useFollow()
const { resolvePolicy, submitReply, replyError, isResolving, isSubmitting } = useReply()
const router = useRouter()
const isReplying = ref(false)
const isMoreActionsOpen = ref(false)
const replyPolicy = ref<ReplyPolicyResolution | null>(null)
const replyComposer = ref<InstanceType<typeof InlineReplyComposer> | null>(null)

const quotedEmbed = computed<EmbeddedPost | null>(() => {
  const q = resolveQuotedPost(props.item)
  if (!q) return null
  let domain = q.source === 'atproto' ? 'atproto' : 'activitypods'
  try { domain = new URL(q.authorProviderEndpoint).hostname } catch { /* ignore */ }

  const normalizedMedia = normalizeQuotedMedia(q)
  const linkPreview = normalizeQuotedLinkPreview(q)

  return {
    id: q.id,
    authorName: q.authorName,
    avatarInitials: getInitials(q.authorName),
    federationDomain: domain,
    timeAgo: formatRelativeTime(q.createdAt),
    content: q.content,
    media: normalizedMedia,
    linkPreview,
  }
})

interface NormalizedQuotedPost {
  id: number
  authorName: string
  authorProviderEndpoint: string
  content: string
  createdAt: string | null
  source: 'activitypods' | 'atproto'
  media?: Array<{
    type?: string
    url?: string
    alt?: string
    attribution?: string
    poster?: string
    filename?: string
    duration?: number
  }>
  linkPreview?: {
    url?: string
    title?: string
    description?: string
    image?: string
    domain?: string
  }
}

function resolveQuotedPost(item: UnifiedFeedItem): NormalizedQuotedPost | null {
  const raw = (item as unknown as Record<string, unknown>).quotedPost
    ?? (item as unknown as Record<string, unknown>).quoted_post
    ?? (item as unknown as Record<string, unknown>).quotePost
    ?? (item as unknown as Record<string, unknown>).quote
  if (!raw || typeof raw !== 'object') return null

  const source = normalizeSource((raw as Record<string, unknown>).source, item.source)
  const id = normalizeNumber((raw as Record<string, unknown>).id) ?? item.id
  const authorName = normalizeString((raw as Record<string, unknown>).authorName)
    ?? normalizeString((raw as Record<string, unknown>).author_name)
    ?? 'Unknown'
  const authorProviderEndpoint = normalizeString((raw as Record<string, unknown>).authorProviderEndpoint)
    ?? normalizeString((raw as Record<string, unknown>).author_provider_endpoint)
    ?? ''
  const content = normalizeString((raw as Record<string, unknown>).content)
    ?? normalizeString((raw as Record<string, unknown>).text)
    ?? ''
  const createdAt = normalizeString((raw as Record<string, unknown>).createdAt)
    ?? normalizeString((raw as Record<string, unknown>).created_at)
    ?? null

  const media = ((raw as Record<string, unknown>).media
    ?? (raw as Record<string, unknown>).attachments
    ?? undefined) as NormalizedQuotedPost['media']
  const linkPreview = ((raw as Record<string, unknown>).linkPreview
    ?? (raw as Record<string, unknown>).link_preview
    ?? (raw as Record<string, unknown>).preview
    ?? undefined) as NormalizedQuotedPost['linkPreview']

  return {
    id,
    authorName,
    authorProviderEndpoint,
    content,
    createdAt,
    source,
    media,
    linkPreview,
  }
}

function normalizeQuotedMedia(quoted: NormalizedQuotedPost): CarouselMediaItem[] {
  const items = Array.isArray(quoted.media) ? quoted.media : []
  const normalized: CarouselMediaItem[] = []
  for (const item of items) {
    if (!item?.url || typeof item.url !== 'string') continue
    normalized.push({
      type: normalizeMediaType(item.type),
      url: item.url,
      alt: item.alt,
      attribution: item.attribution,
      poster: item.poster,
      filename: item.filename,
      duration: item.duration,
    })
  }
  return normalized
}

function normalizeQuotedLinkPreview(quoted: NormalizedQuotedPost): LinkPreviewData | undefined {
  const preview = quoted.linkPreview
  if (!preview || typeof preview.url !== 'string' || typeof preview.title !== 'string') {
    return undefined
  }

  return {
    url: preview.url,
    title: preview.title,
    description: preview.description,
    image: preview.image,
    domain: preview.domain,
  }
}

function normalizeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function normalizeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function normalizeSource(value: unknown, fallback: UnifiedFeedItem['source']): 'activitypods' | 'atproto' {
  return value === 'activitypods' || value === 'atproto' ? value : fallback
}

function normalizeMediaType(type: string | undefined): CarouselMediaItem['type'] {
  if (type === 'gif' || type === 'video' || type === 'audio') return type
  return 'image'
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return ''
  return DateTime.fromISO(dateStr).toRelative() ?? dateStr
}

function getFederationDomain(item: UnifiedFeedItem): string {
  try {
    return new URL(item.authorProviderEndpoint).hostname
  } catch {
    return item.source === 'atproto' ? 'atproto' : 'activitypods'
  }
}

async function openReplyComposer() {
  if (!props.item.objectUri) return
  isReplying.value = true
  replyPolicy.value = await resolvePolicy(props.item.objectUri)
}

function closeReplyComposer() {
  isReplying.value = false
}

function navigateToThread() {
  router.push({ name: 'thread', params: { id: props.item.id } })
}

async function onReplySubmit(content: string) {
  if (!props.item.objectUri) return
  const result = await submitReply(props.item.objectUri, content, true)
  if (result) {
    replyComposer.value?.applyResult(result as ReplySubmissionResult)
  }
}
</script>

<template>
  <div class="rounded-default bg-white p-[var(--padding-main)] flex flex-col gap-3 shadow-sm">

    <!-- Tappable area → thread view -->
    <div class="cursor-pointer" @click="navigateToThread">

    <!-- Header: avatar · author info · follow -->
    <div class="flex items-start gap-3">

      <!-- Avatar -->
      <div
        class="h-11 w-11 flex-shrink-0 flex items-center justify-center rounded-full text-white text-sm font-bold select-none"
        style="background: #1a1a2e;"
      >
        {{ getInitials(item.authorName) }}
      </div>

      <!-- Name + meta -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5">
          <p class="text-subHeader font-bold text-dark truncate">{{ item.authorName }}</p>
          <!-- Verified badge: blue circle with white check -->
          <span
            class="flex-shrink-0 flex items-center justify-center w-4 h-4 rounded-full"
            style="background: #1d9bf0;"
          >
            <svg class="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </span>
        </div>
        <div class="flex items-center gap-1 mt-0.5">
          <span class="text-caption text-dark-50">{{ formatRelativeTime(item.createdAt) }}</span>
          <span class="text-caption text-dark-20">·</span>
          <!-- Federation source with node icon -->
          <span class="flex items-center gap-0.5 text-caption font-semibold" style="color: #22c55e;">
            <svg class="w-2.5 h-2.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/>
              <path d="M12 7v4m0 0l-5 5m5-5l5 5"/>
            </svg>
            {{ getFederationDomain(item) }}
          </span>
        </div>
      </div>

      <!-- Follow button — all posts -->
      <button
        :disabled="isFollowing(item.authorWebId)"
        class="flex-shrink-0 rounded-full px-4 py-1.5 text-footnote font-bold text-white transition-opacity"
        :class="isFollowing(item.authorWebId) ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-85'"
        style="background: rgb(99, 100, 246);"
        @click.stop="item.source === 'activitypods' ? follow(item.authorWebId) : undefined"
      >
        {{ isFollowing(item.authorWebId) ? 'Following' : 'Follow' }}
      </button>

    </div>

    <!-- Post content -->
    <HashtagText
      class="text-base text-dark leading-snug mt-3"
      :text="item.content"
      @hashtag-click="emit('hashtagClick', $event)"
    />

    <!-- Embedded / quote post -->
    <div v-if="quotedEmbed" class="mt-3" @click.stop>
      <PostEmbedCard :post="quotedEmbed" />
    </div>

    </div><!-- end tappable area -->

    <!-- Action bar -->
    <div class="flex items-center gap-2 pt-1">

      <!-- Reply -->
      <button
        class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-footnote font-semibold transition-opacity hover:opacity-80"
        style="background: rgba(99,100,246,0.12); color: rgb(99,100,246);"
        @click="openReplyComposer"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
        </svg>
        <span>Reply</span>
      </button>

      <!-- Like -->
      <button
        class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-footnote font-semibold transition-opacity hover:opacity-80"
        style="background: rgba(55,55,55,0.07); color: rgba(55,55,55,0.7);"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
        </svg>
        <span>Like</span>
      </button>

      <!-- Repost -->
      <button
        class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-footnote font-semibold transition-opacity hover:opacity-80"
        style="background: rgba(34,197,94,0.12); color: #16a34a;"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3"/>
        </svg>
        <span>Repost</span>
      </button>

      <!-- More (horizontal dots) -->
      <button
        class="ml-auto rounded-full w-8 h-8 flex items-center justify-center hover:bg-dark-10 transition-colors text-dark-50"
        @click="isMoreActionsOpen = true"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
        </svg>
      </button>

    </div>

    <!-- Inline reply composer -->
    <InlineReplyComposer
      v-if="isReplying"
      ref="replyComposer"
      :policy="replyPolicy"
      :is-resolving="isResolving"
      :is-submitting="isSubmitting"
      :error="replyError"
      @submit="onReplySubmit"
      @cancel="closeReplyComposer"
    />

    <!-- More actions bottom sheet -->
    <MoreActionsSheet
      v-if="isMoreActionsOpen"
      :item="item"
      @close="isMoreActionsOpen = false"
    />

  </div>
</template>
