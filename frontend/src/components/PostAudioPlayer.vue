<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  filename?: string
  duration?: number   // seconds, default 84 (1:24)
  startAt?: number    // seconds, default 30
}>()

const totalDuration = computed(() => props.duration ?? 84)
const currentTime = ref(props.startAt ?? 30)
const isPlaying = ref(false)

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.round(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function toggle() {
  isPlaying.value = !isPlaying.value
}

const progress = computed(() => currentTime.value / totalDuration.value)

// Deterministic waveform bar heights derived from bar index
function barHeight(i: number): number {
  const t = i / 55
  const h = 0.15 + 0.7 * Math.abs(
    Math.sin(t * Math.PI * 5.2) * Math.sin(t * Math.PI * 1.8 + 0.4)
  )
  return Math.max(0.08, Math.min(1, h))
}
const BAR_COUNT = 56
</script>

<template>
  <div class="rounded-2xl bg-white border border-dark-10 p-4">
    <!-- Waveform -->
    <div class="flex items-center gap-px h-12 w-full mb-3">
      <div
        v-for="i in BAR_COUNT"
        :key="i"
        class="flex-1 rounded-full transition-colors duration-75"
        :style="{
          height: `${barHeight(i - 1) * 100}%`,
          background: (i - 1) / BAR_COUNT <= progress
            ? 'var(--color-accent)'
            : 'color-mix(in srgb, var(--color-accent) 18%, transparent)',
        }"
      />
    </div>

    <!-- Controls row -->
    <div class="flex items-center justify-between">
      <span class="text-caption text-dark-50">{{ props.filename ?? 'audiofile.wav' }}</span>
      <div class="flex items-center gap-3">
        <span class="text-caption text-dark-50">
          {{ formatTime(currentTime) }} / {{ formatTime(totalDuration) }}
        </span>
        <button
          type="button"
          class="w-9 h-9 rounded-full bg-dark-10 flex items-center justify-center flex-shrink-0 hover:bg-dark-20 transition-colors"
          @click="toggle"
        >
          <!-- Play icon -->
          <svg v-if="!isPlaying" class="w-4 h-4 text-dark ml-0.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
          <!-- Pause icon -->
          <svg v-else class="w-4 h-4 text-dark" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
