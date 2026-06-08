<script setup lang="ts">
import { buildApiHeaders, getApiBaseUrl } from '@/controller/http'
import { useAuthStore } from '@/stores/authStore'
import ky from 'ky'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from '@/i18n'
import {
  AppList,
  AppListItem,
  AppGroupedList,
  AppRadioList,
  type AppRadioOption
} from '@/design/semantic'

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

// Radio options for moderation actions
const moderationActionOptions: AppRadioOption[] = [
  { value: 'off', label: t('settings.moderation.action.off') },
  { value: 'warn', label: t('settings.moderation.action.warn') },
  { value: 'hide', label: t('settings.moderation.action.hide') }
]

// Descriptions for each action type
const sensitiveMediaDescriptions = {
  off: t('settings.moderation.sensitiveMedia.off'),
  warn: t('settings.moderation.sensitiveMedia.warn'),
  hide: t('settings.moderation.sensitiveMedia.hide')
}

const atprotoLabelerDescriptions = {
  off: t('settings.moderation.atprotoLabelers.off'),
  warn: t('settings.moderation.atprotoLabelers.warn'),
  hide: t('settings.moderation.atprotoLabelers.hide')
}

onMounted(() => {
  void Promise.all([loadPreferences(), loadTrustSources()])
})
</script>

<template>
  <div class="pb-20">
    <!-- Header -->
    <AppGroupedList :title="t('settings.moderation.title')" :inset="true">
      <p class="app-settings-description">{{ t('settings.moderation.description') }}</p>
    </AppGroupedList>

    <!-- Loading state -->
    <AppGroupedList v-if="isLoading" :inset="true">
      <AppList :inset="false">
        <AppListItem :title="t('settings.moderation.loading')" />
      </AppList>
    </AppGroupedList>

    <template v-else>
      <!-- Error/Success messages -->
      <AppGroupedList v-if="errorMessage || successMessage" :inset="true">
        <AppList :inset="false">
          <AppListItem v-if="errorMessage" :title="errorMessage" class="text-red-800" />
          <AppListItem v-if="successMessage" :title="successMessage" class="text-emerald-800" />
        </AppList>
      </AppGroupedList>

      <!-- Sensitive Media Display preference -->
      <AppGroupedList :title="t('settings.moderation.sensitiveMedia.label')" :inset="true">
        <p class="app-settings-description">{{ t('settings.moderation.sensitiveMedia.description') }}</p>
        <AppList :inset="false">
          <AppListItem>
            <template #after>
              <AppRadioList
                v-model="sensitiveMediaAction"
                :options="moderationActionOptions"
                :aria-label="t('settings.moderation.sensitiveMedia.label')"
                @change="onSensitiveMediaChange"
              />
            </template>
          </AppListItem>
          <AppListItem
            v-if="sensitiveMediaAction in sensitiveMediaDescriptions"
            :title="sensitiveMediaDescriptions[sensitiveMediaAction]"
            class="text-caption"
          />
        </AppList>
      </AppGroupedList>

      <!-- ATProto Labeler preference (only show if labelers enabled) -->
      <AppGroupedList v-if="enabledLabelerCount > 0" :title="t('settings.moderation.atprotoLabelers.label')" :inset="true">
        <p class="app-settings-description">
          {{ t('settings.moderation.atprotoLabelers.description') }}
          <span class="text-caption">({{ enabledLabelerCount }} {{ t('settings.moderation.atprotoLabelers.enabled') }})</span>
        </p>
        <AppList :inset="false">
          <AppListItem>
            <template #after>
              <AppRadioList
                v-model="atprotoLabelerAction"
                :options="moderationActionOptions"
                :aria-label="t('settings.moderation.atprotoLabelers.label')"
                @change="onAtprotoLabelerChange"
              />
            </template>
          </AppListItem>
          <AppListItem
            v-if="atprotoLabelerAction in atprotoLabelerDescriptions"
            :title="atprotoLabelerDescriptions[atprotoLabelerAction]"
            class="text-caption"
          />
        </AppList>
      </AppGroupedList>

      <!-- Back Navigation -->
      <AppGroupedList :inset="true">
        <AppList :inset="false">
          <AppListItem
            link
            :title="t('common.actions.backToSettings')"
            @click="$router.push('/settings')"
            chevron-right
          />
        </AppList>
      </AppGroupedList>
    </template>
  </div>
</template>

<style scoped>
/* Settings-specific styling */
.app-settings-description {
  font-family: var(--font-family);
  font-size: var(--text-size-caption);
  color: var(--color-secondary);
  padding: 0 var(--padding-main) 0.5rem;
}

.app-settings-description span {
  display: block;
  margin-top: 0.25rem;
}
</style>
