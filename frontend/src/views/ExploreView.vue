<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import UnifiedFeedList from '@/components/UnifiedFeedList.vue'
import PostEmbedCard from '@/components/PostEmbedCard.vue'
import { useFollow } from '@/composables/useFollow'

const router = useRouter()
const { follow, isFollowing } = useFollow()

// -----------------------------------------------------------------------
// Search state
// -----------------------------------------------------------------------
const searchQuery = ref('')
const isSearchFocused = ref(false)
const submittedQuery = ref('')

// Three modes: 'default' | 'history' | 'results'
const mode = computed(() => {
  if (submittedQuery.value) return 'results'
  if (isSearchFocused.value) return 'history'
  return 'default'
})

// Parse query intent from prefix
type SearchType = 'user' | 'tag' | 'general'
const searchType = computed<SearchType>(() => {
  const q = submittedQuery.value
  if (q.startsWith('user=')) return 'user'
  if (q.startsWith('#')) return 'tag'
  return 'general'
})
const searchTerm = computed(() => {
  const q = submittedQuery.value
  if (q.startsWith('user=')) return q.slice(5).trim()
  if (q.startsWith('#')) return q.slice(1).trim()
  return q
})
// Mock "no results" — simulate by detecting long random strings (no spaces, >18 chars)
const hasResults = computed(() => {
  const t = submittedQuery.value
  return !(t.length > 18 && !t.includes(' ') && !t.startsWith('#') && !t.startsWith('user='))
})

// -----------------------------------------------------------------------
// Search history
// -----------------------------------------------------------------------
const searchHistory = ref(['David Noé', 'Apple News', '#dog', 'Sugus', 'dame.outlaw', '#tesla'])

function removeHistoryItem(i: number) { searchHistory.value.splice(i, 1) }
function clearSearchHistory() { searchHistory.value = [] }
function selectHistoryItem(item: string) {
  searchQuery.value = item
  submitSearch()
}

function submitSearch() {
  const q = searchQuery.value.trim()
  if (!q) return
  submittedQuery.value = q
  if (!searchHistory.value.includes(q)) searchHistory.value.unshift(q)
  isSearchFocused.value = false
}

function exitSearch() {
  searchQuery.value = ''
  submittedQuery.value = ''
  isSearchFocused.value = false
}

// -----------------------------------------------------------------------
// Tag follow state
// -----------------------------------------------------------------------
const followedTags = ref<Set<string>>(new Set(['cats']))
function toggleTag(tag: string) {
  if (followedTags.value.has(tag)) followedTags.value.delete(tag)
  else followedTags.value.add(tag)
}

// -----------------------------------------------------------------------
// Mock data
// -----------------------------------------------------------------------
const trendingTags = [
  { tag: 'memory',   count: '1.4M posts' },
  { tag: 'cats',     count: '2.5M posts' },
  { tag: 'tesla',    count: '347k posts' },
  { tag: 'apple',    count: '890k posts' },
]

const recommendedTags = [
  { tag: 'activitypub', count: '128k posts' },
  { tag: 'federated',   count: '94k posts' },
  { tag: 'atproto',     count: '215k posts' },
  { tag: 'opensource',  count: '1.1M posts' },
]

const people = [
  { id: 'at://davidnoeee', name: 'David Noé',  handle: '@davidnoeee',    initials: 'DN', color: '#2d2d2d' },
  { id: 'at://andrew',     name: 'Andrew',      handle: '@andrew.design', initials: 'AN', color: '#4a4a4a' },
  { id: 'at://user1949',   name: 'New User',    handle: '@user1949',      initials: 'NU', color: '#888' },
  { id: 'at://sugus',      name: 'Sugus',       handle: '@sugus',         initials: 'SG', color: '#5a7a5a' },
]

