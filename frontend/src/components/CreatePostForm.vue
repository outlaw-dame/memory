<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from '@/i18n'
import { usePostsStore } from '@/stores/postsStore'
import { useAtBridgeStore } from '@/stores/atBridgeStore'
import { useAuthStore } from '@/stores/authStore'
import GifPicker from './GifPicker.vue'
import PostAdvancedSettings from './PostAdvancedSettings.vue'
import { getEmbedUrl, type KlipyGif } from '@/composables/useKlipy'
import type { CreatePoll } from '@/types'

const postsStore = usePostsStore()
const atBridgeStore = useAtBridgeStore()
const authStore = useAuthStore()
const { t } = useI18n()

const NOTE_CHAR_LIMIT = 500
const ARTICLE_CHAR_LIMIT = 10_000
const ARTICLE_TITLE_LIMIT = 160
const ARTICLE_SUMMARY_LIMIT = 500

const postType = ref<'note' | 'article'>('note')
const content = ref('')
const articleTitle = ref('')
const articleSummary = ref('')
const showPoll = ref(false)
/** FEP-9967: list of poll option labels entered by the user */
const pollOptions = ref<string[]>(['', ''])
/** FEP-9967: 'oneOf' = single choice, 'anyOf' = multiple choice */
const pollMode = ref<'oneOf' | 'anyOf'>('oneOf')
/** FEP-9967: optional end time (ISO string or empty) */
const pollEndTime = ref('')
const showFormatting = ref(false)
const showGifPicker = ref(false)
const selectedGif = ref<KlipyGif | null>(null)
const showAdvancedSettings = ref(false)

const currentCharLimit = computed(() => (postType.value === 'article' ? ARTICLE_CHAR_LIMIT : NOTE_CHAR_LIMIT))
const charCount = computed(() => content.value.length)
const isOverLimit = computed(() => charCount.value > currentCharLimit.value)
const isArticleTitleOverLimit = computed(() => articleTitle.value.length > ARTICLE_TITLE_LIMIT)
const isArticleSummaryOverLimit = computed(() => articleSummary.value.length > ARTICLE_SUMMARY_LIMIT)
const isArticleMetaValid = computed(
  () => !isArticleTitleOverLimit.value && !isArticleSummaryOverLimit.value,
)

/** Validate poll: need at least 2 non-empty unique option names */
const isPollValid = computed(() => {
  if (!showPoll.value) return true
  const names = pollOptions.value.map((o) => o.trim()).filter(Boolean)
  return names.length >= 2 && new Set(names).size === names.length
})

const canPost = computed(
  () =>
    (content.value.trim().length > 0 || (postType.value === 'note' && selectedGif.value !== null)) &&
    !isOverLimit.value &&
    isPollValid.value &&
    isArticleMetaValid.value
)

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
const characterCountLabel = computed(() => t('composer.characterCount', { count: charCount.value, limit: currentCharLimit.value }))
const articleTitleCountLabel = computed(() => t('composer.article.titleCount', { count: articleTitle.value.length, limit: ARTICLE_TITLE_LIMIT }))
const articleSummaryCountLabel = computed(() => t('composer.article.summaryCount', { count: articleSummary.value.length, limit: ARTICLE_SUMMARY_LIMIT }))
const composerPlaceholder = computed(() => (
  postType.value === 'article'
    ? t('composer.article.bodyPlaceholder')
    : t('composer.placeholder')
))

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
  if (postType.value === 'article') return
  showPoll.value = !showPoll.value
  if (!showPoll.value) {
    pollOptions.value = ['', '']
    pollMode.value = 'oneOf'
    pollEndTime.value = ''
  }
}

function setPostType(nextType: 'note' | 'article') {
  postType.value = nextType
  if (nextType === 'article') {
    showPoll.value = false
    pollOptions.value = ['', '']
    pollMode.value = 'oneOf'
    pollEndTime.value = ''
    showGifPicker.value = false
    selectedGif.value = null
  }
}

function addPollOption() {
  if (pollOptions.value.length < 8) {
    pollOptions.value.push('')
  }
}

function removePollOption(index: number) {
  if (pollOptions.value.length > 2) {
    pollOptions.value.splice(index, 1)
  }
}

