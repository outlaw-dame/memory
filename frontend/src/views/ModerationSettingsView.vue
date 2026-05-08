<script setup lang="ts">
import { buildApiHeaders, getApiBaseUrl } from '@/controller/http'
import { useAuthStore } from '@/stores/authStore'
import ky from 'ky'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from '@/i18n'

type Preference = Record<string, unknown>
type TrustSource = Record<string, unknown>
type ModerationAction = 'off' | 'warn' | 'hide'

const authStore = useAuthStore()
const { t } = useI18n()

const preferences = ref<Preference[]>([])
const trustSources = ref<TrustSource[]>([])

const isLoading = ref(true)
const isSaving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const apiBaseUrl = getApiBaseUrl()

const authHeaders = computed(() =>
  buildApiHeaders({
    authToken: authStore.token || undefined
  })
)

// Preferences state
const sensitiveMediaAction = ref<ModerationAction>('warn')
const atprotoLabelerAction = ref<ModerationAction>('off')
const enabledLabelerCount = computed(() =>
  trustSources.value.filter(s =>
    normalizeString(s.sourceType) === 'atproto-labeler' && s.enabled !== false
  ).length
)

function normalizeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function getPreferenceValue(category: string): unknown | null {
  const pref = preferences.value.find(p => normalizeString(p.category) === category)
  return pref?.value ?? null
}

async function loadPreferences() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const result = await ky
      .get(`${apiBaseUrl}/api/dashboard/apps/moderation/preferences`, {
        headers: authHeaders.value,
        timeout: 10000
      })
      .json<{ data?: Preference[] }>()

    preferences.value = result.data ?? []

    // Update UI state from loaded preferences
    const smdValue = getPreferenceValue('sensitive-media-display')
    if (smdValue === 'off' || smdValue === 'warn' || smdValue === 'hide') {
      sensitiveMediaAction.value = smdValue
    }

    const aplValue = getPreferenceValue('atproto-labeler-default-action')
      ?? getPreferenceValue('atproto-labeler-action')
    if (aplValue === 'off' || aplValue === 'warn' || aplValue === 'hide') {
      atprotoLabelerAction.value = aplValue
    }
  } catch (error) {
    errorMessage.value = (error as Error)?.message || t('settings.moderation.loadFailed')
  } finally {
    isLoading.value = false
  }
}

async function loadTrustSources() {
  try {
    const result = await ky
      .get(`${apiBaseUrl}/api/dashboard/apps/moderation/trust-sources`, {
        headers: authHeaders.value,
        timeout: 10000
      })
      .json<{ data?: TrustSource[] }>()

    trustSources.value = result.data ?? []
  } catch (error) {
    console.warn('[ModerationSettings] Failed to load trust sources:', error)
  }
}

async function savePreference(category: string, value: unknown) {
  isSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const existing = preferences.value.find(p => normalizeString(p.category) === category)

    if (existing) {
      const updated = { ...existing, value }
      await ky
        .put(`${apiBaseUrl}/api/dashboard/apps/moderation/preferences`, {
          headers: buildApiHeaders({
            authToken: authStore.token || undefined,
            includeJsonContentType: true
          }),
          json: { data: updated },
          timeout: 10000
        })
        .json()

      const idx = preferences.value.indexOf(existing)
      if (idx >= 0) {
        preferences.value[idx] = updated
      }
    } else {
      const created = { category, value, schemaVersion: 1 }
      const result = await ky
        .post(`${apiBaseUrl}/api/dashboard/apps/moderation/preferences`, {
          headers: buildApiHeaders({
            authToken: authStore.token || undefined,
            includeJsonContentType: true
          }),
          json: { data: created },
          timeout: 10000
        })
        .json<{ data?: Preference }>()

      if (result.data) {
        preferences.value.push(result.data)
      }
    }

    successMessage.value = t('settings.moderation.saved')
  } catch (error) {
    errorMessage.value = (error as Error)?.message || t('settings.moderation.saveFailed')
  } finally {
    isSaving.value = false
  }
}

async function onSensitiveMediaChange(value: string) {
  if (value === 'off' || value === 'warn' || value === 'hide') {
    sensitiveMediaAction.value = value
    await savePreference('sensitive-media-display', value)
  }
}

