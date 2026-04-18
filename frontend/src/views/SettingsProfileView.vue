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
import { buildApiHeaders, getApiBaseUrl } from '@/controller/http'
import { useAuthStore } from '@/stores/authStore'
import ky from 'ky'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from '@/i18n'

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
const statusDraft = ref<ActorStatusDraft>(clearActorStatusDraft())
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
const saveDisabled = computed(() => isSaving.value || Boolean(statusValidationKey.value))

const authHeaders = computed(() =>
  buildApiHeaders({
    authToken: authStore.token || undefined
  })
)

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
    statusDraft.value = parseActorStatusDraft(profile.status)
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

  isSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const nextActor: ActorProfile = {
      ...actor.value,
      name: name.value.trim(),
      'foaf:name': name.value.trim(),
      summary: summary.value.trim(),
      status: buildActorStatusPayload(statusDraft.value),
      attachment: mergeProfileFieldsIntoAttachment(actor.value.attachment, metadataFields.value)
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
    statusDraft.value = parseActorStatusDraft(profile.status)
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

const clearStatus = () => {
  statusDraft.value = clearActorStatusDraft()
}

onMounted(() => {
  void loadProfile()
})
</script>

<template>
  <div class="flex flex-col gap-4 py-4">
    <div>
      <h2 class="text-xl font-semibold">{{ t('settings.profile.title') }}</h2>
      <p class="text-caption mt-1">{{ t('settings.profile.description') }}</p>
    </div>

    <div v-if="isLoading" class="rounded-default bg-pastel-light p-[var(--padding-main)] text-sm">
      {{ t('settings.profile.loading') }}
    </div>

    <div v-else class="rounded-default bg-pastel-light p-[var(--padding-main)] flex flex-col gap-4">
      <p v-if="errorMessage" class="rounded bg-red-100 px-3 py-2 text-sm text-red-800">
        {{ errorMessage }}
      </p>
      <p v-if="successMessage" class="rounded bg-emerald-100 px-3 py-2 text-sm text-emerald-800">
        {{ successMessage }}
      </p>

      <label class="flex flex-col gap-1 text-sm font-medium">
        {{ t('settings.profile.displayName') }}
        <input v-model.trim="name" type="text" class="rounded border border-gray-300 px-3 py-2 font-normal bg-white" />
      </label>

      <label class="flex flex-col gap-1 text-sm font-medium">
        {{ t('settings.profile.summary') }}
        <textarea
          v-model.trim="summary"
          rows="4"
          class="rounded border border-gray-300 px-3 py-2 font-normal bg-white"
        />
      </label>

      <div class="flex flex-col gap-3 rounded bg-white p-3 shadow-sm">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h3 class="text-base font-semibold">{{ t('settings.profile.status.title') }}</h3>
            <p class="text-caption mt-1">{{ t('settings.profile.status.description') }}</p>
          </div>
          <button class="rounded bg-pastel-dark px-3 py-2 text-sm font-medium" type="button" @click="clearStatus">
            {{ t('settings.profile.status.clear') }}
          </button>
        </div>

        <label class="flex flex-col gap-1 text-sm font-medium">
          {{ t('settings.profile.status.content') }}
          <textarea
            v-model.trim="statusDraft.content"
            rows="2"
            class="rounded border border-gray-300 px-3 py-2 font-normal bg-white"
          />
          <span class="text-caption">
            {{ t('settings.profile.status.counter', { count: statusCharacterCount, limit: STATUS_CHAR_LIMIT }) }}
          </span>
        </label>

        <label class="flex flex-col gap-1 text-sm font-medium">
          {{ t('settings.profile.status.expiration') }}
          <input
            v-model="statusDraft.endTimeLocal"
            type="datetime-local"
            class="rounded border border-gray-300 px-3 py-2 font-normal bg-white"
          />
          <span class="text-caption">{{ t('settings.profile.status.expirationHint') }}</span>
        </label>

        <div class="grid gap-3 md:grid-cols-2">
          <label class="flex flex-col gap-1 text-sm font-medium">
            {{ t('settings.profile.status.linkTitle') }}
            <input
              v-model.trim="statusDraft.linkName"
              type="text"
              class="rounded border border-gray-300 px-3 py-2 font-normal bg-white"
            />
          </label>

          <label class="flex flex-col gap-1 text-sm font-medium">
            {{ t('settings.profile.status.linkUrl') }}
            <input
              v-model.trim="statusDraft.linkUrl"
              type="url"
              class="rounded border border-gray-300 px-3 py-2 font-normal bg-white"
              placeholder="https://"
            />
          </label>
        </div>

        <p class="text-caption">{{ t('settings.profile.status.linkHint') }}</p>
        <p v-if="statusValidationKey" class="rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {{ t(statusValidationKey) }}
        </p>
      </div>

      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h3 class="text-base font-semibold">{{ t('settings.profile.fields.title') }}</h3>
            <p class="text-caption mt-1">{{ t('settings.profile.fields.description') }}</p>
          </div>
          <button class="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white" type="button" @click="addField">
            {{ t('common.actions.addField') }}
          </button>
        </div>

        <div v-if="metadataFields.length === 0" class="rounded border border-dashed border-gray-300 bg-white px-3 py-4 text-sm text-gray-600">
          {{ t('settings.profile.fields.empty') }}
        </div>

        <div v-for="(field, index) in metadataFields" :key="`${index}-${field.name}-${field.value}`" class="rounded bg-white p-3 shadow-sm flex flex-col gap-3">
          <div class="grid gap-3 md:grid-cols-[1fr_160px_auto] md:items-end">
            <label class="flex flex-col gap-1 text-sm font-medium">
              {{ t('settings.profile.fields.label') }}
              <input v-model.trim="field.name" type="text" class="rounded border border-gray-300 px-3 py-2 font-normal" />
            </label>

            <label class="flex flex-col gap-1 text-sm font-medium">
              {{ t('settings.profile.fields.type') }}
              <select v-model="field.kind" class="rounded border border-gray-300 px-3 py-2 font-normal bg-white">
                <option value="text">{{ t('settings.profile.fields.types.text') }}</option>
                <option value="link">{{ t('settings.profile.fields.types.link') }}</option>
              </select>
            </label>

            <button class="rounded bg-pastel-dark px-3 py-2 text-sm font-medium" type="button" @click="removeField(index)">
              {{ t('common.actions.remove') }}
            </button>
          </div>

          <label class="flex flex-col gap-1 text-sm font-medium">
            {{ t('settings.profile.fields.value') }}
            <input v-model.trim="field.value" type="text" class="rounded border border-gray-300 px-3 py-2 font-normal" />
          </label>

          <label v-if="field.kind === 'link'" class="flex items-center gap-2 text-sm">
            <input v-model="field.relMe" type="checkbox" />
            {{ t('settings.profile.fields.relMe') }}
          </label>
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <button class="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60" type="button" :disabled="saveDisabled" @click="saveProfile">
          {{ isSaving ? t('common.states.saving') : t('settings.profile.saveProfile') }}
        </button>
        <button class="rounded bg-pastel-dark px-3 py-2 text-sm font-medium disabled:opacity-60" type="button" :disabled="isVerifying" @click="verifyLinks">
          {{ isVerifying ? t('common.states.verifying') : t('common.actions.verifyLinks') }}
        </button>
      </div>

      <div v-if="verification" class="rounded bg-white p-3 shadow-sm flex flex-col gap-2">
        <p class="text-sm font-semibold">
          {{ t('settings.profile.verifiedSummary', verifiedSummary) }}
        </p>
        <div v-if="verification.links?.length" class="flex flex-col gap-2">
          <div v-for="link in verification.links" :key="link.href" class="flex flex-col gap-1 rounded border border-gray-200 px-3 py-2 md:flex-row md:items-center md:justify-between">
            <a :href="link.href" target="_blank" rel="noopener noreferrer me" class="break-all text-blue-700 underline">
              {{ link.href }}
            </a>
            <span :class="link.verified ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'" class="rounded px-2 py-1 text-xs font-semibold">
              {{ link.verified ? t('settings.profile.verified') : link.reason || t('settings.profile.notVerified') }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <RouterLink to="/settings" class="text-sm underline">{{ t('common.actions.backToSettings') }}</RouterLink>
  </div>
</template>
