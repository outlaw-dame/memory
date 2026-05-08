<script setup lang="ts">
const emit = defineEmits<{ close: []; highlightSources: []; reSummarize: [] }>()
</script>

<template>
  <div
    class="rounded-3xl p-5 relative overflow-hidden"
    style="background: linear-gradient(135deg, rgb(99,100,246) 0%, rgb(168,85,247) 100%);"
  >
    <!-- Close button -->
    <button
      type="button"
      class="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
      @click="emit('close')"
    >
      <svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
      </svg>
    </button>

    <!-- Title -->
    <p class="text-h2 font-black text-white mb-5" style="font-size: 1.35rem; letter-spacing: -0.02em;">
      ai interpolator.
    </p>

    <!-- Skeleton lines -->
    <div class="flex flex-col gap-2.5 mb-6">
      <div class="h-3 rounded-full bg-white/25 w-full" />
      <div class="h-3 rounded-full bg-white/25 w-[88%]" />
      <div class="h-3 rounded-full bg-white/25 w-[75%]" />
      <div class="h-3 rounded-full bg-white/25 w-full" />
    </div>

    <!-- Action buttons -->
    <div class="flex items-center gap-3">
      <button
        type="button"
        class="flex-1 py-3 rounded-2xl text-footnote font-semibold text-white transition-opacity hover:opacity-80"
        style="background: rgba(0,0,0,0.35);"
        @click="emit('highlightSources')"
      >
        Highlight Sources
      </button>
      <button
        type="button"
        class="flex-1 py-3 rounded-2xl text-footnote font-semibold text-white transition-opacity hover:opacity-80"
        style="background: rgba(255,255,255,0.18);"
        @click="emit('reSummarize')"
      >
        Re-Summarize
      </button>
    </div>
  </div>
</template>
