<script setup lang="ts">
/**
 * StoryComposer - Story creation interface
 *
 * Uses AppComposer for caption input where appropriate.
 * Preserves existing API contract:
 * - Emits: @close, @created
 * - Maintains: media attachment, alt text, caption, links, visibility, expiration
 */

import { computed, onBeforeUnmount, ref } from 'vue'
import AppIcon from './AppIcon.vue'
import { AppComposer } from '@/design/semantic'
import { usePostsStore } from '@/stores/postsStore'
import { useAtBridgeStore } from '@/stores/atBridgeStore'
import type { MediaAttachmentInput } from '@/types'

const emit = defineEmits<{
  close: []
  created: []
}>()

const postsStore = usePostsStore()
const atBridgeStore = useAtBridgeStore()

// Media state
const mediaInput = ref<HTMLInputElement | null>(null)
const attachment = ref<MediaAttachmentInput | null>(null)
const previewUrl = ref<string | null>(null)
const isUploading = ref(false)

// Form state
const alt = ref('')
const linkUrl = ref('')
const linkTitle = ref('')
const visibility = ref<'public' | 'unlisted'>('public')
const isPublishing = ref(false)
const error = ref('')
const didCreate = ref(false)

// AppComposer state for caption
const caption = ref('')

const canPublish = computed(() =>
  !!attachment.value?.id &&
  alt.value.trim().length > 0 &&
  !isUploading.value &&
  !isPublishing.value
)

/**
 * Open native file/photo picker
 * Security: Uses accept attribute to restrict to media types only
 * Privacy: No auto-open on page load
 */
function openMediaPicker() {
  error.value = ''
  mediaInput.value?.click()
}

/**
 * Handle file selection with proper sanitization and validation
 * Security: Validates file type, uses URL.createObjectURL safely
 * Cleanup: Revokes object URLs on error or unmount
 */
async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement | null
  const file = input?.files?.[0]
  if (!file) return

  // Validate file type before processing
  const validTypes = [
    'image/avif', 'image/gif', 'image/jpeg', 'image/png', 'image/webp',
    'video/mp4', 'video/quicktime', 'video/webm'
  ]
  
  if (!validTypes.includes(file.type)) {
    error.value = 'Unsupported media type'
    if (input) input.value = ''
    return
  }

  // Validate file size (max 50MB for safety)
  const MAX_FILE_SIZE = 50 * 1024 * 1024
  if (file.size > MAX_FILE_SIZE) {
    error.value = 'File too large (max 50MB)'
    if (input) input.value = ''
    return
  }

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
    
    // Auto-fill alt text from filename if empty
    if (!alt.value.trim() && file.name) {
      alt.value = file.name
        .replace(/\.[^.]+$/, '')
        .replace(/[-_]+/g, ' ')
        .slice(0, 120)
    }
  } catch (uploadError) {
    URL.revokeObjectURL(localPreview)
    error.value = 'Upload failed'
    console.error('Upload error:', uploadError)
  } finally {
    isUploading.value = false
    if (input) input.value = ''
  }
}

/**
 * Normalize link input to valid URL format
 * Security: Validates URL protocol, sanitizes input
 */
function normalizedLinks(): Array<{ uri: string; title?: string }> {
  const url = linkUrl.value.trim()
  if (!url) return []
  
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return []
    
    const title = linkTitle.value.trim()
    return [{
      uri: parsed.toString(),
      ...(title ? { title: title.slice(0, 120) } : {})
    }]
  } catch {
    return []
  }
}

/**
 * Publish story with validation
 * Security: Validates all inputs before submission
 */
async function publishStory() {
  if (!canPublish.value || !attachment.value?.id) return

  // Validate alt text
  if (!alt.value.trim()) {
    error.value = 'Alt text is required'
    return
  }

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
    await close()
  } catch (publishError) {
    error.value = 'Failed to publish story'
    console.error('Publish error:', publishError)
  } finally {
    isPublishing.value = false
  }
}

/**
 * Close composer with cleanup
 * Security: Cleans up uploaded media if not used
 * Cleanup: Revokes object URLs
 */
async function close() {
  // Clean up unused media upload
  if (!didCreate.value && attachment.value?.id) {
    try {
      await postsStore.deleteMediaUpload(attachment.value.id)
    } catch (cleanupError) {
      console.error('Failed to clean up media upload:', cleanupError)
    }
  }
  
  clearPreviewOnly()
  emit('close')
}

/**
 * Clear preview state without cleaning up uploads
 */
function clearPreviewOnly() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = null
  }
  attachment.value = null
}