// Demo embed for Posts section in results
const demoPost = {
  authorName: 'David Noé', avatarInitials: 'DN', avatarColor: '#2d2d2d',
  federationDomain: 'fosstodon.org', timeAgo: '7 mins ago',
  content: 'Heya! This is the first post on this new platform called Memory! :)',
  embed: {
    id: 43, authorName: 'David Noé', avatarInitials: 'DN', avatarColor: '#2d2d2d',
    federationDomain: 'fosstodon.org', timeAgo: '7 mins ago',
    content: 'This is an embed post! You will only see the first embed item of this post, the rest is available at pop-up/fullscreen view.',
    media: [
      { type: 'image' as const, url: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=400&h=400&fit=crop', alt: 'shadow' },
    ],
  },
}
</script>

<template>
  <div class="min-h-screen flex flex-col" style="background: var(--color-pastel-light, #f2f0ec);">

    <!-- ================================================================
         HEADER — switches layout based on mode
    ================================================================ -->

    <!-- Default / History header: "explore." title + search bar -->
    <div
      v-if="mode !== 'results'"
      class="px-4 pt-4 pb-3 sticky top-0 z-20"
      style="background: var(--color-pastel-light, #f2f0ec);"
    >
      <div class="relative flex items-center justify-center mb-3">
        <button
          type="button"
          class="absolute left-0 w-9 h-9 flex items-center justify-center rounded-full"
          style="background: rgba(55,55,55,0.1); color: rgba(55,55,55,0.6);"
          @click="router.back()"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <h1 class="font-black text-dark" style="font-size: 1.75rem; letter-spacing: -0.04em;">explore.</h1>
        <button
          type="button"
          class="absolute right-0 w-9 h-9 flex items-center justify-center rounded-full"
          style="background: rgba(55,55,55,0.1); color: rgba(55,55,55,0.6);"
          @click="router.back()"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      <form @submit.prevent="submitSearch">
        <div class="relative">
          <div class="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-dark-40 flex-shrink-0" />
          <input
            v-model="searchQuery"
            type="search"
            class="w-full rounded-full bg-white pl-9 pr-4 py-3 text-sm text-dark outline-none placeholder-dark-30"
            placeholder="Search posts/tags/users..."
            @focus="isSearchFocused = true"
            @blur="isSearchFocused = submittedQuery.length > 0 ? false : isSearchFocused"
          />
        </div>
      </form>
    </div>

    <!-- Results header: back button + search bar only (no title) -->
    <div
      v-else
      class="px-4 pt-4 pb-3 sticky top-0 z-20 flex items-center gap-3"
      style="background: var(--color-pastel-light, #f2f0ec);"
    >
      <button
        type="button"
        class="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full"
        style="background: rgba(55,55,55,0.1); color: rgba(55,55,55,0.6);"
        @click="exitSearch"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </button>

      <form class="flex-1" @submit.prevent="submitSearch">
        <div class="relative">
          <div class="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-dark-40 flex-shrink-0" />
          <input
            v-model="searchQuery"
            type="search"
            class="w-full rounded-full bg-white pl-9 pr-4 py-3 text-sm text-dark outline-none"
          />
        </div>
      </form>
    </div>

    <!-- ================================================================
         HISTORY panel
    ================================================================ -->
    <div v-if="mode === 'history'" class="flex-1 px-4 pt-2 pb-28 flex flex-col gap-2">
      <div class="flex justify-end mb-1">
        <button
          type="button"
          class="flex items-center gap-1.5 rounded-full px-4 py-2 text-footnote font-semibold"
          style="background: rgba(239,68,68,0.12); color: rgb(239,68,68);"
          @click="clearSearchHistory"
        >
          Clear Search History
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>

      <div
        v-for="(item, i) in searchHistory"
        :key="i"
        class="flex items-center rounded-2xl bg-white px-4 py-3 cursor-pointer hover:bg-dark-5 transition-colors"
        @click="selectHistoryItem(item)"
      >
        <span class="flex-1 text-sm text-dark font-medium">{{ item }}</span>
        <button
          type="button"
          class="w-7 h-7 flex items-center justify-center rounded-full text-dark-30 hover:bg-dark-10 transition-colors"
          @click.stop="removeHistoryItem(i)"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
    </div>

    <!-- ================================================================
         SEARCH RESULTS
    ================================================================ -->
    <div v-else-if="mode === 'results'" class="flex-1 overflow-y-auto px-4 pb-28 pt-2 flex flex-col gap-4">

      <!-- Subtitle -->
      <p class="text-sm text-dark text-center leading-snug px-6">
        {{ searchType === 'user' ? 'User-results for' : 'Results for' }}
        <strong>"{{ searchTerm }}"</strong>
      </p>

      <!-- ── NO RESULTS ───────────────────────────────────────────── -->
      <div v-if="!hasResults" class="flex-1 flex flex-col items-center justify-center gap-2 py-28">
        <p class="text-base font-bold text-dark">No results found...</p>
        <p class="text-sm text-dark-40">Maybe a typo?</p>
      </div>

      <!-- ── USER-ONLY RESULTS ─────────────────────────────────────── -->
      <template v-else-if="searchType === 'user'">
        <div class="rounded-2xl bg-white overflow-hidden">
          <div
            v-for="(person, i) in people"
            :key="person.id"
            class="flex items-center gap-3 px-4 py-3"
            :class="i < people.length - 1 ? 'border-b border-dark-5' : ''"
          >
            <div
              class="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              :style="{ background: person.color }"
            >{{ person.initials }}</div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold text-dark">{{ person.name }}</p>
              <p class="text-xs text-dark-50">{{ person.handle }}</p>
            </div>
            <button
              type="button"
              class="rounded-xl px-5 py-2 text-sm font-bold flex-shrink-0 transition-colors"
              :style="isFollowing(person.id)
                ? 'background:rgba(55,55,55,0.1);color:rgba(55,55,55,0.55);'
                : 'background:rgb(99,100,246);color:#fff;'"
              @click="follow(person.id)"
            >{{ isFollowing(person.id) ? 'Unfollow' : 'Follow' }}</button>
          </div>
        </div>
      </template>

      <!-- ── GENERAL RESULTS ───────────────────────────────────────── -->
      <template v-else>

        <!-- AI Story card (dark) -->
        <div class="rounded-2xl flex items-center gap-3 px-4 py-4" style="background: #2c2c2e;">
          <p class="flex-1 text-sm font-medium text-white leading-snug">
            Experience an AI-generated story based on your search input!
          </p>
          <button
            type="button"
            class="flex-shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold text-white"
            style="background: rgb(99,100,246);"
          >
            Launch!
          </button>
        </div>

        <!-- Users section -->
        <div>
          <p class="text-base font-bold text-dark mb-2 px-1">Users</p>
          <div class="rounded-2xl bg-white overflow-hidden">
            <div
              v-for="(person, i) in people"
              :key="person.id"
              class="flex items-center gap-3 px-4 py-3"
              :class="i < people.length - 1 ? 'border-b border-dark-5' : ''"
            >
              <div
                class="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                :style="{ background: person.color }"
              >{{ person.initials }}</div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-dark">{{ person.name }}</p>
                <p class="text-xs text-dark-50">{{ person.handle }}</p>
              </div>
              <button
                type="button"
                class="rounded-xl px-5 py-2 text-sm font-bold flex-shrink-0 transition-colors"
                :style="isFollowing(person.id)
                  ? 'background:rgba(55,55,55,0.1);color:rgba(55,55,55,0.55);'
                  : 'background:rgb(99,100,246);color:#fff;'"
                @click="follow(person.id)"
              >{{ isFollowing(person.id) ? 'Unfollow' : 'Follow' }}</button>
            </div>
          </div>
          <div class="flex justify-end mt-1.5 pr-1">
            <button type="button" class="text-xs font-semibold" style="color: rgba(99,100,246,0.55);">View more...</button>
          </div>
        </div>

        <!-- Tags section -->
        <div>
          <p class="text-base font-bold text-dark mb-2 px-1">Tags</p>
          <div class="rounded-2xl bg-white overflow-hidden">
            <div
              v-for="(t, i) in trendingTags"
              :key="t.tag"
              class="flex items-center gap-3 px-4 py-3"
              :class="i < trendingTags.length - 1 ? 'border-b border-dark-5' : ''"
            >
              <div class="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style="background: rgba(99,100,246,0.12);">
                <span class="text-lg font-black" style="color: rgb(99,100,246);">#</span>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-dark">#{{ t.tag }}</p>
                <p class="text-xs text-dark-50">{{ t.count }}</p>
              </div>
              <button
                type="button"
                class="rounded-xl px-5 py-2 text-sm font-bold flex-shrink-0 transition-colors"
                :style="followedTags.has(t.tag)
                  ? 'background:rgba(55,55,55,0.1);color:rgba(55,55,55,0.55);'
                  : 'background:rgb(99,100,246);color:#fff;'"
                @click="toggleTag(t.tag)"
              >{{ followedTags.has(t.tag) ? 'Followed' : 'Follow' }}</button>
            </div>
          </div>
          <div class="flex justify-end mt-1.5 pr-1">
            <button type="button" class="text-xs font-semibold" style="color: rgba(99,100,246,0.55);">View more...</button>
          </div>
        </div>

        <!-- Posts section -->
        <div>
          <p class="text-base font-bold text-dark mb-2 px-1">Posts</p>
          <div class="rounded-2xl bg-white p-4 flex flex-col gap-3">
            <div class="flex items-start gap-3">
              <div class="h-11 w-11 flex-shrink-0 flex items-center justify-center rounded-full text-white text-sm font-bold" :style="{ background: demoPost.avatarColor }">
                {{ demoPost.avatarInitials }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5">
                  <span class="text-sm font-bold text-dark">{{ demoPost.authorName }}</span>
                  <span class="flex items-center justify-center w-4 h-4 rounded-full flex-shrink-0" style="background:#1d9bf0;">
                    <svg class="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                  </span>
                </div>
                <div class="flex items-center gap-1 mt-0.5">
                  <span class="text-xs text-dark-50">{{ demoPost.timeAgo }}</span>
                  <span class="text-xs font-semibold" style="color:#22c55e;">· {{ demoPost.federationDomain }}</span>
                </div>
              </div>
              <button type="button" class="rounded-xl px-4 py-1.5 text-xs font-bold text-white flex-shrink-0" style="background:rgb(99,100,246);">Follow</button>
            </div>
            <p class="text-sm text-dark leading-snug">{{ demoPost.content }}</p>
            <PostEmbedCard :post="demoPost.embed" />
          </div>
        </div>

      </template>

    </div>

    <!-- ================================================================
         DEFAULT explore content
    ================================================================ -->
    <div v-else class="flex-1 overflow-y-auto px-4 pb-28 pt-3 flex flex-col gap-4">

      <!-- Trending Tags -->
      <div>
        <p class="text-base font-bold text-dark mb-2 px-1">Trending Tags</p>
        <div class="rounded-2xl bg-white overflow-hidden">
          <div
            v-for="(t, i) in trendingTags"
            :key="t.tag"
            class="flex items-center gap-3 px-4 py-3"
            :class="i < trendingTags.length - 1 ? 'border-b border-dark-5' : ''"
          >
            <div class="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style="background: rgba(99,100,246,0.12);">
              <span class="text-lg font-black" style="color: rgb(99,100,246);">#</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold text-dark">#{{ t.tag }}</p>
              <p class="text-xs text-dark-50">{{ t.count }}</p>
            </div>
            <button
              type="button"
              class="rounded-xl px-5 py-2 text-sm font-bold flex-shrink-0 transition-colors"
              :style="followedTags.has(t.tag)
                ? 'background:rgba(55,55,55,0.1);color:rgba(55,55,55,0.55);'
                : 'background:rgb(99,100,246);color:#fff;'"
              @click="toggleTag(t.tag)"
            >{{ followedTags.has(t.tag) ? 'Followed' : 'Follow' }}</button>
          </div>
        </div>
      </div>

      <!-- Recommended Tags -->
      <div>
        <p class="text-base font-bold text-dark mb-2 px-1">Recommended Tags</p>
        <div class="rounded-2xl bg-white overflow-hidden">
          <div
            v-for="(t, i) in recommendedTags"
            :key="t.tag"
            class="flex items-center gap-3 px-4 py-3"
            :class="i < recommendedTags.length - 1 ? 'border-b border-dark-5' : ''"
          >
            <div class="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style="background: rgba(99,100,246,0.08);">
              <span class="text-lg font-black" style="color: rgba(99,100,246,0.7);">#</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold text-dark">#{{ t.tag }}</p>
              <p class="text-xs text-dark-50">{{ t.count }}</p>
            </div>
            <button
              type="button"
              class="rounded-xl px-5 py-2 text-sm font-bold flex-shrink-0 transition-colors"
              :style="followedTags.has(t.tag)
                ? 'background:rgba(55,55,55,0.1);color:rgba(55,55,55,0.55);'
                : 'background:rgb(99,100,246);color:#fff;'"
              @click="toggleTag(t.tag)"
            >{{ followedTags.has(t.tag) ? 'Followed' : 'Follow' }}</button>
          </div>
        </div>
      </div>

      <!-- Recommended People -->
      <div>
        <p class="text-base font-bold text-dark mb-2 px-1">Recommended People</p>
        <div class="rounded-2xl bg-white overflow-hidden">
          <div
            v-for="(person, i) in people"
            :key="person.id"
            class="flex items-center gap-3 px-4 py-3"
            :class="i < people.length - 1 ? 'border-b border-dark-5' : ''"
          >
            <div
              class="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              :style="{ background: person.color }"
            >{{ person.initials }}</div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold text-dark">{{ person.name }}</p>
              <p class="text-xs text-dark-50">{{ person.handle }}</p>
            </div>
            <button
              type="button"
              class="rounded-xl px-5 py-2 text-sm font-bold flex-shrink-0 transition-colors"
              :style="isFollowing(person.id)
                ? 'background:rgba(55,55,55,0.1);color:rgba(55,55,55,0.55);'
                : 'background:rgb(99,100,246);color:#fff;'"
              @click="follow(person.id)"
            >{{ isFollowing(person.id) ? 'Unfollow' : 'Follow' }}</button>
          </div>
        </div>
      </div>

      <!-- Live feed -->
      <div>
        <p class="text-base font-bold text-dark mb-2 px-1">Latest Posts</p>
        <UnifiedFeedList mode="balanced" />
      </div>

    </div>

  </div>
</template>
