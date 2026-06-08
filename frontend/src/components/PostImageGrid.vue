<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

export interface GridImage {
  url: string
  alt?: string
  /** 'animated-gif' = converted WebP animation with tap-to-play; 'gif' = always-on embed (Klipy) */
  type?: 'image' | 'gif' | 'animated-gif'
  /** Static thumbnail shown before playback starts (animated-gif only). */
  poster?: string
  attribution?: string
}

defineProps<{ images: GridImage[] }>()

// ── Animated GIF state ──────────────────────────────────────────────────────

const playing = ref<Set<string>>(new Set())
const reducedMotion = ref(false)

function onMotionChange(e: MediaQueryListEvent) {
  reducedMotion.value = e.matches
}

let motionMq: MediaQueryList | null = null

onMounted(() => {
  motionMq = window.matchMedia('(prefers-reduced-motion: reduce)')
  reducedMotion.value = motionMq.matches
  motionMq.addEventListener('change', onMotionChange)
})

onUnmounted(() => {
  motionMq?.removeEventListener('change', onMotionChange)
})

function isAnimatedGif(img: GridImage): boolean {
  return img.type === 'animated-gif'
}

function isPlaying(img: GridImage): boolean {
  return playing.value.has(img.url)
}

function imgSrc(img: GridImage): string {
  if (!isAnimatedGif(img)) return img.url
  if (reducedMotion.value || !isPlaying(img)) return img.poster ?? img.url
  return img.url
}

function togglePlay(img: GridImage) {
  if (reducedMotion.value) return
  const next = new Set(playing.value)
  if (next.has(img.url)) next.delete(img.url)
  else next.add(img.url)
  playing.value = next
}
</script>

