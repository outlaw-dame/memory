<script setup lang="ts">
import {
  createEmptyProfileField,
  extractProfileFields,
  mergeProfileFieldsIntoAttachment,
  type ProfileField
} from '@/controller/profileMetadata'
import {
  STATUS_CHAR_LIMIT,
  buildActorStatusPayload,
  clearActorStatusDraft,
  countStatusCharacters,
  parseActorStatusDraft,
  validateActorStatusDraft,
  type ActorStatusDraft
} from '@/controller/profileStatus'
import {
  ATTRIBUTION_DOMAIN_LIMIT,
  buildAttributionDomainsPayload,
  parseActorAttributionDomains,
  validateAttributionDomains
} from '@/controller/profileAuthorAttribution'
import { buildApiHeaders, getApiBaseUrl } from '@/controller/http'
import { useAuthStore } from '@/stores/authStore'
import ky from 'ky'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from '@/i18n'
import {
  AppList,
  AppListItem,
  AppGroupedList,
  AppSwitch,
  AppDestructiveAction
} from '@/design/semantic'

type ActorProfile = Record<string, unknown>

type VerificationLink = {
  href: string
  verified: boolean
  reason?: string
  checkedAt?: string
}

type VerificationResponse = {
  summary?: {
    totalRelMeLinks?: number
    verifiedCount?: number
  }
  links?: VerificationLink[]
}

const authStore = useAuthStore()
const { t } = useI18n()

const actor = ref<ActorProfile | null>(null)
const name = ref('')
const summary = ref('')
const limitExternalDiscovery = ref(true)
const statusDraft = ref<ActorStatusDraft>(clearActorStatusDraft())
const attributionDomains = ref<string[]>([])
const metadataFields = ref<ProfileField[]>([])
const isLoading = ref(true)
const isSaving = ref(false)
const isVerifying = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const verification = ref<VerificationResponse | null>(null)
const apiBaseUrl = getApiBaseUrl()

const verifiedSummary = computed(() => {
  const total = verification.value?.summary?.totalRelMeLinks ?? 0
  const verified = verification.value?.summary?.verifiedCount ?? 0
  return { total, verified }
})

const statusCharacterCount = computed(() => countStatusCharacters(statusDraft.value.content))
const statusValidationKey = computed(() => validateActorStatusDraft(statusDraft.value))
const authorAttributionValidationKey = computed(() => validateAttributionDomains(attributionDomains.value))
const saveDisabled = computed(() =>
  isSaving.value || Boolean(statusValidationKey.value) || Boolean(authorAttributionValidationKey.value)
)

const authHeaders = computed(() =>
  buildApiHeaders({
    authToken: authStore.token || undefined
  })
)

const parseBoolean = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') return value
  if (typeof value !== 'string') return null

  const normalized = value.trim().toLowerCase()
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true
  if (['false', '0', 'no', 'off'].includes(normalized)) return false
  return null
}

const isExternalDiscoveryLimited = (profile: ActorProfile): boolean => {
  const indexable = parseBoolean(profile.indexable)
  const noindex = parseBoolean(profile.noindex)
  const discoverable = parseBoolean(profile.discoverable)

  return noindex === true || indexable !== true || discoverable === false
}

const loadProfile = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const profile = await ky
      .get(`${apiBaseUrl}/profile`, {
        headers: authHeaders.value,
        timeout: 10000
      })
      .json<ActorProfile>()

    actor.value = profile
    name.value = typeof profile.name === 'string' ? profile.name : ''
    summary.value = typeof profile.summary === 'string' ? profile.summary : ''
    limitExternalDiscovery.value = isExternalDiscoveryLimited(profile)
    statusDraft.value = parseActorStatusDraft(profile.status)
    attributionDomains.value = parseActorAttributionDomains(profile)
    metadataFields.value = extractProfileFields(profile.attachment)
  } catch (error) {
    errorMessage.value = (error as Error)?.message || t('settings.profile.loadFailed')
  } finally {
    isLoading.value = false
  }
}

