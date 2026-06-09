/**
 * MediaViewerToolbar - Toolbar for media viewer with actions
 *
 * Responsibilities:
 * - Share action
 * - Save/download action (if allowed)
 * - Open original action (if allowed)
 * - Alt text/caption display
 * - Close button
 * - Safe-area aware layout
 */

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

export interface MediaViewerToolbarProps {
  mediaUrl: string
  altText?: string
  caption?: string
  canDownload?: boolean
  canShare?: boolean
  showClose?: boolean
  onClose?: () => void
  onDownload?: () => void
  onShare?: () => void
  onOpenOriginal?: () => void
}

const props = defineProps<MediaViewerToolbarProps>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'download'): void
  (e: 'share'): void
  (e: 'open-original'): void
}>()

const hasCaption = computed(() => {
  return !!(props.caption || props.altText)
})

const displayText = computed(() => {
  return props.caption || props.altText || ''
})

function handleClose() {
  props.onClose?.()
  emit('close')
}

function handleDownload() {
  if (props.canDownload) {
    props.onDownload?.()
    emit('download')
  }
}

function handleShare() {
  if (props.canShare) {
    props.onShare?.()
    emit('share')
  }
}

function handleOpenOriginal() {
  props.onOpenOriginal?.()
  emit('open-original')
}

// Native share API
async function shareNative() {
  if (props.canShare && typeof navigator !== 'undefined' && navigator.share) {
    try {
      const url = props.mediaUrl
      await navigator.share({
        url,
        title: displayText.value || 'Media',
        text: displayText.value
      })
    } catch (error) {
      // User cancelled or share failed
      console.debug('Share failed:', error)
    }
  }
}

// Download handler
function downloadMedia() {
  if (!props.canDownload) return
  
  const url = props.mediaUrl
  if (!url) return
  
  // Create a temporary anchor to trigger download
  const link = document.createElement('a')
  link.href = url
  link.download = ''
  link.target = '_blank'
  link.rel = 'noopener noreferrer'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
</script>

<template>
  <div
    class="media-viewer-toolbar absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent p-4"
    :class="{
      'safe-area-bottom': true
    }"
    role="toolbar"
    aria-label="Media actions"
  >
    <!-- Caption/Alt text -->
    <p
      v-if="hasCaption"
      class="media-viewer-toolbar__text mb-3 text-sm font-medium text-white"
    >
      {{ displayText }}
    </p>

    <!-- Actions -->
    <div class="media-viewer-toolbar__actions flex items-center justify-between gap-2">
      <!-- Left actions -->
      <div class="media-viewer-toolbar__left flex items-center gap-2">
        <!-- Open original -->
        <button
          v-if="onOpenOriginal"
          type="button"
          class="media-viewer-toolbar__action grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white"
          aria-label="Open original"
          @click="handleOpenOriginal"
        >
          <AppIcon name="back" :size="20" />
        </button>
      </div>

      <!-- Right actions -->
      <div class="media-viewer-toolbar__right flex items-center gap-2">
        <!-- Download -->
        <button
          v-if="canDownload"
          type="button"
          class="media-viewer-toolbar__action grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white"
          aria-label="Download"
          @click="downloadMedia"
        >
          <AppIcon name="copy" :size="20" />
        </button>

        <!-- Share -->
        <button
          v-if="canShare"
          type="button"
          class="media-viewer-toolbar__action grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white"
          aria-label="Share"
          @click="shareNative"
        >
          <AppIcon name="share" :size="20" />
        </button>

        <!-- Close -->
        <button
          v-if="showClose !== false"
          type="button"
          class="media-viewer-toolbar__action grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white"
          aria-label="Close"
          @click="handleClose"
        >
          <AppIcon name="close" :size="20" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.media-viewer-toolbar {
  /* Safe area insets */
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
}

.media-viewer-toolbar__text {
  /* Improve readability */
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.media-viewer-toolbar__actions {
  width: 100%;
}

.media-viewer-toolbar__left,
.media-viewer-toolbar__right {
  /* Ensure actions don't overflow */
  flex: 1;
  min-width: 0;
}

.media-viewer-toolbar__action {
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.2s ease;
  touch-action: manipulation;
  /* Shadow for visibility */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.media-viewer-toolbar__action:hover {
  opacity: 0.9;
  transform: scale(1.05);
}

.media-viewer-toolbar__action:active {
  opacity: 0.7;
  transform: scale(0.95);
}

.media-viewer-toolbar__action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
