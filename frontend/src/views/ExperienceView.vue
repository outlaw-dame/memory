<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
useRoute()

const showSources = ref(true)
const speed = ref(1.0)
const speeds = [0.5, 1.0, 1.5, 2.0]
function cycleSpeed() {
  const idx = speeds.indexOf(speed.value)
  speed.value = speeds[(idx + 1) % speeds.length]
}

// -----------------------------------------------------------------------
// Story block types
// -----------------------------------------------------------------------
interface ChapterBlock { type: 'chapter'; label: string; title: string }
interface PostBlock {
  type: 'post'
  authorName: string; avatarInitials: string; avatarColor: string
  content?: string
  poll?: { question: string; options: { text: string; percent: number }[]; totalVotes: string; timeLeft: string }
  media?: { url: string; isGif?: boolean; alt?: string }[]
  likeCount?: string
}
interface QuoteBlock {
  type: 'quote'; text: string
  authorName: string; avatarInitials: string; avatarColor: string
}
interface AiBlock {
  type: 'ai'
  parts: (string | { link: string; text: string })[]
}
type StoryBlock = ChapterBlock | PostBlock | QuoteBlock | AiBlock

// -----------------------------------------------------------------------
// Mock story data
// -----------------------------------------------------------------------
const story: StoryBlock[] = [
  { type: 'chapter', label: 'Introduction', title: 'Welcome to Experience! You can set animation speeds and other settings with the buttons below.' },
  { type: 'chapter', label: 'Chapter 1', title: 'Explaining \u201cExperience.\u201d' },
  {
    type: 'post', authorName: 'David No\u00e9', avatarInitials: 'DN', avatarColor: '#2d2d2d',
    content: 'Experience is an amazing feature! It lets you experience topics, background of posts, peoples lives, hashtags, etc.! Just search something and press \u201cLaunch!\u201d. Its as simple as that, and soon you\u2019re gonna experience amazing AI-generated stories!',
    poll: {
      question: 'How hyped are you for the final release of Memory?',
      options: [{ text: 'Hyped!', percent: 50 }, { text: 'Superhyped!!', percent: 50 }],
      totalVotes: "57'284", timeLeft: '14h left',
    },
    media: [
      { url: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=400&h=400&fit=crop', alt: 'shadow' },
      { url: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400&h=400&fit=crop', isGif: true, alt: 'rocks' },
    ],
    likeCount: '12k',
  },
  {
    type: 'quote', text: '\u201cExperience.\u201d uses quotes to leave remaining statements in the Story.',
    authorName: 'David No\u00e9', avatarInitials: 'DN', avatarColor: '#2d2d2d',
  },
  {
    type: 'ai',
    parts: [
      'So this is a text created by AI. It is based of posts and images and ',
      { link: '#', text: 'contributes to the story' },
      ' and the experience that is being told. It helps the reader ',
      { link: '#', text: 'gain context' },
      ' and information about a topic or a person.',
    ],
  },
  {
    type: 'post', authorName: 'David No\u00e9', avatarInitials: 'DN', avatarColor: '#2d2d2d',
    content: 'Heya! This is the first post on this new platform called Memory! :)',
    poll: {
      question: 'How hyped are you for the final release of Memory?',
      options: [{ text: 'Hyped!', percent: 50 }, { text: 'Superhyped!!', percent: 50 }],
      totalVotes: "57'284", timeLeft: '14h left',
    },
    likeCount: '12k',
  },
  {
    type: 'post', authorName: 'David No\u00e9', avatarInitials: 'DN', avatarColor: '#2d2d2d',
    media: [
      { url: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=400&h=400&fit=crop', alt: 'shadow' },
      { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop', alt: 'painting' },
      { url: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400&h=400&fit=crop', isGif: true, alt: 'rocks' },
    ],
  },
  { type: 'chapter', label: 'Chapter 2', title: 'The new era of Social-Media' },
  {
    type: 'quote', text: 'Put a deep, inspirational quote about social media here.',
    authorName: 'David No\u00e9', avatarInitials: 'DN', avatarColor: '#2d2d2d',
  },
  {
    type: 'ai',
    parts: [
      'So this is a text created by AI. It is based of posts and images and ',
      { link: '#', text: 'contributes to the story' },
      ' and the experience that is being told. It helps the reader ',
      { link: '#', text: 'gain context' },
      ' and information about a topic or a person.',
    ],
  },
]

function mediaGridCols(count: number): string {
  if (count === 1) return 'grid-cols-1'
  if (count === 2) return 'grid-cols-2'
  return 'grid-cols-3'
}
</script>

<template>
  <div class="min-h-screen flex flex-col" style="background: var(--color-pastel-light, #f0ede8);">

    <!-- Sticky header -->
    <div class="sticky top-0 z-20 flex items-center justify-center px-4 pt-5 pb-3" style="background: var(--color-pastel-light, #f0ede8);">
      <h1 class="font-black text-dark" style="font-size: 1.5rem; letter-spacing: -0.04em;">experience.</h1>
      <button
        type="button"
        class="absolute right-4 w-9 h-9 flex items-center justify-center rounded-full text-dark-50"
        style="background: rgba(55,55,55,0.12);"
        @click="router.back()"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>

    <!-- Story content -->
    <div class="flex-1 overflow-y-auto px-4 pb-32 pt-1 flex flex-col gap-3">

      <template v-for="(block, idx) in story" :key="idx">

        <!-- ─── Chapter card ─────────────────────────────────── -->
        <div v-if="block.type === 'chapter'" class="rounded-2xl bg-white p-5 shadow-sm">
          <p class="text-xs font-semibold text-dark-40 mb-1.5">{{ block.label }}</p>
          <p class="text-xl font-bold text-dark leading-snug">{{ block.title }}</p>
        </div>

        <!-- ─── Source post card ─────────────────────────────── -->
        <div v-else-if="block.type === 'post' && showSources" class="rounded-2xl bg-white shadow-sm overflow-hidden">

          <!-- Header (padded) — only when there's content -->
          <div v-if="block.content || block.poll" class="px-4 pt-4 flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              :style="{ background: block.avatarColor }"
            >{{ block.avatarInitials }}</div>
            <span class="text-sm font-bold text-dark flex-1">{{ block.authorName }}</span>
            <button type="button" class="rounded-xl px-4 py-1.5 text-xs font-bold text-white flex-shrink-0" style="background: rgb(99,100,246);">Follow</button>
          </div>

          <!-- Content text -->
          <p v-if="block.content" class="px-4 pt-3 text-sm text-dark leading-snug">{{ block.content }}</p>

          <!-- Poll -->
          <div v-if="block.poll" class="mx-4 mt-3 rounded-xl overflow-hidden" style="background: rgba(240,237,232,0.7);">
            <div class="p-3">
              <p class="text-sm font-bold text-dark mb-2 leading-snug">{{ block.poll.question }}</p>
              <div class="flex flex-col gap-1.5">
                <div v-for="opt in block.poll.options" :key="opt.text" class="flex items-center gap-2">
                  <div class="flex-1 relative rounded-lg overflow-hidden" style="height: 38px; background: rgba(99,100,246,0.08);">
                    <div
                      class="absolute inset-y-0 left-0 rounded-lg"
                      style="background: rgba(99,100,246,0.28);"
                      :style="{ width: opt.percent + '%' }"
                    />
                    <span class="absolute inset-0 flex items-center px-3 text-sm font-semibold" style="color: rgb(80,81,200);">{{ opt.text }}</span>
                  </div>
                  <span class="text-sm font-semibold text-dark-50 w-10 text-right">{{ opt.percent }}%</span>
                </div>
              </div>
              <p class="text-xs text-dark-40 mt-2">{{ block.poll.totalVotes }} poll votes · {{ block.poll.timeLeft }}</p>
            </div>
          </div>

          <!-- Media grid (full bleed, no horizontal padding) -->
          <div v-if="block.media?.length" class="mt-3 grid" :class="mediaGridCols(block.media.length)">
            <div
              v-for="(m, mi) in block.media"
              :key="mi"
              class="relative"
              style="aspect-ratio: 1;"
            >
              <img :src="m.url" :alt="m.alt ?? ''" class="w-full h-full object-cover" />
              <span v-if="m.isGif" class="absolute bottom-1.5 right-1.5 text-[10px] font-bold bg-black/60 text-white rounded px-1.5 py-0.5">GIF</span>
            </div>
          </div>

          <!-- If media-only post: author footer inside card -->
          <div v-if="!block.content && !block.poll && block.media?.length" class="px-4 py-3 flex items-center gap-2">
            <div
              class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              :style="{ background: block.avatarColor }"
            >{{ block.avatarInitials }}</div>
            <span class="text-sm font-bold text-dark flex-1">{{ block.authorName }}</span>
            <button type="button" class="rounded-xl px-4 py-2 text-xs font-semibold text-dark-50" style="background: rgba(55,55,55,0.08);">View Post</button>
          </div>

          <!-- Footer: like count + View Post -->
          <div v-else-if="block.likeCount" class="px-4 pb-4 pt-3 flex items-center gap-2">
            <button type="button" class="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-dark-40" style="background: rgba(55,55,55,0.07);">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
              {{ block.likeCount }}
            </button>
            <button type="button" class="ml-auto rounded-xl px-5 py-2 text-xs font-semibold text-dark-50" style="background: rgba(55,55,55,0.08);">View Post</button>
          </div>

        </div>

        <!-- ─── Quote card ────────────────────────────────────── -->
        <div v-else-if="block.type === 'quote'" class="rounded-2xl bg-white shadow-sm p-5 flex flex-col gap-4">
          <!-- Big quotation mark -->
          <div class="text-4xl font-black text-dark leading-none" style="font-family: Georgia, serif; line-height: 0.8;">"</div>
          <p class="text-xl font-bold text-dark leading-snug -mt-1">{{ block.text }}</p>
          <!-- Author row -->
          <div class="flex items-center gap-2.5 mt-1">
            <div
              class="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              :style="{ background: block.avatarColor }"
            >{{ block.avatarInitials }}</div>
            <span class="text-sm font-bold text-dark flex-1">{{ block.authorName }}</span>
            <button type="button" class="rounded-xl px-5 py-2 text-xs font-semibold text-dark-50" style="background: rgba(55,55,55,0.08);">View Post</button>
          </div>
        </div>

        <!-- ─── AI narrative card ─────────────────────────────── -->
        <div v-else-if="block.type === 'ai'" class="rounded-2xl bg-white shadow-sm p-5 flex flex-col gap-3">
          <p class="text-sm text-dark leading-relaxed">
            <template v-for="(part, pi) in block.parts" :key="pi">
              <a v-if="typeof part === 'object'" :href="part.link" style="color: rgb(99,100,246); text-decoration: underline;">{{ part.text }}</a>
              <span v-else>{{ part }}</span>
            </template>
          </p>
          <p class="text-sm font-bold" style="color: rgb(99,100,246);">written by AI-Experience.</p>
        </div>

      </template>
    </div>

    <!-- Fixed bottom action bar -->
    <div
      class="fixed bottom-0 inset-x-0 px-4 pb-safe pt-3 pb-5 flex items-center gap-2"
      style="background: var(--color-pastel-light, #f0ede8);"
    >
      <button
        type="button"
        class="flex-1 rounded-full py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-85"
        style="background: #1c1c1e;"
        @click="showSources = !showSources"
      >{{ showSources ? 'Hide Sources' : 'Show Sources' }}</button>

      <button
        type="button"
        class="flex-shrink-0 rounded-full px-5 py-3.5 text-sm font-bold text-white flex items-center gap-1.5 transition-opacity hover:opacity-85"
        style="background: #1c1c1e;"
        @click="cycleSpeed"
      >
        {{ speed.toFixed(1) }}x
        <svg class="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
      </button>

      <button
        type="button"
        class="flex-1 rounded-full py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-85"
        style="background: #22c55e;"
      >Continue</button>
    </div>

  </div>
</template>