<template>
  <!-- ── Single image ─────────────────────────────────────────────────────── -->
  <div
    v-if="images.length === 1"
    class="rounded-2xl overflow-hidden"
  >
    <div class="relative" :class="{ 'cursor-pointer select-none': isAnimatedGif(images[0]) }">
      <img :src="imgSrc(images[0])" :alt="images[0].alt ?? ''" class="w-full max-h-72 object-cover" />
      <!-- Animated GIF overlay -->
      <div
        v-if="isAnimatedGif(images[0])"
        class="absolute inset-0 flex items-center justify-center"
        @click.stop="togglePlay(images[0])"
      >
        <div v-if="!isPlaying(images[0])" class="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
          <svg class="w-5 h-5 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </div>
        <span v-else class="absolute top-2 right-2 rounded bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5">GIF</span>
      </div>
      <span v-else-if="images[0].type === 'gif'" class="absolute top-2 right-2 rounded bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5">GIF</span>
      <span v-if="images[0].attribution" class="absolute bottom-2 left-2 rounded bg-black/40 text-white text-caption px-2 py-0.5">{{ images[0].attribution }}</span>
    </div>
  </div>

  <!-- ── 2 images ─────────────────────────────────────────────────────────── -->
  <div
    v-else-if="images.length === 2"
    class="grid grid-cols-2 gap-1 rounded-2xl overflow-hidden"
  >
    <div
      v-for="(img, i) in images"
      :key="i"
      class="relative aspect-square"
      :class="{ 'cursor-pointer select-none': isAnimatedGif(img) }"
    >
      <img :src="imgSrc(img)" :alt="img.alt ?? ''" class="w-full h-full object-cover" />
      <div
        v-if="isAnimatedGif(img)"
        class="absolute inset-0 flex items-center justify-center"
        @click.stop="togglePlay(img)"
      >
        <div v-if="!isPlaying(img)" class="w-9 h-9 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
          <svg class="w-4 h-4 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </div>
        <span v-else class="absolute top-2 right-2 rounded bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5">GIF</span>
      </div>
      <span v-else-if="img.type === 'gif'" class="absolute top-2 right-2 rounded bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5">GIF</span>
      <span v-if="img.attribution" class="absolute bottom-2 left-2 rounded bg-black/40 text-white text-caption px-2 py-0.5">{{ img.attribution }}</span>
    </div>
  </div>

  <!-- ── 3 images ─────────────────────────────────────────────────────────── -->
  <div
    v-else-if="images.length === 3"
    class="grid grid-cols-3 gap-1 rounded-2xl overflow-hidden"
  >
    <div
      v-for="(img, i) in images"
      :key="i"
      class="relative aspect-square"
      :class="{ 'cursor-pointer select-none': isAnimatedGif(img) }"
    >
      <img :src="imgSrc(img)" :alt="img.alt ?? ''" class="w-full h-full object-cover" />
      <div
        v-if="isAnimatedGif(img)"
        class="absolute inset-0 flex items-center justify-center"
        @click.stop="togglePlay(img)"
      >
        <div v-if="!isPlaying(img)" class="w-9 h-9 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
          <svg class="w-4 h-4 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </div>
        <span v-else class="absolute top-2 right-2 rounded bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5">GIF</span>
      </div>
      <span v-else-if="img.type === 'gif'" class="absolute top-2 right-2 rounded bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5">GIF</span>
      <span v-if="img.attribution" class="absolute bottom-2 left-2 rounded bg-black/40 text-white text-caption px-2 py-0.5">{{ img.attribution }}</span>
    </div>
  </div>

  <!-- ── 4 images ─────────────────────────────────────────────────────────── -->
  <div
    v-else-if="images.length === 4"
    class="grid grid-cols-2 gap-1 rounded-2xl overflow-hidden"
  >
    <div
      v-for="(img, i) in images"
      :key="i"
      class="relative aspect-square"
      :class="{ 'cursor-pointer select-none': isAnimatedGif(img) }"
    >
      <img :src="imgSrc(img)" :alt="img.alt ?? ''" class="w-full h-full object-cover" />
      <div
        v-if="isAnimatedGif(img)"
        class="absolute inset-0 flex items-center justify-center"
        @click.stop="togglePlay(img)"
      >
        <div v-if="!isPlaying(img)" class="w-9 h-9 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
          <svg class="w-4 h-4 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </div>
        <span v-else class="absolute top-2 right-2 rounded bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5">GIF</span>
      </div>
      <span v-else-if="img.type === 'gif'" class="absolute top-2 right-2 rounded bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5">GIF</span>
      <span v-if="img.attribution" class="absolute bottom-2 left-2 rounded bg-black/40 text-white text-caption px-2 py-0.5">{{ img.attribution }}</span>
    </div>
  </div>

  <!-- ── 5+ images: 3-top + 2-bottom ─────────────────────────────────────── -->
  <div v-else class="flex flex-col gap-1 rounded-2xl overflow-hidden">
    <div class="grid grid-cols-3 gap-1">
      <div
        v-for="(img, i) in images.slice(0, 3)"
        :key="i"
        class="relative aspect-square"
        :class="{ 'cursor-pointer select-none': isAnimatedGif(img) }"
      >
        <img :src="imgSrc(img)" :alt="img.alt ?? ''" class="w-full h-full object-cover" />
        <div
          v-if="isAnimatedGif(img)"
          class="absolute inset-0 flex items-center justify-center"
          @click.stop="togglePlay(img)"
        >
          <div v-if="!isPlaying(img)" class="w-9 h-9 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
            <svg class="w-4 h-4 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </div>
          <span v-else class="absolute top-2 right-2 rounded bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5">GIF</span>
        </div>
        <span v-else-if="img.type === 'gif'" class="absolute top-2 right-2 rounded bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5">GIF</span>
        <span v-if="img.attribution" class="absolute bottom-2 left-2 rounded bg-black/40 text-white text-caption px-2 py-0.5">{{ img.attribution }}</span>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-1">
      <div
        v-for="(img, i) in images.slice(3)"
        :key="i + 3"
        class="relative aspect-square"
        :class="{ 'cursor-pointer select-none': isAnimatedGif(img) }"
      >
        <img :src="imgSrc(img)" :alt="img.alt ?? ''" class="w-full h-full object-cover" />
        <div
          v-if="isAnimatedGif(img)"
          class="absolute inset-0 flex items-center justify-center"
          @click.stop="togglePlay(img)"
        >
          <div v-if="!isPlaying(img)" class="w-9 h-9 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
            <svg class="w-4 h-4 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          </div>
          <span v-else class="absolute top-2 right-2 rounded bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5">GIF</span>
        </div>
        <span v-else-if="img.type === 'gif'" class="absolute top-2 right-2 rounded bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5">GIF</span>
        <span v-if="img.attribution" class="absolute bottom-2 left-2 rounded bg-black/40 text-white text-caption px-2 py-0.5">{{ img.attribution }}</span>
      </div>
    </div>
  </div>
</template>