const saveProfile = async () => {
  if (!actor.value) return
  if (statusValidationKey.value) {
    errorMessage.value = t(statusValidationKey.value)
    return
  }
  if (authorAttributionValidationKey.value) {
    errorMessage.value = t(authorAttributionValidationKey.value)
    return
  }

  isSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const nextActor: ActorProfile = {
      ...actor.value,
      name: name.value.trim(),
      'foaf:name': name.value.trim(),
      summary: summary.value.trim(),
      indexable: !limitExternalDiscovery.value,
      noindex: limitExternalDiscovery.value,
      discoverable: !limitExternalDiscovery.value,
      status: buildActorStatusPayload(statusDraft.value),
      attachment: mergeProfileFieldsIntoAttachment(actor.value.attachment, metadataFields.value)
    }
    const nextAttributionDomains = buildAttributionDomainsPayload(attributionDomains.value)
    if (nextAttributionDomains && nextAttributionDomains.length > 0) {
      nextActor.attributionDomains = nextAttributionDomains
    } else {
      delete nextActor.attributionDomains
    }

    const profile = await ky
      .put(`${apiBaseUrl}/profile`, {
        headers: buildApiHeaders({
          authToken: authStore.token || undefined,
          includeJsonContentType: true
        }),
        json: { actor: nextActor },
        timeout: 10000
      })
      .json<ActorProfile>()

    actor.value = profile
    name.value = typeof profile.name === 'string' ? profile.name : ''
    summary.value = typeof profile.summary === 'string' ? profile.summary : ''
    limitExternalDiscovery.value = isExternalDiscoveryLimited(profile)
    statusDraft.value = parseActorStatusDraft(profile.status)
    attributionDomains.value = parseActorAttributionDomains(profile)
    metadataFields.value = extractProfileFields(profile.attachment)
    verification.value = null
    successMessage.value = t('settings.profile.updated')
  } catch (error) {
    errorMessage.value = (error as Error)?.message || t('settings.profile.saveFailed')
  } finally {
    isSaving.value = false
  }
}

const verifyLinks = async () => {
  isVerifying.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    verification.value = await ky
      .post(`${apiBaseUrl}/actor-metadata/verify`, {
        headers: buildApiHeaders({
          authToken: authStore.token || undefined,
          includeJsonContentType: true
        }),
        json: {},
        timeout: 10000
      })
      .json<VerificationResponse>()

    successMessage.value = t('settings.profile.linkVerificationCompleted')
  } catch (error) {
    errorMessage.value = (error as Error)?.message || t('settings.profile.verifyFailed')
  } finally {
    isVerifying.value = false
  }
}

const addField = () => {
  metadataFields.value = [...metadataFields.value, createEmptyProfileField()]
}

const removeField = (index: number) => {
  metadataFields.value = metadataFields.value.filter((_, fieldIndex) => fieldIndex !== index)
}

const addAttributionDomain = () => {
  attributionDomains.value = [...attributionDomains.value, '']
}

const removeAttributionDomain = (index: number) => {
  attributionDomains.value = attributionDomains.value.filter((_, domainIndex) => domainIndex !== index)
}

const clearStatus = () => {
  statusDraft.value = clearActorStatusDraft()
}

const handleStatusChange = (field: keyof ActorStatusDraft, value: string) => {
  statusDraft.value = { ...statusDraft.value, [field]: value }
}

const handleAttributionDomainChange = (index: number, value: string) => {
  attributionDomains.value[index] = value
}

const handleMetadataFieldChange = (index: number, field: keyof ProfileField, value: string | boolean) => {
  metadataFields.value = metadataFields.value.map((f, i) =>
    i === index ? { ...f, [field]: value } : f
  )
}

onMounted(() => {
  void loadProfile()
})
</script>