async function onAtprotoLabelerChange(value: string) {
  if (value === 'off' || value === 'warn' || value === 'hide') {
    atprotoLabelerAction.value = value
    await savePreference('atproto-labeler-default-action', value)
  }
}

onMounted(() => {
  void Promise.all([loadPreferences(), loadTrustSources()])
})
</script>

<template>
  <div class="flex flex-col gap-4 py-4">
    <div>
      <h2 class="text-xl font-semibold">{{ t('settings.moderation.title') }}</h2>
      <p class="text-caption mt-1">{{ t('settings.moderation.description') }}</p>
    </div>

    <div v-if="isLoading" class="rounded-default bg-pastel-light p-[var(--padding-main)] text-sm">
      {{ t('settings.moderation.loading') }}
    </div>

    <div v-else class="rounded-default bg-pastel-light p-[var(--padding-main)] flex flex-col gap-4">
      <p v-if="errorMessage" class="rounded bg-red-100 px-3 py-2 text-sm text-red-800">
        {{ errorMessage }}
      </p>
      <p v-if="successMessage" class="rounded bg-emerald-100 px-3 py-2 text-sm text-emerald-800">
        {{ successMessage }}
      </p>

      <!-- Sensitive Media Display preference -->
      <div class="flex flex-col gap-2">
        <label class="text-sm font-medium" for="sensitive-media-action">
          {{ t('settings.moderation.sensitiveMedia.label') }}
        </label>
        <p class="text-caption text-dark-50">
          {{ t('settings.moderation.sensitiveMedia.description') }}
        </p>
        <select
          id="sensitive-media-action"
          :value="sensitiveMediaAction"
          class="rounded border border-gray-300 bg-white px-3 py-2 font-normal"
          @change="e => onSensitiveMediaChange((e.target as HTMLSelectElement).value)"
        >
          <option value="off">{{ t('settings.moderation.action.off') }}</option>
          <option value="warn">{{ t('settings.moderation.action.warn') }}</option>
          <option value="hide">{{ t('settings.moderation.action.hide') }}</option>
        </select>
        <p v-if="sensitiveMediaAction === 'off'" class="text-caption text-dark-50">
          {{ t('settings.moderation.sensitiveMedia.off') }}
        </p>
        <p v-if="sensitiveMediaAction === 'warn'" class="text-caption text-dark-50">
          {{ t('settings.moderation.sensitiveMedia.warn') }}
        </p>
        <p v-if="sensitiveMediaAction === 'hide'" class="text-caption text-dark-50">
          {{ t('settings.moderation.sensitiveMedia.hide') }}
        </p>
      </div>

      <!-- ATProto Labeler preference (only show if labelers enabled) -->
      <div v-if="enabledLabelerCount > 0" class="flex flex-col gap-2 rounded border border-gray-300 bg-white p-3">
        <label class="text-sm font-medium" for="atproto-labeler-action">
          {{ t('settings.moderation.atprotoLabelers.label') }}
          <span class="text-caption text-dark-50">({{ enabledLabelerCount }} {{ t('settings.moderation.atprotoLabelers.enabled') }})</span>
        </label>
        <p class="text-caption text-dark-50">
          {{ t('settings.moderation.atprotoLabelers.description') }}
        </p>
        <select
          id="atproto-labeler-action"
          :value="atprotoLabelerAction"
          class="rounded border border-gray-300 bg-white px-3 py-2 font-normal"
          @change="e => onAtprotoLabelerChange((e.target as HTMLSelectElement).value)"
        >
          <option value="off">{{ t('settings.moderation.action.off') }}</option>
          <option value="warn">{{ t('settings.moderation.action.warn') }}</option>
          <option value="hide">{{ t('settings.moderation.action.hide') }}</option>
        </select>
        <p v-if="atprotoLabelerAction === 'off'" class="text-caption text-dark-50">
          {{ t('settings.moderation.atprotoLabelers.off') }}
        </p>
        <p v-if="atprotoLabelerAction === 'warn'" class="text-caption text-dark-50">
          {{ t('settings.moderation.atprotoLabelers.warn') }}
        </p>
        <p v-if="atprotoLabelerAction === 'hide'" class="text-caption text-dark-50">
          {{ t('settings.moderation.atprotoLabelers.hide') }}
        </p>
      </div>

      <RouterLink to="/settings" class="text-sm underline">{{ t('common.actions.backToSettings') }}</RouterLink>
    </div>
  </div>
</template>
