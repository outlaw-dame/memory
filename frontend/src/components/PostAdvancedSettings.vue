<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from '@/i18n'

type PostAudience = 'public' | 'followers' | 'private'

export interface PostSettings {
  isPublic: boolean
  audience: PostAudience
  scheduledAt: string | null
  isDraft: boolean
  hasContentWarning: boolean
  contentWarningText: string
}

const emit = defineEmits<{
  close: []
  update: [settings: PostSettings]
}>()
const { t, formatDateTime } = useI18n()

const isPublic = ref(true)
const audience = ref<PostAudience>('public')
const scheduledAt = ref<string | null>(null)
const showScheduler = ref(false)
const isDraft = ref(false)
const hasContentWarning = ref(false)
const contentWarningText = ref('')
const showCWInput = ref(false)

const audienceOptions: PostAudience[] = ['public', 'followers', 'private']
const audienceLabel = computed(() => t(`composer.advanced.audiences.${audience.value}`))
const scheduleLabel = computed(() => {
  if (!scheduledAt.value) {
    return t('composer.advanced.schedule.notSet')
  }

  return formatSchedule(scheduledAt.value)
})
const contentWarningStatusLabel = computed(() =>
  hasContentWarning.value ? t('composer.advanced.contentWarning.enabled') : ''
)

function cycleAudience() {
  const i = audienceOptions.indexOf(audience.value)
  audience.value = audienceOptions[(i + 1) % audienceOptions.length]
}