<template>
  <div class="pb-20">
    <!-- Header -->
    <AppGroupedList :title="t('settings.profile.title')" :inset="true">
      <p class="app-settings-description">{{ t('settings.profile.description') }}</p>
    </AppGroupedList>

    <!-- Loading state -->
    <AppGroupedList v-if="isLoading" :inset="true">
      <AppList :inset="false">
        <AppListItem :title="t('settings.profile.loading')" />
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

      <!-- Profile Basics -->
      <AppGroupedList :title="t('settings.profile.basics.title')" :inset="true">
        <AppList :inset="false">
          <AppListItem>
            <template #title>
              {{ t('settings.profile.displayName') }}
            </template>
            <template #after>
              <input
                v-model.trim="name"
                type="text"
                class="app-settings-input"
                :aria-label="t('settings.profile.displayName')"
                placeholder="Display name"
              />
            </template>
          </AppListItem>
          <AppListItem>
            <template #title>
              {{ t('settings.profile.summary') }}
            </template>
            <template #after>
              <textarea
                v-model.trim="summary"
                rows="3"
                class="app-settings-textarea"
                :aria-label="t('settings.profile.summary')"
                placeholder="Bio"
              />
            </template>
          </AppListItem>
        </AppList>
      </AppGroupedList>

      <!-- Discovery Settings -->
      <AppGroupedList :title="t('settings.profile.discovery.title')" :inset="true">
        <AppList :inset="false">
          <AppListItem :title="t('settings.profile.discovery.limitExternalDiscovery')" :subtitle="t('settings.profile.discovery.description')">
            <template #after>
              <AppSwitch
                v-model="limitExternalDiscovery"
                @change="(value: boolean) => { limitExternalDiscovery = value }"
                :aria-label="t('settings.profile.discovery.limitExternalDiscovery')"
              />
            </template>
          </AppListItem>
        </AppList>
      </AppGroupedList>

      <!-- Status -->
      <AppGroupedList :title="t('settings.profile.status.title')" :inset="true">
        <p class="app-settings-description">{{ t('settings.profile.status.description') }}</p>
        <AppList :inset="false">
          <AppListItem>
            <template #after>
              <button
                class="app-settings-button secondary"
                type="button"
                @click="clearStatus"
                :aria-label="t('settings.profile.status.clear')"
              >
                {{ t('settings.profile.status.clear') }}
              </button>
            </template>
          </AppListItem>
          <AppListItem>
            <template #title>
              {{ t('settings.profile.status.content') }}
            </template>
            <template #after>
              <textarea
                v-model.trim="statusDraft.content"
                rows="2"
                class="app-settings-textarea"
                :aria-label="t('settings.profile.status.content')"
                placeholder="What's on your mind?"
              />
            </template>
          </AppListItem>
          <AppListItem :title="t('settings.profile.status.counter', { count: statusCharacterCount, limit: STATUS_CHAR_LIMIT })" />
          
          <AppListItem>
            <template #title>
              {{ t('settings.profile.status.expiration') }}
            </template>
            <template #after>
              <input
                v-model="statusDraft.endTimeLocal"
                type="datetime-local"
                class="app-settings-input"
                :aria-label="t('settings.profile.status.expiration')"
              />
            </template>
          </AppListItem>
          <AppListItem :title="t('settings.profile.status.expirationHint')" class="text-caption" />
          
          <AppListItem>
            <template #title>
              {{ t('settings.profile.status.linkTitle') }}
            </template>
            <template #after>
              <input
                v-model.trim="statusDraft.linkName"
                type="text"
                class="app-settings-input"
                :aria-label="t('settings.profile.status.linkTitle')"
                placeholder="Link title"
              />
            </template>
          </AppListItem>
          
          <AppListItem>
            <template #title>
              {{ t('settings.profile.status.linkUrl') }}
            </template>
            <template #after>
              <input
                v-model.trim="statusDraft.linkUrl"
                type="url"
                class="app-settings-input"
                :aria-label="t('settings.profile.status.linkUrl')"
                placeholder="https://"
              />
            </template>
          </AppListItem>
          <AppListItem :title="t('settings.profile.status.linkHint')" class="text-caption" />
          
          <AppListItem v-if="statusValidationKey" :title="t(statusValidationKey)" class="text-amber-800" />
        </AppList>
      </AppGroupedList>

      <!-- Author Attribution -->
      <AppGroupedList :title="t('settings.profile.authorAttribution.title')" :inset="true">
        <p class="app-settings-description">{{ t('settings.profile.authorAttribution.description') }}</p>
        <AppList :inset="false">
          <AppListItem>
            <template #after>
              <button
                class="app-settings-button primary"
                type="button"
                @click="addAttributionDomain"
                :disabled="attributionDomains.length >= ATTRIBUTION_DOMAIN_LIMIT"
                :aria-label="t('settings.profile.authorAttribution.addDomain')"
              >
                {{ t('settings.profile.authorAttribution.addDomain') }}
              </button>
            </template>
          </AppListItem>
          <AppListItem :title="t('settings.profile.authorAttribution.hint', { limit: ATTRIBUTION_DOMAIN_LIMIT })" class="text-caption" />
          
          <AppListItem
            v-if="attributionDomains.length === 0"
            :title="t('settings.profile.authorAttribution.empty')"
            class="text-gray-600"
          />
          
          <AppListItem
            v-for="(domain, index) in attributionDomains"
            :key="`${index}-${domain}`"
          >
            <template #title>
              {{ t('settings.profile.authorAttribution.domainLabel') }}
            </template>
            <template #after>
              <input
                :value="domain"
                type="text"
                class="app-settings-input"
                :aria-label="t('settings.profile.authorAttribution.domainLabel')"
                placeholder="example.com"
                @input="(e) => handleAttributionDomainChange(index, (e.target as HTMLInputElement).value)"
              />
            </template>
          </AppListItem>
          
          <AppListItem v-if="authorAttributionValidationKey" :title="t(authorAttributionValidationKey)" class="text-amber-800" />
        </AppList>
      </AppGroupedList>

      <!-- Profile Fields -->
      <AppGroupedList :title="t('settings.profile.fields.title')" :inset="true">
        <p class="app-settings-description">{{ t('settings.profile.fields.description') }}</p>
        <AppList :inset="false">
          <AppListItem>
            <template #after>
              <button
                class="app-settings-button primary"
                type="button"
                @click="addField"
                :aria-label="t('common.actions.addField')"
              >
                {{ t('common.actions.addField') }}
              </button>
            </template>
          </AppListItem>
          
          <AppListItem
            v-if="metadataFields.length === 0"
            :title="t('settings.profile.fields.empty')"
            class="text-gray-600"
          />
          
          <template v-for="(field, index) in metadataFields" :key="`${index}-${field.name}-${field.value}`">
            <AppListItem>
              <template #title>
                {{ t('settings.profile.fields.label') }}
              </template>
              <template #after>
                <input
                  :value="field.name"
                  type="text"
                  class="app-settings-input"
                  :aria-label="t('settings.profile.fields.label')"
                  @input="(e) => handleMetadataFieldChange(index, 'name', (e.target as HTMLInputElement).value)"
                />
              </template>
            </AppListItem>
            
            <AppListItem>
              <template #title>
                {{ t('settings.profile.fields.type') }}
              </template>
              <template #after>
                <select
                  :value="field.kind"
                  class="app-settings-select"
                  :aria-label="t('settings.profile.fields.type')"
                  @change="(e) => handleMetadataFieldChange(index, 'kind', (e.target as HTMLSelectElement).value)"
                >
                  <option value="text">{{ t('settings.profile.fields.types.text') }}</option>
                  <option value="link">{{ t('settings.profile.fields.types.link') }}</option>
                </select>
              </template>
            </AppListItem>
            
            <AppListItem>
              <template #title>
                {{ t('settings.profile.fields.value') }}
              </template>
              <template #after>
                <input
                  :value="field.value"
                  type="text"
                  class="app-settings-input"
                  :aria-label="t('settings.profile.fields.value')"
                  @input="(e) => handleMetadataFieldChange(index, 'value', (e.target as HTMLInputElement).value)"
                />
              </template>
            </AppListItem>
            
            <AppListItem v-if="field.kind === 'link'">
              <template #title>
                {{ t('settings.profile.fields.relMe') }}
              </template>
              <template #after>
                <AppSwitch
                  :model-value="field.relMe"
                  @change="(value: boolean) => handleMetadataFieldChange(index, 'relMe', value)"
                  :aria-label="t('settings.profile.fields.relMe')"
                />
              </template>
            </AppListItem>
            
            <AppListItem>
              <template #after>
                <AppDestructiveAction
                  label="Remove"
                  danger-level="low"
                  @confirm="removeField(index)"
                />
              </template>
            </AppListItem>
          </template>
        </AppList>
      </AppGroupedList>

      <!-- Actions -->
      <AppGroupedList :inset="true">
        <AppList :inset="false">
          <AppListItem>
            <template #after>
              <div class="flex gap-2">
                <button
                  class="app-settings-button primary"
                  type="button"
                  :disabled="saveDisabled"
                  @click="saveProfile"
                  :aria-label="isSaving ? t('common.states.saving') : t('settings.profile.saveProfile')"
                >
                  {{ isSaving ? t('common.states.saving') : t('settings.profile.saveProfile') }}
                </button>
                <button
                  class="app-settings-button secondary"
                  type="button"
                  :disabled="isVerifying"
                  @click="verifyLinks"
                  :aria-label="isVerifying ? t('common.states.verifying') : t('common.actions.verifyLinks')"
                >
                  {{ isVerifying ? t('common.states.verifying') : t('common.actions.verifyLinks') }}
                </button>
              </div>
            </template>
          </AppListItem>
        </AppList>
      </AppGroupedList>

      <!-- Verification Results -->
      <AppGroupedList v-if="verification" :title="t('settings.profile.verifiedSummary', verifiedSummary)" :inset="true">
        <AppList :inset="false">
          <AppListItem
            v-for="link in verification.links"
            :key="link.href"
          >
            <template #title>
              <a :href="link.href" target="_blank" rel="noopener noreferrer me" class="break-all text-blue-700 underline">
                {{ link.href }}
              </a>
            </template>
            <template #after>
              <span :class="link.verified ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'" class="rounded px-2 py-1 text-xs font-semibold">
                {{ link.verified ? t('settings.profile.verified') : link.reason || t('settings.profile.notVerified') }}
              </span>
            </template>
          </AppListItem>
        </AppList>
      </AppGroupedList>
    </template>

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

