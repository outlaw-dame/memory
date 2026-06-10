<script setup lang="ts">
/**
 * MessageAttachmentPreview - Preview component for message attachments
 * 
 * Displays image, video, or other media attachments in a message.
 * Supports click-to-view and download functionality.
 * 
 * Security considerations:
 * - Only renders media from trusted sources (valid URLs)
 * - No direct HTML rendering from attachment data
 * - All URLs are validated before rendering
 * - No script execution from media URLs
 */

import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import type { MessageAttachment } from './types'

export interface MessageAttachmentPreviewProps {
  /** Attachment to preview */
  attachment: MessageAttachment
  /** Message ID this attachment belongs to */
  messageId?: string
  /** Maximum width for the preview */
  maxWidth?: number
  /** Maximum height for the preview */
  maxHeight?: number
  /** Whether to show download button */
  showDownload?: boolean
  /** Custom CSS classes for the preview */
  class?: string
}

const props = withDefaults(defineProps<MessageAttachmentPreviewProps>(), {
  messageId: '',
  maxWidth: 400,
  maxHeight: 400,
  showDownload: true,
  class: '',
})

const emit = defineEmits<{
  (e: 'action', action: string, attachmentId: string): void
  (e: 'loadError', attachmentId: string, error: string): void
  (e: 'click', attachment: MessageAttachment): void
}>()

/**
 * Whether the attachment is an image
 */