function formatSchedule(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return formatDateTime(date, {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

function moveToDrafts() {
  isDraft.value = true
  emit('update', buildSettings())
  emit('close')
}

function buildSettings(): PostSettings {
  return {
    isPublic: isPublic.value,
    audience: audience.value,
    scheduledAt: scheduledAt.value,
    isDraft: isDraft.value,
    hasContentWarning: hasContentWarning.value,
    contentWarningText: contentWarningText.value,
  }
}

function done() {
  emit('update', buildSettings())
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <div class="fixed inset-0 z-40 bg-black/30" @click="done" />

    <!-- Sheet -->
    <div class="fixed bottom-0 left-0 right-0 z-50 rounded-t-[28px] bg-pastel-light pb-safe animate-slide-up max-h-[88vh] overflow-y-auto">

      <!-- Drag handle -->
      <div class="flex justify-center pt-3 pb-1 sticky top-0 bg-pastel-light">
        <div class="w-9 h-1 rounded-full bg-dark-20" />
      </div>

      <!-- Header -->
      <div class="px-6 pt-4 pb-5">
        <p class="text-h2 font-bold text-dark">{{ t('composer.advanced.title') }}</p>
        <p class="text-footnote text-dark-50 mt-1 leading-snug">
          {{ t('composer.advanced.description') }}
        </p>
      </div>

      <!-- Divider -->
      <div class="h-px bg-dark-10 mx-6 mb-3" />

      <!-- Public access toggle -->
      <div class="mx-6 mb-3 rounded-2xl bg-white px-4 py-4 flex items-start gap-3">
        <div class="flex-1 min-w-0">
          <p class="text-subHeader font-semibold text-dark">{{ t('composer.advanced.publicAccess.title') }}</p>
          <p class="text-caption text-dark-50 mt-0.5 leading-snug">
            {{ t('composer.advanced.publicAccess.description') }}
          </p>
        </div>
        <!-- Toggle -->
        <button
          type="button"
          class="flex-shrink-0 mt-0.5 w-12 h-7 rounded-full transition-colors duration-200 relative"
          :style="isPublic ? 'background: var(--color-accent);' : 'background: rgba(55,55,55,0.15);'"
          @click="isPublic = !isPublic"
          :aria-label="isPublic ? t('composer.advanced.publicAccess.disable') : t('composer.advanced.publicAccess.enable')"
        >
          <span
            class="absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200"
            :style="isPublic ? 'transform: translateX(22px)' : 'transform: translateX(4px)'"
          />
        </button>
      </div>

      <!-- Audience -->
      <button
        type="button"
        class="w-full flex items-center gap-4 px-6 py-4 hover:bg-dark-5 transition-colors"
        @click="cycleAudience"
      >
        <div class="w-10 h-10 flex items-center justify-center rounded-xl bg-dark-10 flex-shrink-0">
          <svg class="w-5 h-5 text-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
          </svg>
        </div>
        <p class="flex-1 text-subHeader font-semibold text-dark text-left">{{ t('composer.advanced.audience.title') }}</p>
        <span class="rounded-full bg-dark-10 px-3 py-1 text-footnote font-semibold text-dark flex-shrink-0">
          {{ audienceLabel }}
        </span>
      </button>

      <div class="h-px bg-dark-10 mx-6" />

      <!-- Schedule post -->
      <div class="px-6 py-4">
        <button
          type="button"
          class="w-full flex items-center gap-4"
          @click="showScheduler = !showScheduler"
        >
          <div class="w-10 h-10 flex items-center justify-center rounded-xl bg-dark-10 flex-shrink-0">
            <svg class="w-5 h-5 text-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <p class="flex-1 text-subHeader font-semibold text-dark text-left">{{ t('composer.advanced.schedule.title') }}</p>
          <span class="rounded-full bg-dark-10 px-3 py-1 text-footnote font-semibold text-dark flex-shrink-0">
            {{ scheduleLabel }}
          </span>
        </button>

        <!-- Date/time picker (revealed inline) -->
        <div v-if="showScheduler" class="mt-3 ml-14">
          <input
            type="datetime-local"
            :value="scheduledAt ?? ''"
            class="w-full rounded-xl bg-white border border-dark-10 px-3 py-2 text-sm text-dark outline-none focus:ring-2 focus:ring-indigo-300"
            @change="scheduledAt = ($event.target as HTMLInputElement).value || null"
          />
          <button
            v-if="scheduledAt"
            type="button"
            class="mt-2 text-caption text-dark-50 hover:text-dark transition-colors"
            @click="scheduledAt = null"
          >
            {{ t('composer.advanced.schedule.clear') }}
          </button>
        </div>
      </div>

      <div class="h-px bg-dark-10 mx-6" />

      <!-- Move to drafts -->
      <button
        type="button"
        class="w-full flex items-center gap-4 px-6 py-4 hover:bg-dark-5 transition-colors"
        @click="moveToDrafts"
      >
        <div class="w-10 h-10 flex items-center justify-center rounded-xl bg-dark-10 flex-shrink-0">
          <svg class="w-5 h-5 text-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
            <line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0 text-left">
          <p class="text-subHeader font-semibold text-dark">{{ t('composer.advanced.drafts.title') }}</p>
          <p class="text-caption text-dark-50 mt-0.5">{{ t('composer.advanced.drafts.description') }}</p>
        </div>
      </button>

      <div class="h-px bg-dark-10 mx-6" />

      <!-- Add content warning -->
      <div class="px-6 py-4">
        <button
          type="button"
          class="w-full flex items-center gap-4"
          @click="hasContentWarning = !hasContentWarning; showCWInput = hasContentWarning"
        >
          <div class="w-10 h-10 flex items-center justify-center rounded-xl bg-dark-10 flex-shrink-0">
            <svg class="w-5 h-5 text-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0 text-left">
            <p class="text-subHeader font-semibold text-dark">{{ t('composer.advanced.contentWarning.title') }}</p>
            <p class="text-caption text-dark-50 mt-0.5">{{ t('composer.advanced.contentWarning.description') }}</p>
          </div>
          <span
            v-if="hasContentWarning"
            class="rounded-full px-3 py-1 text-footnote font-semibold text-white flex-shrink-0"
            style="background: var(--color-accent);"
          >{{ contentWarningStatusLabel }}</span>
        </button>

        <div v-if="showCWInput" class="mt-3 ml-14">
          <input
            v-model="contentWarningText"
            type="text"
            class="w-full rounded-xl bg-white border border-dark-10 px-3 py-2 text-sm text-dark outline-none focus:ring-2 focus:ring-indigo-300"
            :placeholder="t('composer.advanced.contentWarning.placeholder')"
            maxlength="100"
          />
        </div>
      </div>

      <div class="h-px bg-dark-10 mx-6" />

      <!-- Boost this post -->
      <div class="mx-6 mt-4 mb-6">
        <button
          type="button"
          class="w-full flex items-center gap-4 rounded-2xl px-5 py-4 text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
          style="background: linear-gradient(135deg, var(--color-accent) 0%, rgb(168,85,247) 100%);"
        >
          <div class="w-9 h-9 flex items-center justify-center rounded-xl bg-white/20 flex-shrink-0">
            <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
          <div class="text-left">
            <p class="text-subHeader font-bold text-white">{{ t('composer.advanced.boost.title') }}</p>
            <p class="text-caption text-white/70">{{ t('composer.advanced.boost.description') }}</p>
          </div>
        </button>
      </div>

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
