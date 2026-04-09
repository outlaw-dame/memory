<script setup lang="ts">
import MemoryButton from '@/components/MemoryButton.vue'
import {
  createEmptyProfileField,
  extractProfileFields,
  mergeProfileFieldsIntoAttachment,
  type ProfileField
} from '@/controller/profileMetadata'
import { useAuthStore } from '@/stores/authStore'
import ky from 'ky'
import { computed, onMounted, ref } from 'vue'

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

const actor = ref<ActorProfile | null>(null)
const name = ref('')
const summary = ref('')
const metadataFields = ref<ProfileField[]>([])
const isLoading = ref(true)
const isSaving = ref(false)
const isVerifying = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const verification = ref<VerificationResponse | null>(null)

const verifiedSummary = computed(() => {
  const total = verification.value?.summary?.totalRelMeLinks ?? 0
  const verified = verification.value?.summary?.verifiedCount ?? 0
  return { total, verified }
})

const authHeaders = computed(() => ({ auth: authStore.token || '' }))

const loadProfile = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const profile = await ky
      .get(`${import.meta.env.VITE_API_URL}/profile`, {
        headers: authHeaders.value,
        timeout: 10000
      })
      .json<ActorProfile>()

    actor.value = profile
    name.value = typeof profile.name === 'string' ? profile.name : ''
    summary.value = typeof profile.summary === 'string' ? profile.summary : ''
    metadataFields.value = extractProfileFields(profile.attachment)
  } catch (error) {
    errorMessage.value = String((error as Error)?.message || error)
  } finally {
    isLoading.value = false
  }
}

const saveProfile = async () => {
  if (!actor.value) return

  isSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    const nextActor: ActorProfile = {
      ...actor.value,
      name: name.value.trim(),
      'foaf:name': name.value.trim(),
      summary: summary.value.trim(),
      attachment: mergeProfileFieldsIntoAttachment(actor.value.attachment, metadataFields.value)
    }

    const profile = await ky
      .put(`${import.meta.env.VITE_API_URL}/profile`, {
        headers: {
          ...authHeaders.value,
          'Content-Type': 'application/json'
        },
        json: { actor: nextActor },
        timeout: 10000
      })
      .json<ActorProfile>()

    actor.value = profile
    name.value = typeof profile.name === 'string' ? profile.name : ''
    summary.value = typeof profile.summary === 'string' ? profile.summary : ''
    metadataFields.value = extractProfileFields(profile.attachment)
    verification.value = null
    successMessage.value = 'Profile updated.'
  } catch (error) {
    errorMessage.value = String((error as Error)?.message || error)
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
      .post(`${import.meta.env.VITE_API_URL}/actor-metadata/verify`, {
        headers: {
          ...authHeaders.value,
          'Content-Type': 'application/json'
        },
        json: {},
        timeout: 10000
      })
      .json<VerificationResponse>()

    successMessage.value = 'Link verification completed.'
  } catch (error) {
    errorMessage.value = String((error as Error)?.message || error)
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

onMounted(() => {
  void loadProfile()
})
</script>

<template>
  <div class="flex flex-col gap-4 py-4">
    <div>
      <h2 class="text-xl font-semibold">Profile</h2>
      <p class="text-caption mt-1">Edit your public ActivityPub profile fields and verify rel=me links.</p>
    </div>

    <div v-if="isLoading" class="rounded-default bg-pastel-light p-[var(--padding-main)] text-sm">
      Loading profile...
    </div>

    <div v-else class="rounded-default bg-pastel-light p-[var(--padding-main)] flex flex-col gap-4">
      <p v-if="errorMessage" class="rounded bg-red-100 px-3 py-2 text-sm text-red-800">
        {{ errorMessage }}
      </p>
      <p v-if="successMessage" class="rounded bg-emerald-100 px-3 py-2 text-sm text-emerald-800">
        {{ successMessage }}
      </p>

      <label class="flex flex-col gap-1 text-sm font-medium">
        Display name
        <input v-model.trim="name" type="text" class="rounded border border-gray-300 px-3 py-2 font-normal bg-white" />
      </label>

      <label class="flex flex-col gap-1 text-sm font-medium">
        Summary
        <textarea
          v-model.trim="summary"
          rows="4"
          class="rounded border border-gray-300 px-3 py-2 font-normal bg-white"
        />
      </label>

      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h3 class="text-base font-semibold">Profile fields</h3>
            <p class="text-caption mt-1">Use text fields for labels like pronouns and link fields for websites or identities.</p>
          </div>
          <button class="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white" type="button" @click="addField">
            Add field
          </button>
        </div>

        <div v-if="metadataFields.length === 0" class="rounded border border-dashed border-gray-300 bg-white px-3 py-4 text-sm text-gray-600">
          No profile fields yet.
        </div>

        <div v-for="(field, index) in metadataFields" :key="`${index}-${field.name}-${field.value}`" class="rounded bg-white p-3 shadow-sm flex flex-col gap-3">
          <div class="grid gap-3 md:grid-cols-[1fr_160px_auto] md:items-end">
            <label class="flex flex-col gap-1 text-sm font-medium">
              Label
              <input v-model.trim="field.name" type="text" class="rounded border border-gray-300 px-3 py-2 font-normal" />
            </label>

            <label class="flex flex-col gap-1 text-sm font-medium">
              Type
              <select v-model="field.kind" class="rounded border border-gray-300 px-3 py-2 font-normal bg-white">
                <option value="text">Text</option>
                <option value="link">Link</option>
              </select>
            </label>

            <button class="rounded bg-pastel-dark px-3 py-2 text-sm font-medium" type="button" @click="removeField(index)">
              Remove
            </button>
          </div>

          <label class="flex flex-col gap-1 text-sm font-medium">
            Value
            <input v-model.trim="field.value" type="text" class="rounded border border-gray-300 px-3 py-2 font-normal" />
          </label>

          <label v-if="field.kind === 'link'" class="flex items-center gap-2 text-sm">
            <input v-model="field.relMe" type="checkbox" />
            Mark as rel=me link
          </label>
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <button class="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60" type="button" :disabled="isSaving" @click="saveProfile">
          {{ isSaving ? 'Saving...' : 'Save profile' }}
        </button>
        <button class="rounded bg-pastel-dark px-3 py-2 text-sm font-medium disabled:opacity-60" type="button" :disabled="isVerifying" @click="verifyLinks">
          {{ isVerifying ? 'Verifying...' : 'Verify links' }}
        </button>
      </div>

      <div v-if="verification" class="rounded bg-white p-3 shadow-sm flex flex-col gap-2">
        <p class="text-sm font-semibold">
          Verified {{ verifiedSummary.verified }} of {{ verifiedSummary.total }} rel=me links.
        </p>
        <div v-if="verification.links?.length" class="flex flex-col gap-2">
          <div v-for="link in verification.links" :key="link.href" class="flex flex-col gap-1 rounded border border-gray-200 px-3 py-2 md:flex-row md:items-center md:justify-between">
            <a :href="link.href" target="_blank" rel="noopener noreferrer me" class="break-all text-blue-700 underline">
              {{ link.href }}
            </a>
            <span :class="link.verified ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'" class="rounded px-2 py-1 text-xs font-semibold">
              {{ link.verified ? 'Verified' : link.reason || 'Not verified' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <RouterLink to="/settings" class="text-sm underline">Back to Settings</RouterLink>
  </div>
</template>