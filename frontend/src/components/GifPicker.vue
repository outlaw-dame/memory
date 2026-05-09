<script setup lang="ts">
/**
 * GifPicker — Klipy-powered GIF picker.
 *
 * Tabs: Trending | Recent  (search replaces both when a query is typed)
 * Emits `select` with the chosen KlipyGif so the parent can embed it.
 */
import { onMounted, reactive, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useKlipy, getThumbUrl, type KlipyGif } from '@/composables/useKlipy'

const emit = defineEmits<{ select: [gif: KlipyGif] }>()

const authStore = useAuthStore()
const customerId = buildKlipyCustomerId(authStore.user)
const klipy = useKlipy(customerId)

function buildKlipyCustomerId(user: typeof authStore.user): string {
  const id = user?.id
  if (typeof id === 'number' && Number.isFinite(id)) return `memory-user-${id}`
  return 'guest'
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

type Tab = 'trending' | 'recent'

const activeTab = ref<Tab>('trending')
const query = ref('')
const gifs = ref<KlipyGif[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
const hasMore = ref(false)
const currentPage = ref(1)

// Track which thumbnails have finished loading for blur → real transition
const gifLoaded = reactive<Record<string, boolean>>({})

// Debounce timer
let searchTimer: ReturnType<typeof setTimeout> | null = null

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

async function load(append = false) {
  if (isLoading.value) return
  isLoading.value = true
  error.value = null

  try {
    const page = append ? currentPage.value + 1 : 1
    let result

    if (query.value.trim()) {
      result = await klipy.search(query.value.trim(), page)
    } else if (activeTab.value === 'recent') {
      result = await klipy.recent(page)
    } else {
      result = await klipy.trending(page)
    }

    gifs.value = append ? [...gifs.value, ...result.data] : result.data
    hasMore.value = result.has_next
    currentPage.value = result.current_page
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load GIFs'
  } finally {
    isLoading.value = false
  }
}

function onQueryInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => load(false), 350)
}

watch(activeTab, () => {
  query.value = ''
  load(false)
})

onMounted(() => load(false))

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

async function selectGif(gif: KlipyGif) {
  klipy.trackShare(gif.slug) // fire-and-forget
  emit('select', gif)
}
</script>

<template>
  <div class="flex flex-col gap-2 rounded-xl bg-pastel-light p-3">

    <!-- Search input -->
    <div class="relative">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-dark-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
      </svg>
      <input
        v-model="query"
        class="w-full rounded-full bg-white pl-8 pr-3 py-2 text-footnote text-dark outline-none border border-dark-10 placeholder-dark-20"
        placeholder="Search KLIPY"
        @input="onQueryInput"
      />
      <button
        v-if="query"
        class="absolute right-3 top-1/2 -translate-y-1/2 text-dark-50 hover:text-dark"
        @click="query = ''; load(false)"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </button>
    </div>

    <!-- Tabs (hidden while searching) -->
    <div v-if="!query" class="flex gap-1.5">
      <button
        v-for="tab in (['trending', 'recent'] as Tab[])"
        :key="tab"
        class="rounded-full px-3 py-1 text-caption font-semibold capitalize transition-colors"
        :class="activeTab === tab
          ? 'text-white'
          : 'bg-white text-dark-50 hover:bg-dark-10'"
        :style="activeTab === tab ? 'background: var(--color-accent);' : ''"
        @click="activeTab = tab"
      >
        {{ tab }}
      </button>
    </div>

    <!-- Loading skeleton -->
    <div v-if="isLoading && gifs.length === 0" class="grid grid-cols-3 gap-1.5">
      <div
        v-for="i in 9"
        :key="i"
        class="aspect-square rounded-lg bg-dark-10 animate-pulse"
      />
    </div>

    <!-- Error state -->
    <p v-else-if="error" class="text-caption text-red-500 text-center py-4">{{ error }}</p>

    <!-- Empty state -->
    <p v-else-if="!isLoading && gifs.length === 0" class="text-caption text-dark-50 text-center py-4">
      {{ activeTab === 'recent' ? 'No recently used GIFs.' : 'No GIFs found.' }}
    </p>

    <!-- GIF grid -->
    <div v-else class="grid grid-cols-3 gap-1.5 max-h-56 overflow-y-auto">
      <button
        v-for="gif in gifs"
        :key="gif.slug"
        class="relative aspect-square rounded-lg overflow-hidden group focus:outline-none focus:ring-2 focus:ring-indigo-400"
        :title="gif.title"
        @click="selectGif(gif)"
      >
        <!-- Blur placeholder -->
        <img
          :src="gif.blur_preview"
          class="absolute inset-0 w-full h-full object-cover"
          :class="gifLoaded[gif.slug] ? 'opacity-0' : 'opacity-100'"
          aria-hidden="true"
        />
        <!-- Real thumbnail -->
        <img
          :src="getThumbUrl(gif)"
          :alt="gif.title"
          loading="lazy"
          class="absolute inset-0 w-full h-full object-cover transition-opacity duration-200"
          :class="gifLoaded[gif.slug] ? 'opacity-100' : 'opacity-0'"
          @load="gifLoaded[gif.slug] = true"
        />
        <!-- Hover overlay -->
        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
      </button>
    </div>

    <!-- Load more -->
    <button
      v-if="hasMore && gifs.length > 0"
      class="rounded-full py-1.5 text-caption font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
      style="background: color-mix(in srgb, var(--color-accent) 10%, transparent); color: var(--color-accent);"
      :disabled="isLoading"
      @click="load(true)"
    >
      {{ isLoading ? 'Loading…' : 'Load more' }}
    </button>

    <!-- Powered by -->
    <p class="text-caption text-dark-20 text-center">Powered by Klipy</p>

  </div>
</template>
