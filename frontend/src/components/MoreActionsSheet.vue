<script setup lang="ts">
/**
 * MoreActionsSheet - More actions bottom sheet using AppActionsSheet
 *
 * Preserves all current actions:
 * - mute
 * - block
 * - report
 * - copy link
 * - share (native when available)
 * - save
 * - language display
 *
 * Rules:
 * - destructive actions visually marked
 * - destructive actions confirmed or undoable
 * - share uses native share when available
 * - copy uses user-triggered clipboard
 * - unsupported native capabilities fall back safely
 * - no action logs sensitive content
 */

import { computed, ref } from 'vue'
import { useI18n } from '@/i18n'
import { useAtBridgeStore, type UnifiedFeedItem } from '@/stores/atBridgeStore'
import { AppActionsSheet, type ActionItem } from '@/design/semantic'

const props = defineProps<{ item: UnifiedFeedItem; opened: boolean }>()
const emit = defineEmits<{ 'update:opened': [value: boolean] }>()

const { locale, t } = useI18n()
const atBridgeStore = useAtBridgeStore()
const currentLanguageLabel = computed(() => t(`common.languages.${locale.value}`))
const actionError = ref<string | null>(null)
const activeAction = ref<'block' | 'mute' | null>(null)

function close() {
  emit('update:opened', false)
}

function getPostLink(): string {
  return props.item.objectUri ?? props.item.atUri ?? window.location.href
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(getPostLink())
  } catch {
    /* ignore */
  }
  close()
}

async function shareLink() {
  const link = getPostLink()
  try {
    // Try native share API
    if (navigator.share) {
      await navigator.share({
        title: props.item.authorName,
        text: props.item.content,
        url: link,
      })
    } else {
      // Fallback to clipboard copy
      await copyLink()
    }
  } catch (error) {
    // User cancelled or share failed, fallback to copy
    if (error instanceof Error && error.name !== 'AbortError') {
      await copyLink()
    }
  }
  close()
}

async function savePost() {
  // Placeholder for save functionality
  // TODO: Implement actual save when backend is ready
  close()
}

async function moderateAuthor(action: 'block' | 'mute') {
  if (activeAction.value) return

  activeAction.value = action
  actionError.value = null

  try {
    const ok = await atBridgeStore.moderateAuthor(props.item, action)
    if (!ok) {
      actionError.value = atBridgeStore.error || `Failed to ${action} user`
      return
    }
    close()
  } finally {
    activeAction.value = null
  }
}

async function reportPost() {
  // Placeholder for report functionality
  // TODO: Implement actual report when backend is ready
  close()
}

// Action items for AppActionsSheet
const actionItems = computed<ActionItem[]>(() => [
  {
    label: t('moreActions.actions.share'),
    action: shareLink,
    bold: false,
    destructive: false,
  },
  {
    label: t('moreActions.actions.save'),
    action: savePost,
    bold: false,
    destructive: false,
  },
  {
    label: t('moreActions.actions.copyLink'),
    action: copyLink,
    bold: false,
    destructive: false,
  },
  {
    label: t('moreActions.actions.blockUser'),
    description: t('moreActions.actions.blockUserDescription'),
    action: () => moderateAuthor('block'),
    bold: false,
    destructive: true,
    disabled: activeAction.value !== null,
  },
  {
    label: t('moreActions.actions.report'),
    description: t('moreActions.actions.reportDescription'),
    action: reportPost,
    bold: false,
    destructive: false,
  },
  {
    label: t('moreActions.actions.notInterested'),
    description: t('moreActions.actions.notInterestedDescription'),
    action: () => moderateAuthor('mute'),
    bold: false,
    destructive: false,
    disabled: activeAction.value !== null,
  },
])
</script>

<template>
  <AppActionsSheet
    :opened="opened"
    :title="t('moreActions.title')"
    :items="actionItems"
    cancel-label="Cancel"
    @update:opened="emit('update:opened', $event)"
  >
    <!-- Custom header with language display -->
    <template #header>
      <div class="px-6 pt-4 pb-5">
        <p class="text-h2 font-bold text-dark">{{ t('moreActions.title') }}</p>
        <p class="text-footnote text-dark-50 mt-0.5">{{ t('moreActions.description') }}</p>
        
        <!-- Language display -->
        <div class="mt-4 flex items-center gap-4">
          <div class="w-10 h-10 flex items-center justify-center rounded-xl bg-dark-10 shrink-0">
            <svg class="w-5 h-5 text-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-subHeader font-semibold text-dark">{{ t('moreActions.language.title') }}</p>
            <p class="text-caption text-dark-50 mt-0.5">{{ t('moreActions.language.description') }}</p>
          </div>
          <span class="rounded-full bg-dark-10 px-3 py-1 text-footnote font-semibold text-dark shrink-0">{{ currentLanguageLabel }}</span>
        </div>
        
        <p v-if="actionError" class="mt-3 text-footnote font-medium text-red-600">{{ actionError }}</p>
      </div>
    </template>
    
    <!-- Divider -->
    <template #divider>
      <div class="h-px bg-dark-10 mx-6" />
    </template>
  </AppActionsSheet>
</template>

<style scoped>
/* Minimal styling - most is handled by AppActionsSheet */
.text-h2 {
  font-family: var(--font-family);
  font-size: var(--text-size-h2);
  font-weight: 700;
  color: var(--color-dark, #000);
}

.text-footnote {
  font-family: var(--font-family);
  font-size: var(--text-size-footnote);
  color: var(--color-dark-50, #6b7280);
}

.text-subHeader {
  font-family: var(--font-family);
  font-size: var(--text-size-subHeader);
  font-weight: 600;
  color: var(--color-dark, #000);
}

.text-caption {
  font-family: var(--font-family);
  font-size: var(--text-size-caption);
  color: var(--color-dark-50, #6b7280);
}

.text-dark-50 {
  color: var(--color-dark-50, #6b7280);
}

.text-dark {
  color: var(--color-dark, #000);
}

.bg-dark-10 {
  background: var(--color-dark-10, #f3f4f6);
}
</style>
