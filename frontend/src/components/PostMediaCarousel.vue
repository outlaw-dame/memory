<script setup lang="ts">
import { ref } from 'vue'

export interface CarouselMediaItem {
  type: 'image' | 'gif' | 'video' | 'audio'
  url: string
  alt?: string
  attribution?: string
  poster?: string      // for video
  filename?: string    // for audio
  duration?: number    // for audio (seconds)
}

const props = defineProps<{ items: CarouselMediaItem[] }>()

const scrollEl = ref<HTMLElement | null>(null)
const activeIndex = ref(0)

function onScroll() {
  if (!scrollEl.value) return
  const el = scrollEl.value
  const idx = Math.round(el.scrollLeft / el.clientWidth)
  activeIndex.value = Math.min(Math.max(idx, 0), props.items.length - 1)
}

function scrollTo(idx: number) {
  if (!scrollEl.value) return
  scrollEl.value.scrollTo({ left: idx * scrollEl.value.clientWidth, behavior: 'smooth' })
}
</script>

<template>
  <div class="relative w-full select-none">
    <!-- Scroll track -->
    <div
      ref="scrollEl"
      class="flex overflow-x-auto gap-2 scroll-smooth"
      style="scroll-snap-type: x mandatory; scrollbar-width: none; -webkit-overflow-scrolling: touch;"
      @scroll="onScroll"
    >
      <div
        v-for="(item, i) in items"
        :key="i"
        class="flex-shrink-0 relative rounded-2xl overflow-hidden"
        :style="items.length === 1 ? 'width:100%;min-height:200px;' : 'width:85%;min-height:180px;'"
        style="scroll-snap-align: start;"
      >
        <!-- IMAGE / GIF -->
        <template v-if="item.type === 'image' || item.type === 'gif'">
          <img
            :src="item.url"
            :alt="item.alt ?? ''"
            loading="lazy"
            class="w-full h-full object-cover"
          />
          <span v-if="item.type === 'gif'"
            class="absolute top-2 right-2 rounded bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5">
            GIF
          </span>
          <span v-if="item.attribution"
            class="absolute bottom-2 left-2 rounded bg-black/40 text-white text-caption px-2 py-0.5">
            {{ item.attribution }}
          </span>
        </template>

        <!-- VIDEO -->
        <template v-else-if="item.type === 'video'">
          <video
            :src="item.url"
            :poster="item.poster"
            class="w-full h-full object-cover"
            preload="none"
            playsinline
            muted
            loop
          />
          <!-- Play overlay -->
          <div class="absolute inset-0 flex items-center justify-center bg-black/20">
            <div class="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center">
              <svg class="w-5 h-5 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
          </div>
          <span class="absolute top-2 right-2 rounded bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5">VIDEO</span>
        </template>

        <!-- AUDIO -->
        <template v-else-if="item.type === 'audio'">
          <div class="w-full h-full bg-white flex flex-col items-center justify-center gap-3 px-4 py-6 min-h-[120px]">
            <!-- Mini waveform -->
            <div class="flex items-center gap-px h-10 w-full">
              <div
                v-for="j in 40"
                :key="j"
                class="flex-1 rounded-full"
                :style="{
                  height: `${Math.max(15, Math.min(100, 20 + 60 * Math.abs(Math.sin(j * 0.4)) * Math.abs(Math.sin(j * 0.15 + 0.5))))}%`,
                  background: 'rgba(99,100,246,0.35)',
                }"
              />
            </div>
            <div class="flex items-center gap-2 w-full">
              <svg class="w-4 h-4 flex-shrink-0" style="color:rgb(99,100,246)" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3v18M8 8v8M4 10v4M16 8v8M20 10v4"/>
              </svg>
              <span class="text-caption text-dark-50 truncate">{{ item.filename ?? 'audio.wav' }}</span>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Pagination dots -->
    <div v-if="items.length > 1" class="flex justify-center gap-1.5 mt-2">
      <button
        v-for="(_, i) in items"
        :key="i"
        type="button"
        class="rounded-full transition-all duration-200"
        :style="i === activeIndex
          ? 'width:16px;height:6px;background:rgb(99,100,246);'
          : 'width:6px;height:6px;background:rgba(55,55,55,0.2);'"
        @click="scrollTo(i)"
      />
    </div>
  </div>
</template>