.app-settings-input {
  font-family: var(--font-family);
  font-size: var(--text-size-base);
  padding: 0.5rem;
  border: 1px solid var(--color-secondary, #ccc);
  border-radius: var(--rounded);
  background: var(--bg-color, #fff);
  color: var(--color-primary);
  min-width: 150px;
}

.app-settings-textarea {
  font-family: var(--font-family);
  font-size: var(--text-size-base);
  padding: 0.5rem;
  border: 1px solid var(--color-secondary, #ccc);
  border-radius: var(--rounded);
  background: var(--bg-color, #fff);
  color: var(--color-primary);
  min-width: 150px;
  resize: vertical;
}

.app-settings-select {
  font-family: var(--font-family);
  font-size: var(--text-size-base);
  padding: 0.5rem;
  border: 1px solid var(--color-secondary, #ccc);
  border-radius: var(--rounded);
  background: var(--bg-color, #fff);
  color: var(--color-primary);
  min-width: 150px;
}

.app-settings-button {
  font-family: var(--font-family);
  font-size: var(--text-size-base);
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: var(--rounded);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.app-settings-button.primary {
  background-color: var(--color-accent, #1d9bf0);
  color: white;
  border: none;
}

.app-settings-button.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.app-settings-button.secondary {
  background-color: var(--bg-color-secondary, #f7f7f7);
  color: var(--color-primary);
  border: 1px solid var(--color-secondary, #ccc);
}

.app-settings-button.secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
