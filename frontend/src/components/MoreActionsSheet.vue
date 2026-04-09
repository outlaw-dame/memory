<script setup lang="ts">
import type { UnifiedFeedItem } from '@/stores/atBridgeStore'

const props = defineProps<{ item: UnifiedFeedItem }>()
const emit = defineEmits<{ close: [] }>()

function getPostLink(): string {
  return props.item.objectUri ?? props.item.atUri ?? window.location.href
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(getPostLink())
  } catch {
    /* ignore */
  }
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <div
      class="fixed inset-0 z-40 bg-black/30"
      @click="emit('close')"
    />

    <!-- Sheet -->
    <div class="fixed bottom-0 left-0 right-0 z-50 rounded-t-[28px] bg-pastel-light pb-safe animate-slide-up">

      <!-- Drag handle -->
      <div class="flex justify-center pt-3 pb-1">
        <div class="w-9 h-1 rounded-full bg-dark-20" />
      </div>

      <!-- Header -->
      <div class="px-6 pt-4 pb-5">
        <p class="text-h2 font-bold text-dark">More Actions</p>
        <p class="text-footnote text-dark-50 mt-0.5">Perform different interactions with the post and its creator</p>
      </div>

      <!-- Divider -->
      <div class="h-px bg-dark-10 mx-6" />

      <!-- Actions -->
      <ul class="py-2">

        <!-- Language -->
        <li class="flex items-center gap-4 px-6 py-4">
          <div class="w-10 h-10 flex items-center justify-center rounded-xl bg-dark-10 flex-shrink-0">
            <svg class="w-5 h-5 text-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-subHeader font-semibold text-dark">Language</p>
            <p class="text-caption text-dark-50 mt-0.5">Translate the post.</p>
          </div>
          <span class="rounded-full bg-dark-10 px-3 py-1 text-footnote font-semibold text-dark flex-shrink-0">English</span>
        </li>

        <li class="h-px bg-dark-10 mx-6" />

        <!-- Save -->
        <li>
          <button class="flex items-center gap-4 px-6 py-4 w-full text-left hover:bg-dark-5 transition-colors" @click="emit('close')">
            <div class="w-10 h-10 flex items-center justify-center rounded-xl bg-dark-10 flex-shrink-0">
              <svg class="w-5 h-5 text-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
              </svg>
            </div>
            <p class="text-subHeader font-semibold text-dark">Save</p>
          </button>
        </li>

        <li class="h-px bg-dark-10 mx-6" />

        <!-- Copy Link -->
        <li>
          <button class="flex items-center gap-4 px-6 py-4 w-full text-left hover:bg-dark-5 transition-colors" @click="copyLink">
            <div class="w-10 h-10 flex items-center justify-center rounded-xl bg-dark-10 flex-shrink-0">
              <svg class="w-5 h-5 text-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
              </svg>
            </div>
            <p class="text-subHeader font-semibold text-dark">Copy Link</p>
          </button>
        </li>

        <li class="h-px bg-dark-10 mx-6" />

        <!-- Block user -->
        <li>
          <button class="flex items-center gap-4 px-6 py-4 w-full text-left hover:bg-dark-5 transition-colors" @click="emit('close')">
            <div class="w-10 h-10 flex items-center justify-center rounded-xl bg-dark-10 flex-shrink-0">
              <svg class="w-5 h-5 text-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-subHeader font-semibold text-dark">Block user</p>
              <p class="text-caption text-dark-50 mt-0.5">Hide this users post and block interactions.</p>
            </div>
          </button>
        </li>

        <li class="h-px bg-dark-10 mx-6" />

        <!-- Report -->
        <li>
          <button class="flex items-center gap-4 px-6 py-4 w-full text-left hover:bg-dark-5 transition-colors" @click="emit('close')">
            <div class="w-10 h-10 flex items-center justify-center rounded-xl bg-dark-10 flex-shrink-0">
              <svg class="w-5 h-5 text-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-subHeader font-semibold text-dark">Report</p>
              <p class="text-caption text-dark-50 mt-0.5">Report this post to the Memory moderation team.</p>
            </div>
          </button>
        </li>

        <li class="h-px bg-dark-10 mx-6" />

        <!-- I'm not interested -->
        <li>
          <button class="flex items-center gap-4 px-6 py-4 w-full text-left hover:bg-dark-5 transition-colors" @click="emit('close')">
            <div class="w-10 h-10 flex items-center justify-center rounded-xl bg-dark-10 flex-shrink-0">
              <svg class="w-5 h-5 text-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17"/>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-subHeader font-semibold text-dark">I'm not interested</p>
              <p class="text-caption text-dark-50 mt-0.5">Show less posts like these in your feed.</p>
            </div>
          </button>
        </li>

      </ul>

      <!-- Safe area spacer -->
      <div class="h-6" />
    </div>
  </Teleport>
</template>

<style scoped>
@keyframes slide-up {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
.animate-slide-up {
  animation: slide-up 0.28s cubic-bezier(0.32, 0.72, 0, 1);
}
</style>
