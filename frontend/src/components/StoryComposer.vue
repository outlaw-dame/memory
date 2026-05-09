<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import AppIcon from './AppIcon.vue'
import { usePostsStore } from '@/stores/postsStore'
import { useAtBridgeStore } from '@/stores/atBridgeStore'
import type { MediaAttachmentInput } from '@/types'

const emit = defineEmits<{
  close: []
  created: []
}>()

const postsStore = usePostsStore()
const atBridgeStore = useAtBridgeStore()

const mediaInput = ref<HTMLInputElement | null>(null)
const attachment = ref<MediaAttachmentInput | null>(null)
const previewUrl = ref<string | null>(null)
const alt = ref('')
const caption = ref('')
const linkUrl = ref('')
const linkTitle = ref('')
const visibility = ref<'public' | 'unlisted'>('public')
const isUploading = ref(false)
const isPublishing = ref(false)
const error = ref('')
const didCreate = ref(false)

const canPublish = computed(() =>
  !!attachment.value?.id &&
  alt.value.trim().length > 0 &&
  !isUploading.value &&
  !isPublishing.value
)

function openMediaPicker() {
  error.value = ''
  mediaInput.value?.click()
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement | null
  const file = input?.files?.[0]
  if (!file) return

  clearPreviewOnly()
  isUploading.value = true
  error.value = ''
  const localPreview = URL.createObjectURL(file)

  try {
    const uploaded = await postsStore.uploadMedia(file)
    if (!uploaded?.id) {
      URL.revokeObjectURL(localPreview)
      error.value = 'Upload failed'
      return
    }
    attachment.value = uploaded
    previewUrl.value = localPreview
    if (!alt.value.trim() && file.name) {
      alt.value = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').slice(0, 120)
    }
  } finally {
    isUploading.value = false
    if (input) input.value = ''
  }
}

function normalizedLinks() {
  const url = linkUrl.value.trim()
  if (!url) return []
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return []
    const title = linkTitle.value.trim()
    return [{ uri: parsed.toString(), ...(title ? { title: title.slice(0, 120) } : {}) }]
  } catch {
    return []
  }
}

async function publishStory() {
  if (!canPublish.value || !attachment.value?.id) return

  isPublishing.value = true
  error.value = ''
  try {
    const story = await atBridgeStore.createStory({
      mediaAttachmentId: attachment.value.id,
      alt: alt.value.trim(),
      ...(caption.value.trim() ? { text: caption.value.trim() } : {}),
      links: normalizedLinks(),
      visibility: visibility.value,
      idempotencyKey: crypto.randomUUID(),
    })
    if (!story) {
      error.value = atBridgeStore.storiesError || 'Story could not be created'
      return
    }
    didCreate.value = true
    emit('created')
    close()
  } finally {
    isPublishing.value = false
  }
}

async function close() {
  if (!didCreate.value && attachment.value?.id) {
    await postsStore.deleteMediaUpload(attachment.value.id)
  }
  clearPreviewOnly()
  emit('close')
}

function clearPreviewOnly() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = null
  attachment.value = null
}

onBeforeUnmount(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
    <section class="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-system-background p-4 shadow-xl sm:rounded-xl">
      <header class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-bold text-label">New story</h2>
        <button
          type="button"
          class="grid h-9 w-9 place-items-center rounded-full bg-secondary-system-background text-label"
          aria-label="Close story composer"
          @click="close"
        >
          <AppIcon name="close" :size="20" />
        </button>
      </header>

      <input
        ref="mediaInput"
        type="file"
        accept="image/avif,image/gif,image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
        class="sr-only"
        @change="onFileChange"
      >

      <button
        v-if="!previewUrl"
        type="button"
        class="grid aspect-[9/14] w-full place-items-center rounded-lg border border-dashed border-separator bg-secondary-system-background text-label"
        :disabled="isUploading"
        @click="openMediaPicker"
      >
        <span class="flex flex-col items-center gap-2 text-sm font-semibold">
          <AppIcon :name="isUploading ? 'loader' : 'image'" :size="28" :class="{ 'animate-spin': isUploading }" />
          <span>{{ isUploading ? 'Uploading' : 'Choose media' }}</span>
        </span>
      </button>

      <div v-else class="overflow-hidden rounded-lg bg-black">
        <video
          v-if="attachment?.mediaType.startsWith('video/')"
          :src="previewUrl"
          class="aspect-[9/14] w-full object-contain"
          muted
          playsinline
          controls
        />
        <img
          v-else
          :src="previewUrl"
          alt=""
          class="aspect-[9/14] w-full object-contain"
        >
      </div>

      <div class="mt-4 grid gap-3">
        <label class="grid gap-1 text-sm font-semibold text-label">
          <span>Alt text</span>
          <input
            v-model="alt"
            maxlength="1000"
            class="rounded-lg border border-separator bg-secondary-system-background px-3 py-2 text-label outline-none focus:border-system-blue"
          >
        </label>

        <label class="grid gap-1 text-sm font-semibold text-label">
          <span>Caption</span>
          <textarea
            v-model="caption"
            maxlength="1000"
            rows="3"
            class="resize-none rounded-lg border border-separator bg-secondary-system-background px-3 py-2 text-label outline-none focus:border-system-blue"
          />
        </label>

        <div class="grid gap-2 sm:grid-cols-[1fr_0.7fr]">
          <input
            v-model="linkUrl"
            type="url"
            placeholder="https://"
            class="rounded-lg border border-separator bg-secondary-system-background px-3 py-2 text-label outline-none focus:border-system-blue"
          >
          <input
            v-model="linkTitle"
            maxlength="120"
            placeholder="Link title"
            class="rounded-lg border border-separator bg-secondary-system-background px-3 py-2 text-label outline-none focus:border-system-blue"
          >
        </div>

        <div class="flex items-center justify-between gap-3">
          <select
            v-model="visibility"
            class="rounded-lg border border-separator bg-secondary-system-background px-3 py-2 text-sm font-semibold text-label outline-none focus:border-system-blue"
          >
            <option value="public">Public</option>
            <option value="unlisted">Unlisted</option>
          </select>

          <button
            type="button"
            class="inline-flex h-10 items-center gap-2 rounded-lg bg-system-blue px-4 text-sm font-bold text-white disabled:opacity-50"
            :disabled="!canPublish"
            @click="publishStory"
          >
            <AppIcon :name="isPublishing ? 'loader' : 'check'" :size="18" :class="{ 'animate-spin': isPublishing }" />
            <span>Publish</span>
          </button>
        </div>

        <p v-if="error" class="text-sm font-medium text-system-red">{{ error }}</p>
      </div>
    </section>
  </div>
</template>
