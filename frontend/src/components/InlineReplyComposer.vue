<script setup lang="ts">
import MemoryButton from './MemoryButton.vue'
import { ref, watch } from 'vue'
import type { ReplyPolicyResolution, ReplySubmissionResult } from '@/composables/useReply'

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

defineExpose({ applyResult })
</script>

<template>
  <div class="mt-3 rounded border border-gray-200 bg-white p-3">
    <div v-if="isResolving" class="text-caption">Loading reply policy…</div>
    <template v-else-if="policy">
      <div class="mb-2 text-caption text-gray-700">
        {{ policy.policyLabel }}
      </div>
      <div v-if="!policy.mayReply" class="mb-2 text-caption text-red-700">
        Replying is not available for this post.
      </div>
      <div v-else-if="policy.requiresApproval" class="mb-2 text-caption text-amber-700">
        Your reply will be sent for approval before wider delivery.
      </div>
      <textarea
        v-if="policy.mayReply"
        v-model="content"
        class="mb-3 min-h-24 w-full resize-y rounded border border-gray-300 px-3 py-2 text-sm"
        placeholder="Write a reply"
      />
      <div v-if="error" class="mb-2 text-caption text-red-700">
        {{ error }}
      </div>
      <div v-if="statusMessage" class="mb-2 text-caption text-green-700">
        {{ statusMessage }}
      </div>
      <div class="flex gap-2">
        <MemoryButton v-if="policy.mayReply" :disabled="isSubmitting" @click="onSubmit">
          {{ isSubmitting ? 'Sending…' : 'Send Reply' }}
        </MemoryButton>
        <button class="rounded px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100" type="button" @click="emit('cancel')">
          Cancel
        </button>
      </div>
    </template>
    <div v-else class="text-caption text-red-700">
      Reply policy could not be loaded.
    </div>
  </div>
</template>
