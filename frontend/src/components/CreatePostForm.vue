<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from '@/i18n'
import { usePostsStore } from '@/stores/postsStore'
import { useAuthStore } from '@/stores/authStore'
import GifPicker from './GifPicker.vue'
import PostAdvancedSettings from './PostAdvancedSettings.vue'
import { getEmbedUrl, type KlipyGif } from '@/composables/useKlipy'

const postsStore = usePostsStore()
const authStore = useAuthStore()
const { t } = useI18n()

const CHAR_LIMIT = 500
const content = ref('')
const pollQuestion = ref('')
const showPoll = ref(false)
const showFormatting = ref(false)
const showGifPicker = ref(false)
const selectedGif = ref<KlipyGif | null>(null)
const showAdvancedSettings = ref(false)

const charCount = computed(() => content.value.length)
const isOverLimit = computed(() => charCount.value > CHAR_LIMIT)
const canPost = computed(() => (content.value.trim().length > 0 || selectedGif.value !== null) && !isOverLimit.value)

function onGifSelect(gif: KlipyGif) {
  selectedGif.value = gif
  showGifPicker.value = false
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

const displayName = computed(() => authStore.user?.name ?? t('composer.displayNameFallback'))
const characterCountLabel = computed(() => t('composer.characterCount', { count: charCount.value, limit: CHAR_LIMIT }))

function applyFormat(type: 'bold' | 'italic' | 'underline') {
  const textarea = document.getElementById('composer-textarea') as HTMLTextAreaElement | null
  if (!textarea) return
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selected = content.value.slice(start, end)
  if (!selected) return
  const markers: Record<string, string> = { bold: '**', italic: '_', underline: '__' }
  const m = markers[type]
  content.value = content.value.slice(0, start) + m + selected + m + content.value.slice(end)
}

function togglePoll() {
  showPoll.value = !showPoll.value
  if (showPoll.value && content.value.trim()) {
    const words = content.value.trim().split(/\s+/).slice(0, 8).join(' ')
    pollQuestion.value = words.length > 0 ? t('composer.poll.autoQuestion', { topic: words }) : ''
  } else if (!showPoll.value) {
    pollQuestion.value = ''
  }
}

function createPost() {
  if (!canPost.value) return
  let finalContent = content.value
  if (selectedGif.value) {
    const gifUrl = getEmbedUrl(selectedGif.value)
    finalContent = finalContent.trim() ? `${finalContent.trim()}\n${gifUrl}` : gifUrl
  }
  postsStore.createPost(finalContent)
  content.value = ''
  pollQuestion.value = ''
  selectedGif.value = null
  showPoll.value = false
  showFormatting.value = false
  showGifPicker.value = false
}
</script>

<template>
  <form @submit.prevent="createPost">
    <div class="rounded-default bg-white shadow-sm flex flex-col overflow-hidden">

      <!-- Author row -->
      <div class="flex items-center gap-3 px-[var(--padding-main)] pt-[var(--padding-main)]">
        <div
          class="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-full text-white text-sm font-bold select-none"
          style="background: #1a1a2e;"
        >
          {{ getInitials(displayName) }}
        </div>
        <div class="flex items-center gap-1.5">
          <span class="text-subHeader font-bold text-dark">{{ displayName }}</span>
          <span class="flex items-center justify-center w-4 h-4 rounded-full flex-shrink-0" style="background: #1d9bf0;">
            <svg class="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </span>
        </div>
      </div>

      <!-- Textarea -->
      <textarea
        id="composer-textarea"
        v-model="content"
        class="bg-transparent text-base text-dark w-full resize-none appearance-none border-none outline-none leading-snug px-[var(--padding-main)] py-3"
        rows="5"
        :placeholder="t('composer.placeholder')"
      />

      <!-- Character counter -->
      <div class="flex justify-end px-[var(--padding-main)] pb-2">
        <span class="text-caption" :class="isOverLimit ? 'text-red-500' : 'text-dark-50'">
          {{ characterCountLabel }}
        </span>
      </div>

      <!-- Text formatting toolbar -->
      <div v-if="showFormatting" class="flex items-center gap-1 px-[var(--padding-main)] pb-2 border-t border-dark-10 pt-2">
        <button type="button" @click="applyFormat('bold')"
          class="font-bold w-8 h-8 rounded-full text-sm hover:bg-dark-10 text-dark transition-colors flex items-center justify-center">
          B
        </button>
        <button type="button" @click="applyFormat('italic')"
          class="italic w-8 h-8 rounded-full text-sm hover:bg-dark-10 text-dark transition-colors flex items-center justify-center">
          I
        </button>
        <button type="button" @click="applyFormat('underline')"
          class="underline w-8 h-8 rounded-full text-sm hover:bg-dark-10 text-dark transition-colors flex items-center justify-center">
          U
        </button>
      </div>

      <!-- GIF picker -->
      <div v-if="showGifPicker" class="px-[var(--padding-main)] pb-3 border-t border-dark-10 pt-3">
        <GifPicker @select="onGifSelect" />
      </div>

      <!-- Selected GIF preview -->
      <div v-if="selectedGif && !showGifPicker" class="relative mx-[var(--padding-main)] mb-3">
        <img
          :src="getEmbedUrl(selectedGif)"
          :alt="selectedGif.title"
          class="w-full max-h-48 object-cover rounded-xl"
        />
        <button
          type="button"
          class="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          @click="selectedGif = null"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>

      <!-- Poll input -->
      <div v-if="showPoll" class="mx-[var(--padding-main)] mb-3 flex items-center gap-2 rounded-full bg-pastel-light px-4 py-2.5">
        <input
          v-model="pollQuestion"
          class="flex-1 bg-transparent text-sm text-dark outline-none"
          :placeholder="t('composer.poll.placeholder')"
        />
        <button type="button" @click="showPoll = false; pollQuestion = ''"
          class="flex-shrink-0 text-dark-50 hover:text-dark transition-colors">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>

      <!-- Divider -->
      <div class="h-px bg-dark-10 mx-[var(--padding-main)]" />

      <!-- Bottom toolbar -->
      <div class="flex items-center gap-1 px-[var(--padding-main)] py-3">

        <!-- GIF -->
        <button type="button" @click="showGifPicker = !showGifPicker"
          class="flex items-center justify-center w-9 h-9 rounded-full transition-colors text-dark-50"
          :class="showGifPicker || selectedGif ? 'bg-dark-10 text-dark' : 'hover:bg-dark-10'">
          <span class="text-[10px] font-black" style="font-family: Arial, sans-serif; letter-spacing: -0.5px;">GIF</span>
        </button>

        <!-- Text formatting (Tt) -->
        <button type="button" @click="showFormatting = !showFormatting"
          class="flex items-center justify-center w-9 h-9 rounded-full transition-colors text-dark-50"
          :class="showFormatting ? 'bg-dark-10 text-dark' : 'hover:bg-dark-10'">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
            <path d="M4 7V4h16v3M9 20h6M12 4v16"/>
          </svg>
        </button>

        <!-- Image / video -->
        <button type="button"
          class="flex items-center justify-center w-9 h-9 rounded-full hover:bg-dark-10 transition-colors text-dark-50">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <path d="M21 15l-5-5L5 21"/>
          </svg>
        </button>

        <!-- Poll (auto-generate) -->
        <button type="button" @click="togglePoll"
          class="flex items-center justify-center w-9 h-9 rounded-full transition-colors text-dark-50"
          :class="showPoll ? 'bg-dark-10 text-dark' : 'hover:bg-dark-10'">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 20V10M12 20V4M6 20v-6"/>
          </svg>
        </button>

        <!-- Post + Advanced Settings split pill -->
        <div class="ml-auto flex items-center rounded-full overflow-hidden" style="background: rgb(99, 100, 246);">
          <button
            type="submit"
            :disabled="!canPost"
            class="flex items-center gap-2 pl-5 pr-4 py-2 text-footnote font-bold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {{ t('composer.actions.post') }}
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
          <!-- vertical divider -->
          <div class="w-px h-5 bg-white/30 flex-shrink-0" />
          <!-- gear button -->
          <button
            type="button"
            class="flex items-center justify-center pl-3 pr-4 py-2 text-white hover:opacity-80 transition-opacity"
            @click="showAdvancedSettings = true"
            :aria-label="t('composer.actions.openAdvancedSettings')"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </button>
        </div>

      </div>
    </div>
  </form>

  <!-- Advanced Settings Sheet -->
  <PostAdvancedSettings
    v-if="showAdvancedSettings"
    @close="showAdvancedSettings = false"
    @update="showAdvancedSettings = false"
  />
</template>
