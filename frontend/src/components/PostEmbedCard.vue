<script setup lang="ts">
import { useRouter } from 'vue-router'
import PostMediaCarousel from './PostMediaCarousel.vue'
import PostLinkPreview from './PostLinkPreview.vue'
import type { LinkPreviewData } from './PostLinkPreview.vue'
import type { CarouselMediaItem } from './PostMediaCarousel.vue'

export interface EmbeddedPost {
  id: number
  authorName: string
  avatarInitials: string
  avatarColor?: string
  federationDomain: string
  timeAgo: string
  content: string
  embedCount?: string    // e.g. "2 embeds, 1 audio"
  viewCount?: string
  media?: CarouselMediaItem[]
  linkPreview?: LinkPreviewData
}

const props = defineProps<{ post: EmbeddedPost }>()
const router = useRouter()

function open() {
  router.push({ name: 'thread', params: { id: props.post.id } })
}
</script>

<template>
  <div
    class="rounded-2xl border border-dark-10 overflow-hidden cursor-pointer"
    style="background: rgba(250,247,243,0.7);"
    @click="open"
  >
    <!-- Author row -->
    <div class="flex items-start gap-2.5 px-3.5 pt-3.5 pb-2">
      <!-- Avatar -->
      <div
        class="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-full text-white text-xs font-bold select-none"
        :style="{ background: post.avatarColor ?? '#1a1a2e' }"
      >{{ post.avatarInitials }}</div>

      <!-- Meta -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1">
          <span class="text-footnote font-bold text-dark">{{ post.authorName }}</span>
          <span class="flex items-center justify-center w-3.5 h-3.5 rounded-full flex-shrink-0" style="background: #1d9bf0;">
            <svg class="w-2 h-2 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
            </svg>
          </span>
        </div>
        <div class="flex items-center gap-1 mt-px">
          <span class="text-caption text-dark-50">{{ post.timeAgo }}</span>
          <svg class="w-2.5 h-2.5 flex-shrink-0" viewBox="0 0 20 20" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round">
            <circle cx="10" cy="10" r="4"/><path d="M10 1v3M10 16v3M1 10h3M16 10h3"/>
          </svg>
          <span class="text-caption font-medium truncate" style="color: #22c55e;">{{ post.federationDomain }}</span>
        </div>
      </div>

      <!-- Open icon -->
      <button
        type="button"
        class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-dark-10"
        style="background: color-mix(in srgb, var(--color-accent) 12%, transparent);"
        @click.stop="open"
        aria-label="Open post"
      >
        <svg class="w-4 h-4" style="color:var(--color-accent)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
        </svg>
      </button>
    </div>

    <!-- Content (max 3 lines) -->
    <p v-if="post.content" class="text-sm text-dark leading-snug px-3.5 pb-2.5 line-clamp-3">{{ post.content }}</p>

    <!-- Link preview -->
    <div v-if="post.linkPreview" class="px-3.5 pb-3">
      <PostLinkPreview :preview="post.linkPreview" />
    </div>

    <!-- Media (carousel) -->
    <div v-if="post.media?.length" class="px-3.5 pb-3">
      <PostMediaCarousel :items="post.media" />
    </div>

    <!-- Footer -->
    <div v-if="post.embedCount || post.viewCount"
      class="flex items-center justify-between px-3.5 pb-2.5">
      <button
        v-if="post.embedCount"
        type="button"
        class="text-caption font-semibold hover:underline"
        style="color: var(--color-accent);"
        @click.stop="open"
      >{{ post.embedCount }}</button>
      <span v-if="post.viewCount" class="text-caption text-dark-50">{{ post.viewCount }} views</span>
    </div>

    <!-- Compact action bar -->
    <div class="flex items-center gap-2 px-3.5 pb-3.5">
      <button type="button"
        class="flex items-center justify-center w-8 h-8 rounded-full transition-colors hover:bg-dark-10"
        style="background:color-mix(in srgb, var(--color-accent) 12%, transparent);"
        @click.stop>
        <svg class="w-3.5 h-3.5" style="color:var(--color-accent)" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
        </svg>
      </button>
      <button type="button"
        class="flex items-center justify-center w-8 h-8 rounded-full transition-colors hover:bg-dark-10"
        style="background:rgba(55,55,55,0.07);"
        @click.stop>
        <svg class="w-3.5 h-3.5 text-dark-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
        </svg>
      </button>
      <button type="button"
        class="flex items-center justify-center w-8 h-8 rounded-full transition-colors hover:bg-dark-10 ml-auto"
        style="background:rgba(55,55,55,0.07);"
        @click.stop>
        <svg class="w-3.5 h-3.5 text-dark-50" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
        </svg>
      </button>
    </div>
  </div>
</template>