async function createPost() {
  if (!canPost.value) return
  let finalContent = content.value
  if (postType.value === 'note' && selectedGif.value) {
    const gifUrl = getEmbedUrl(selectedGif.value)
    finalContent = finalContent.trim() ? `${finalContent.trim()}\n${gifUrl}` : gifUrl
  }

  let poll: CreatePoll | null = null
  if (showPoll.value) {
    const options = pollOptions.value
      .map((o) => o.trim())
      .filter(Boolean)
      .map((name) => ({ name }))
    poll = {
      mode: pollMode.value,
      options,
      endTime: pollEndTime.value.trim() || null,
    }
  }

  const created = await postsStore.createPost({
    content: finalContent,
    poll,
    postType: postType.value,
    name: postType.value === 'article' ? articleTitle.value.trim() || null : null,
    summary: postType.value === 'article' ? articleSummary.value.trim() || null : null,
  })
  if (!created) return

  await atBridgeStore.fetchUnifiedFeed()
  content.value = ''
  articleTitle.value = ''
  articleSummary.value = ''
  postType.value = 'note'
  pollOptions.value = ['', '']
  pollMode.value = 'oneOf'
  pollEndTime.value = ''
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

      <!-- Post type -->
      <div class="flex gap-2 px-[var(--padding-main)] pt-3">
        <button
          type="button"
          class="rounded-full px-3 py-1.5 text-footnote font-semibold transition-colors"
          :class="postType === 'note' ? 'text-white' : 'bg-dark-10 text-dark-50 hover:bg-dark-10'"
          :style="postType === 'note' ? 'background: rgb(99,100,246);' : ''"
          @click="setPostType('note')"
        >
          {{ t('composer.types.note') }}
        </button>
        <button
          type="button"
          class="rounded-full px-3 py-1.5 text-footnote font-semibold transition-colors"
          :class="postType === 'article' ? 'text-white' : 'bg-dark-10 text-dark-50 hover:bg-dark-10'"
          :style="postType === 'article' ? 'background: rgb(99,100,246);' : ''"
          @click="setPostType('article')"
        >
          {{ t('composer.types.article') }}
        </button>
      </div>

      <div v-if="postType === 'article'" class="px-[var(--padding-main)] pt-3 pb-1 flex flex-col gap-3">
        <div class="flex flex-col gap-1.5">
          <label class="text-footnote font-semibold text-dark" for="composer-article-title">
            {{ t('composer.article.titleLabel') }}
          </label>
          <input
            id="composer-article-title"
            v-model="articleTitle"
            type="text"
            class="rounded-2xl border border-dark-10 bg-white px-4 py-3 text-dark outline-none focus:border-indigo-400"
            :placeholder="t('composer.article.titlePlaceholder')"
          />
          <span class="text-caption" :class="isArticleTitleOverLimit ? 'text-red-500' : 'text-dark-50'">
            {{ articleTitleCountLabel }}
          </span>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-footnote font-semibold text-dark" for="composer-article-summary">
            {{ t('composer.article.summaryLabel') }}
          </label>
          <textarea
            id="composer-article-summary"
            v-model="articleSummary"
            class="min-h-24 rounded-2xl border border-dark-10 bg-white px-4 py-3 text-dark outline-none resize-none focus:border-indigo-400"
            :placeholder="t('composer.article.summaryPlaceholder')"
          />
          <span class="text-caption" :class="isArticleSummaryOverLimit ? 'text-red-500' : 'text-dark-50'">
            {{ articleSummaryCountLabel }}
          </span>
        </div>
      </div>

      <!-- Textarea -->
      <textarea
        id="composer-textarea"
        v-model="content"
        class="bg-transparent text-base text-dark w-full resize-none appearance-none border-none outline-none leading-snug px-[var(--padding-main)] py-3"
        rows="5"
        :placeholder="composerPlaceholder"
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
      <div v-if="postType === 'note' && showGifPicker" class="px-[var(--padding-main)] pb-3 border-t border-dark-10 pt-3">
        <GifPicker @select="onGifSelect" />
      </div>

      <!-- Selected GIF preview -->
      <div v-if="postType === 'note' && selectedGif && !showGifPicker" class="relative mx-[var(--padding-main)] mb-3">
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

      <!-- Poll editor (FEP-9967) -->
      <div v-if="showPoll" class="mx-[var(--padding-main)] mb-3 rounded-2xl bg-pastel-light border border-dark-10 p-3 flex flex-col gap-2">
        <!-- Header row -->
        <div class="flex items-center justify-between">
          <span class="text-sm font-semibold text-dark">Poll options</span>
          <!-- Mode toggle -->
          <div class="flex items-center gap-1 text-xs">
            <button type="button"
              :class="pollMode === 'oneOf' ? 'bg-indigo-500 text-white' : 'bg-dark-10 text-dark'"
              class="rounded-full px-2.5 py-1 font-semibold transition-colors"
              @click="pollMode = 'oneOf'">
              Single
            </button>
            <button type="button"
              :class="pollMode === 'anyOf' ? 'bg-indigo-500 text-white' : 'bg-dark-10 text-dark'"
              class="rounded-full px-2.5 py-1 font-semibold transition-colors"
              @click="pollMode = 'anyOf'">
              Multi
            </button>
            <button type="button" @click="togglePoll" class="ml-1 text-dark-50 hover:text-dark transition-colors">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Option inputs -->
        <div v-for="(_, i) in pollOptions" :key="i" class="flex items-center gap-2">
          <input
            v-model="pollOptions[i]"
            class="flex-1 bg-white rounded-xl px-3 py-2 text-sm text-dark outline-none border border-dark-10 focus:border-indigo-400"
            :placeholder="`Option ${i + 1}`"
          />
          <button
            v-if="pollOptions.length > 2"
            type="button"
            class="text-dark-50 hover:text-dark transition-colors flex-shrink-0"
            @click="removePollOption(i)"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <!-- Add option -->
        <button
          v-if="pollOptions.length < 8"
          type="button"
          class="text-xs text-indigo-500 font-semibold self-start hover:underline"
          @click="addPollOption"
        >
          + Add option
        </button>

        <!-- End time (optional) -->
        <input
          v-model="pollEndTime"
          type="datetime-local"
          class="bg-white rounded-xl px-3 py-2 text-sm text-dark outline-none border border-dark-10 focus:border-indigo-400 w-full"
          :placeholder="'End time (optional)'"
        />
      </div>

      <!-- Divider -->
      <div class="h-px bg-dark-10 mx-[var(--padding-main)]" />

      <!-- Bottom toolbar -->
      <div class="flex items-center gap-1 px-[var(--padding-main)] py-3">

        <!-- GIF -->
        <button
          v-if="postType === 'note'"
          type="button"
          @click="showGifPicker = !showGifPicker"
          class="flex items-center justify-center w-9 h-9 rounded-full transition-colors text-dark-50"
          :class="showGifPicker || selectedGif ? 'bg-dark-10 text-dark' : 'hover:bg-dark-10'"
        >
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
        <button
          v-if="postType === 'note'"
          type="button" @click="togglePoll"
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
