<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import { useAtBridgeStore, type StoryGroup, type StoryItem } from '@/stores/atBridgeStore'

const props = defineProps<{
  groups: StoryGroup[]
  initialGroupIndex: number
}>()

const emit = defineEmits<{
  close: []
  deleted: []
}>()

const atBridgeStore = useAtBridgeStore()
const groupIndex = ref(Math.max(0, props.initialGroupIndex))
const itemIndex = ref(0)
const progress = ref(0)
const isDeleting = ref(false)
let progressTimer: number | null = null

const currentGroup = computed(() => props.groups[groupIndex.value] ?? null)
const currentItem = computed<StoryItem | null>(() => currentGroup.value?.items[itemIndex.value] ?? null)

function close() {
  emit('close')
}

function clearProgressTimer() {
  if (progressTimer !== null) {
    window.clearInterval(progressTimer)
    progressTimer = null
  }
}

function startProgress() {
  clearProgressTimer()
  progress.value = 0
  const item = currentItem.value
  if (!item) return
  const duration = item.media.kind === 'video'
    ? Math.min(Math.max(item.media.durationMs ?? 8000, 5000), 60_000)
    : 5000
  const startedAt = Date.now()
  progressTimer = window.setInterval(() => {
    progress.value = Math.min(100, ((Date.now() - startedAt) / duration) * 100)
    if (progress.value >= 100) next()
  }, 90)
}

function next() {
  const group = currentGroup.value
  if (!group) return close()
  if (itemIndex.value < group.items.length - 1) {
    itemIndex.value += 1
    return
  }
  if (groupIndex.value < props.groups.length - 1) {
    groupIndex.value += 1
    itemIndex.value = 0
    return
  }
  close()
}

function previous() {
  if (itemIndex.value > 0) {
    itemIndex.value -= 1
    return
  }
  if (groupIndex.value > 0) {
    groupIndex.value -= 1
    itemIndex.value = Math.max(0, (currentGroup.value?.items.length ?? 1) - 1)
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
  if (event.key === 'ArrowRight') next()
  if (event.key === 'ArrowLeft') previous()
}

async function deleteCurrentStory() {
  const item = currentItem.value
  if (!item?.viewerCanDelete) return
  isDeleting.value = true
  try {
    const ok = await atBridgeStore.deleteStory(item.uri)
    if (ok) {
      emit('deleted')
      close()
    }
  } finally {
    isDeleting.value = false
  }
}

function expiryLabel(item: StoryItem): string {
  const hours = Math.floor(item.expiresInSeconds / 3600)
  const minutes = Math.max(1, Math.floor((item.expiresInSeconds % 3600) / 60))
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
}

function linkLabel(link: { uri: string; title?: string }): string {
  if (link.title) return link.title
  try {
    return new URL(link.uri).hostname
  } catch {
    return link.uri
  }
}

watch(
  currentItem,
  item => {
    if (!item) return
    void atBridgeStore.markStoriesViewed([item.uri])
    startProgress()
  },
  { immediate: true },
)

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  clearProgressTimer()
})
</script>

<template>
  <div class="fixed inset-0 z-50 bg-black text-white">
    <div v-if="currentGroup && currentItem" class="relative flex h-full w-full items-center justify-center overflow-hidden">
      <div class="absolute left-3 right-3 top-3 z-20 flex gap-1">
        <span
          v-for="(item, index) in currentGroup.items"
          :key="item.uri"
          class="h-1 flex-1 overflow-hidden rounded-full bg-white/30"
        >
          <span
            class="block h-full rounded-full bg-white"
            :style="{ width: `${index < itemIndex ? 100 : index === itemIndex ? progress : 0}%` }"
          />
        </span>
      </div>

      <header class="absolute left-3 right-3 top-7 z-20 flex items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-2">
          <span class="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-white/15 text-xs font-bold">
            <img v-if="currentGroup.actor.avatarUrl" :src="currentGroup.actor.avatarUrl" alt="" class="h-full w-full object-cover">
            <span v-else>{{ (currentGroup.actor.displayName || currentGroup.actor.handle || 'ME').slice(0, 2).toUpperCase() }}</span>
          </span>
          <div class="min-w-0">
            <p class="truncate text-sm font-bold">{{ currentGroup.actor.isViewer ? 'You' : currentGroup.actor.displayName || currentGroup.actor.handle || currentGroup.actor.did }}</p>
            <p class="text-xs text-white/70">{{ expiryLabel(currentItem) }}</p>
          </div>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <button
            v-if="currentItem.viewerCanDelete"
            type="button"
            class="grid h-9 w-9 place-items-center rounded-full bg-white/15"
            aria-label="Delete story"
            :disabled="isDeleting"
            @click="deleteCurrentStory"
          >
            <AppIcon :name="isDeleting ? 'loader' : 'trash'" :size="18" :class="{ 'animate-spin': isDeleting }" />
          </button>
          <button
            type="button"
            class="grid h-9 w-9 place-items-center rounded-full bg-white/15"
            aria-label="Close story viewer"
            @click="close"
          >
            <AppIcon name="close" :size="20" />
          </button>
        </div>
      </header>

      <button
        type="button"
        class="absolute left-0 top-0 z-10 h-full w-1/3"
        aria-label="Previous story"
        @click="previous"
      />
      <button
        type="button"
        class="absolute right-0 top-0 z-10 h-full w-1/3"
        aria-label="Next story"
        @click="next"
      />

      <video
        v-if="currentItem.media.kind === 'video' && currentItem.media.url"
        :key="currentItem.uri"
        :src="currentItem.media.url"
        class="h-full w-full object-contain"
        autoplay
        muted
        playsinline
        @ended="next"
      />
      <img
        v-else-if="currentItem.media.url"
        :src="currentItem.media.url"
        :alt="currentItem.media.alt"
        class="h-full w-full object-contain"
      >
      <div v-else class="px-8 text-center text-sm text-white/70">
        {{ currentItem.media.alt }}
      </div>

      <footer
        v-if="currentItem.text || currentItem.links.length"
        class="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent px-4 pb-6 pt-24"
      >
        <p v-if="currentItem.text" class="text-base font-semibold leading-snug">{{ currentItem.text }}</p>
        <div v-if="currentItem.links.length" class="mt-3 flex flex-wrap gap-2">
          <a
            v-for="link in currentItem.links"
            :key="link.uri"
            :href="link.uri"
            target="_blank"
            rel="noopener noreferrer"
            class="rounded-full bg-white px-3 py-2 text-sm font-bold text-black"
          >
            {{ linkLabel(link) }}
          </a>
        </div>
      </footer>
    </div>
  </div>
</template>
