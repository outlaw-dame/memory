<script setup lang="ts">
/**
 * InlineReplyComposer - Uses AppComposer for semantic reply composition
 *
 * Preserves:
 * - reply policy resolution
 * - submitting state
 * - error display
 * - cancel behavior
 * - success result handling
 * - keyboard-aware layout
 */

import { ref, watch, computed } from 'vue'
import type { ReplyPolicyResolution, ReplySubmissionResult } from '@/composables/useReply'
import { AppComposer } from '@/design/semantic'

const props = defineProps<{
  policy: ReplyPolicyResolution | null
  isResolving: boolean
  isSubmitting: boolean
  error: string | null
}>()

const emit = defineEmits<{
  submit: [content: string]
  cancel: []
}>()

const content = ref('')
const statusMessage = ref<string | null>(null)

watch(
  () => props.error,
  value => {
    if (value) {
      statusMessage.value = null
    }
  },
)

function onSubmit() {
  const normalized = content.value.trim()
  if (!normalized) return
  emit('submit', normalized)
}

function applyResult(result: ReplySubmissionResult | null) {
  if (!result) return
  statusMessage.value = result.pendingApproval
    ? 'Reply sent for approval.'
    : 'Reply posted.'
  content.value = ''
}

// Computed properties for AppComposer
const composerPlaceholder = computed(() => {
  return 'Write a reply'
})

const composerHelperText = computed(() => {
  if (!props.policy) return 'Loading reply policy…'
  if (!props.policy.mayReply) return 'Replying is not available for this post.'
  if (props.policy.requiresApproval) return 'Your reply will be sent for approval before wider delivery.'
  return ''
})

const composerError = computed(() => {
  return props.error || null
})

const showPolicyMessage = computed(() => {
  return props.isResolving || (props.policy && (!props.policy.mayReply || props.policy.requiresApproval))
})

defineExpose({ applyResult })
</script>

<template>
  <div class="inline-reply-composer">
    <!-- Policy message -->
    <div v-if="showPolicyMessage" class="inline-reply-policy">
      <template v-if="isResolving">
        Loading reply policy…
      </template>
      <template v-else-if="policy && !policy.mayReply">
        <span class="text-red-700">Replying is not available for this post.</span>
      </template>
      <template v-else-if="policy && policy.requiresApproval">
        <span class="text-amber-700">Your reply will be sent for approval before wider delivery.</span>
      </template>
    </div>

    <!-- AppComposer -->
    <AppComposer
      v-if="policy && policy.mayReply"
      v-model="content"
      purpose="composer"
      :placeholder="composerPlaceholder"
      :helper-text="composerHelperText"
      :error-message="composerError"
      :error="!!composerError"
      :disabled="isSubmitting"
      :loading="isSubmitting"
      :show-counter="true"
      size="sm"
      rounded="md"
      auto-resize
      :min-rows="3"
      :max-rows="8"
      @submit="onSubmit"
    >
      <!-- Status message -->
      <template #helper v-if="statusMessage">
        <span class="text-green-700">{{ statusMessage }}</span>
      </template>
      
      <!-- Submit and cancel buttons -->
      <template #bottom>
        <div class="inline-reply-buttons">
          <button
            class="inline-reply-cancel"
            type="button"
            @click="emit('cancel')"
          >
            Cancel
          </button>
        </div>
      </template>
      
      <template #submit>
        <button
          class="inline-reply-submit"
          :disabled="isSubmitting || !content.trim()"
          @click="onSubmit"
        >
          {{ isSubmitting ? 'Sending…' : 'Send Reply' }}
        </button>
      </template>
    </AppComposer>

    <!-- Policy not loaded or cannot reply -->
    <div v-else-if="!isResolving" class="inline-reply-error">
      <template v-if="!policy">
        Reply policy could not be loaded.
      </template>
      <template v-else-if="!policy.mayReply">
        Replying is not available for this post.
      </template>
    </div>
  </div>
</template>

<style scoped>
.inline-reply-composer {
  margin-top: 0.75rem;
  
  background: var(--color-white, #fff);
  border: 1px solid var(--color-gray-200, #e5e7eb);
  border-radius: var(--rounded-default, 1rem);
  
  padding: 0.75rem;
}

.inline-reply-policy {
  font-family: var(--font-family);
  font-size: var(--text-size-caption);
  line-height: 1.5;
  
  margin-bottom: 0.5rem;
  padding: 0.25rem 0.5rem;
  
  color: var(--color-gray-700, #374151);
  background: color-mix(in srgb, var(--color-gray-200) 10%, transparent);
  border-radius: 0.5rem;
}

.inline-reply-policy .text-red-700 {
  color: var(--color-red-700, #dc2626);
}

.inline-reply-policy .text-amber-700 {
  color: var(--color-amber-700, #d97706);
}

.inline-reply-error {
  font-family: var(--font-family);
  font-size: var(--text-size-caption);
  color: var(--color-red-700, #dc2626);
  
  padding: 0.5rem;
  
  text-align: center;
}

.inline-reply-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  
  margin-top: 0.5rem;
}

.inline-reply-cancel {
  padding: 0.5rem 1rem;
  
  font-family: var(--font-family);
  font-size: var(--text-size-small);
  font-weight: 500;
  color: var(--color-gray-700, #374151);
  
  background: var(--color-gray-100, #f3f4f6);
  border: none;
  border-radius: 9999px;
  
  cursor: pointer;
  
  transition: background-color 0.2s ease, color 0.2s ease;
}

.inline-reply-cancel:hover {
  background: var(--color-gray-200, #e5e7eb);
  color: var(--color-gray-800, #1f2937);
}

.inline-reply-cancel:active {
  background: var(--color-gray-300, #d1d5db);
}

.inline-reply-submit {
  padding: 0.5rem 1rem;
  
  font-family: var(--font-family);
  font-size: var(--text-size-small);
  font-weight: 600;
  color: white;
  
  background: var(--color-accent, #1d9bf0);
  border: none;
  border-radius: 9999px;
  
  cursor: pointer;
  
  transition: opacity 0.2s ease, background-color 0.2s ease;
}

.inline-reply-submit:hover:not(:disabled) {
  opacity: 0.85;
}

.inline-reply-submit:active:not(:disabled) {
  opacity: 0.7;
}

.inline-reply-submit:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