const isImage = computed(() => {
  return props.attachment.kind === 'image' || 
    (props.attachment.url && /\.(png|jpe?g|webp|avif|heic|bmp|svg|gif)(\?|#|$)/i.test(props.attachment.url))
})

/**
 * Whether the attachment is a video
 */
const isVideo = computed(() => {
  return props.attachment.kind === 'video' || 
    (props.attachment.url && /\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(props.attachment.url))
})

/**
 * Whether the attachment is audio
 */
const isAudio = computed(() => {
  return props.attachment.kind === 'audio' || 
    (props.attachment.url && /\.(mp3|wav|ogg|m4a|aac)(\?|#|$)/i.test(props.attachment.url))
})

/**
 * Whether the attachment is a file (non-media)
 */
const isFile = computed(() => {
  return props.attachment.kind === 'file'
})

/**
 * Safe URL for the attachment
 */
const safeUrl = computed(() => {
  const url = props.attachment.url || ''
  
  // Validate URL
  if (!url || !/^https?:\/\//i.test(url)) {
    return ''
  }
  
  return url
})

/**
 * Whether the media failed to load
 */
const loadError = ref(false)

/**
 * Error message
 */
const errorMessage = ref<string | null>(null)

/**
 * Preview container size
 */
const previewSize = computed(() => {
  return {
    maxWidth: `${props.maxWidth}px`,
    maxHeight: `${props.maxHeight}px`,
  }
})

/**
 * Display name for the attachment
 */
const displayName = computed(() => {
  return props.attachment.filename || 
    props.attachment.alt || 
    props.attachment.url.split('/').pop() || 
    `Attachment ${props.attachment.id.slice(0, 8)}`
})

/**
 * File size display
 */
const fileSizeDisplay = computed(() => {
  if (!props.attachment.sizeBytes) return null
  
  const bytes = props.attachment.sizeBytes
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
})

/**
 * Whether to show the preview
 */
const showPreview = computed(() => {
  return (isImage.value || isVideo.value || isAudio.value) && !loadError.value
})

/**
 * Whether to show file info
 */
const showFileInfo = computed(() => {
  return isFile.value || loadError.value
})

/**
 * Download the attachment
 */
function handleDownload(event: MouseEvent): void {
  event.stopPropagation()
  
  if (!safeUrl.value) return
  
  const link = document.createElement('a')
  link.href = safeUrl.value
  link.download = displayName.value
  link.target = '_blank'
  link.rel = 'noreferrer noopener'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  emit('action', 'download', props.attachment.id)
}

/**
 * Handle click on preview
 */
function handleClick(): void {
  emit('click', props.attachment)
}

/**
 * Handle media load error
 */
function handleLoadError(event: Event): void {
  loadError.value = true
  errorMessage.value = 'Failed to load media'
  emit('loadError', props.attachment.id, 'Failed to load media')
}

/**
 * Handle media loaded
 */
function handleMediaLoaded(): void {
  loadError.value = false
  errorMessage.value = null
}

/**
 * Check if URL is safe to render
 */
function isSafeUrl(url: string): boolean {
  if (!url || !/^https?:\/\//i.test(url)) return false
  
  // Basic safety checks
  // Note: In production, you might want more sophisticated checks
  const dangerousPatterns = [
    'javascript:',
    'data:text/html',
    'data:application/',
  ]
  
  return !dangerousPatterns.some(pattern => url.toLowerCase().includes(pattern))
}

/**
 * Get MIME type for display
 */
function getMimeDescription(mimeType?: string): string {
  if (!mimeType) return 'Unknown'
  
  const parts = mimeType.split('/')
  if (parts.length === 2) {
    return parts[1] || parts[0]
  }
  return mimeType
}

// Clean up on unmount
onBeforeUnmount(() => {
  // Revoke any object URLs if we created them
  // Note: This is only for blob URLs created by the app
})
</script>

<template>
  <div
    class="message-attachment-preview"
    :class="[props.class, {
      'message-attachment-preview-image': isImage,
      'message-attachment-preview-video': isVideo,
      'message-attachment-preview-audio': isAudio,
      'message-attachment-preview-file': isFile || loadError,
    }]"
    role="img"
    :aria-label="`Attachment: ${displayName}${fileSizeDisplay ? ` (${fileSizeDisplay})` : ''}`"
    @click="handleClick"
  >
    <!-- Image Preview -->
    <div v-if="isImage && !loadError" class="message-attachment-preview-media">
      <img
        :src="safeUrl"
        :alt="attachment.alt || displayName"
        class="message-attachment-preview-image-element"
        :style="previewSize"
        @error="handleLoadError"
        @load="handleMediaLoaded"
      />
      <button v-if="showDownload" type="button" class="message-attachment-preview-download" aria-label="Download attachment" @click.stop="handleDownload">
        <svg viewBox="0 0 24 24" class="message-attachment-preview-download-icon" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>
    </div>

    <!-- Video Preview -->
    <div v-else-if="isVideo && !loadError" class="message-attachment-preview-media">
      <video
        :src="safeUrl"
        class="message-attachment-preview-video-element"
        :style="previewSize"
        controls
        playsinline
        @error="handleLoadError"
        @loadedmetadata="handleMediaLoaded"
      />
      <button v-if="showDownload" type="button" class="message-attachment-preview-download" aria-label="Download attachment" @click.stop="handleDownload">
        <svg viewBox="0 0 24 24" class="message-attachment-preview-download-icon" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>
    </div>

    <!-- Audio Preview -->
    <div v-else-if="isAudio && !loadError" class="message-attachment-preview-media">
      <audio
        :src="safeUrl"
        class="message-attachment-preview-audio-element"
        controls
        @error="handleLoadError"
        @canplay="handleMediaLoaded"
      />
      <button v-if="showDownload" type="button" class="message-attachment-preview-download" aria-label="Download attachment" @click.stop="handleDownload">
        <svg viewBox="0 0 24 24" class="message-attachment-preview-download-icon" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>
    </div>

    <!-- File Preview (non-media) -->
    <div v-else class="message-attachment-preview-file">
      <div class="message-attachment-preview-file-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L12 18.56l1.44-1.44a2 2 0 0 1 2.83-2.83l-1.44-1.44" />
        </svg>
      </div>
      <div class="message-attachment-preview-file-info">
        <span class="message-attachment-preview-file-name">{{ displayName }}</span>
        <span v-if="attachment.mimeType" class="message-attachment-preview-file-type">
          {{ getMimeDescription(attachment.mimeType) }}
        </span>
        <span v-if="fileSizeDisplay" class="message-attachment-preview-file-size">
          {{ fileSizeDisplay }}
        </span>
      </div>
      <button v-if="showDownload" type="button" class="message-attachment-preview-file-download" @click.stop="handleDownload">
        <span>Download</span>
        <svg viewBox="0 0 24 24" class="message-attachment-preview-download-icon" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>
    </div>

    <!-- Error State -->
    <div v-if="loadError && errorMessage" class="message-attachment-preview-error">
      <svg viewBox="0 0 24 24" class="message-attachment-preview-error-icon" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
      <span class="message-attachment-preview-error-message">{{ errorMessage }}</span>
      <button v-if="showDownload" type="button" class="message-attachment-preview-error-retry" aria-label="Try again" @click.stop="handleDownload">
        Try Again
      </button>
    </div>
  </div>
</template>

<style scoped>
.message-attachment-preview {
  cursor: pointer;
  border-radius: 20px;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  animation: fadeIn 0.2s ease-out;
}

.message-attachment-preview:hover {
  transform: scale(1.02);
}

.message-attachment-preview-media {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 16px;
}

.message-attachment-preview-image-element,
.message-attachment-preview-video-element {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 12px;
}

.message-attachment-preview-audio-element {
  width: 100%;
  max-width: 300px;
  height: 44px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.02);
}

.message-attachment-preview-download {
  position: absolute;
  bottom: 0.5rem;
  right: 0.5rem;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.2s ease;
}

.message-attachment-preview-download:hover {
  background: rgba(0, 0, 0, 0.9);
  transform: scale(1.1);
}

.message-attachment-preview-download-icon {
  width: 14px;
  height: 14px;
  color: white;
}

.message-attachment-preview-file {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.message-attachment-preview-file:hover {
  background: rgba(0, 0, 0, 0.05);
}

.message-attachment-preview-file-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  color: #666;
}

.message-attachment-preview-file-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.message-attachment-preview-file-name {
  font-size: 14px;
  font-weight: 500;
  color: #000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.message-attachment-preview-file-type {
  font-size: 12px;
  color: #666;
}

.message-attachment-preview-file-size {
  font-size: 11px;
  color: #888;
}

.message-attachment-preview-file-download {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0.75rem;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  color: #1d9bf0;
  background: transparent;
  border: 1px solid #1d9bf0;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.message-attachment-preview-file-download:hover {
  background: rgba(29, 155, 240, 0.05);
}

.message-attachment-preview-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(239, 68, 68, 0.05);
  border-radius: 16px;
  text-align: center;
  gap: 0.5rem;
}

.message-attachment-preview-error-icon {
  width: 32px;
  height: 32px;
  color: #ef4444;
  opacity: 0.8;
}

.message-attachment-preview-error-message {
  font-size: 14px;
  color: #ef4444;
}

.message-attachment-preview-error-retry {
  padding: 0.5rem 1rem;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #1d9bf0;
  background: transparent;
  border: 1px solid #1d9bf0;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.message-attachment-preview-error-retry:hover {
  background: rgba(29, 155, 240, 0.05);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