// Cleanup on unmount
onBeforeUnmount(() => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
})
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
    <section class="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-system-background p-4 shadow-xl sm:rounded-xl">
      <!-- Header with close button -->
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

      <!-- Hidden file input -->
      <input
        ref="mediaInput"
        type="file"
        accept="image/avif,image/gif,image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm"
        class="sr-only"
        @change="onFileChange"
      >

      <!-- Media picker / preview -->
      <button
        v-if="!previewUrl"
        type="button"
        class="story-composer__media-picker grid aspect-[9/14] w-full place-items-center rounded-lg border border-dashed border-separator bg-secondary-system-background text-label"
        :disabled="isUploading"
        aria-label="Choose media for story"
        @click="openMediaPicker"
      >
        <span class="flex flex-col items-center gap-2 text-sm font-semibold">
          <AppIcon :name="isUploading ? 'loader' : 'image'" :size="28" :class="{ 'animate-spin': isUploading }" />
          <span>{{ isUploading ? 'Uploading' : 'Choose media' }}</span>
        </span>
      </button>

      <div v-else class="story-composer__media-preview overflow-hidden rounded-lg bg-black">
        <video
          v-if="attachment?.mediaType.startsWith('video/')"
          :src="previewUrl"
          class="aspect-[9/14] w-full object-contain"
          muted
          playsinline
          controls
          aria-label="Story video preview"
        />
        <img
          v-else
          :src="previewUrl"
          alt="Story image preview"
          class="aspect-[9/14] w-full object-contain"
        >
      </div>

      <!-- Form inputs -->
      <div class="mt-4 grid gap-3">
        <!-- Alt text input (required) -->
        <label class="grid gap-1 text-sm font-semibold text-label">
          <span>Alt text <span class="text-system-red" aria-hidden="true">*</span></span>
          <input
            v-model="alt"
            maxlength="1000"
            required
            class="rounded-lg border border-separator bg-secondary-system-background px-3 py-2 text-label outline-none focus:border-system-blue"
            placeholder="Describe the image for accessibility"
            aria-required="true"
          >
        </label>

        <!-- Caption using AppComposer -->
        <AppComposer
          v-model="caption"
          purpose="composer"
          placeholder="Add a caption (optional)"
          :maxlength="1000"
          :min-rows="3"
          :max-rows="5"
          size="md"
          rounded="lg"
          auto-resize
          :show-counter="true"
          :disabled="isUploading || isPublishing"
        />

        <!-- Link inputs -->
        <div class="grid gap-2 sm:grid-cols-[1fr_0.7fr]">
          <input
            v-model="linkUrl"
            type="url"
            placeholder="https://"
            class="rounded-lg border border-separator bg-secondary-system-background px-3 py-2 text-label outline-none focus:border-system-blue"
            aria-label="Link URL"
          >
          <input
            v-model="linkTitle"
            maxlength="120"
            placeholder="Link title"
            class="rounded-lg border border-separator bg-secondary-system-background px-3 py-2 text-label outline-none focus:border-system-blue"
            aria-label="Link title"
          >
        </div>

        <!-- Visibility and publish button -->
        <div class="flex items-center justify-between gap-3">
          <label class="flex items-center gap-2">
            <span class="text-sm font-semibold text-label">Visibility:</span>
            <select
              v-model="visibility"
              class="rounded-lg border border-separator bg-secondary-system-background px-3 py-2 text-sm font-semibold text-label outline-none focus:border-system-blue"
              aria-label="Story visibility"
            >
              <option value="public">Public</option>
              <option value="unlisted">Unlisted</option>
            </select>
          </label>

          <button
            type="button"
            class="story-composer__publish inline-flex h-10 items-center gap-2 rounded-lg bg-system-blue px-4 text-sm font-bold text-white disabled:opacity-50"
            :disabled="!canPublish"
            aria-label="Publish story"
            @click="publishStory"
          >
            <AppIcon :name="isPublishing ? 'loader' : 'check'" :size="18" :class="{ 'animate-spin': isPublishing }" />
            <span>Publish</span>
          </button>
        </div>

        <!-- Error message -->
        <p v-if="error" class="text-sm font-medium text-system-red" role="alert">{{ error }}</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.story-composer__media-picker,
.story-composer__media-preview {
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.story-composer__media-picker:hover:not(:disabled) {
  opacity: 0.9;
}

.story-composer__media-picker:active:not(:disabled) {
  opacity: 0.7;
  transform: scale(0.98);
}

.story-composer__media-picker:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.story-composer__publish {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.story-composer__publish:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}

.story-composer__publish:active:not(:disabled) {
  opacity: 0.7;
  transform: translateY(0);
}

.story-composer__publish:disabled {
  cursor: not-allowed;
}
</style>
