<script setup lang="ts">
/**
 * MessageErrorState - Error state for messages
 */

import { computed } from 'vue'

export interface MessageErrorStateProps {
  type?: 'network' | 'permission' | 'notFound' | 'unknown' | 'sendFailed'
  message?: string
  recoverable?: boolean
}

const props = withDefaults(defineProps<MessageErrorStateProps>(), {
  type: 'unknown',
  message: '',
  recoverable: true,
})

const emit = defineEmits<{
  (e: 'retry'): void
  (e: 'back'): void
}>()

const errorMessages = {
  network: {
    title: 'Network Error',
    description: 'Unable to connect to the server. Please check your connection.',
  },
  permission: {
    title: 'Permission Denied',
    description: 'You do not have permission to view this conversation.',
  },
  notFound: {
    title: 'Not Found',
    description: 'The conversation or message you are looking for does not exist.',
  },
  unknown: {
    title: 'Error',
    description: 'Something went wrong. Please try again.',
  },
  sendFailed: {
    title: 'Failed to Send',
    description: 'Your message could not be delivered. Please try again.',
  },
}

const errorContent = computed(() => {
  return errorMessages[props.type] || errorMessages.unknown
})

const displayTitle = props.message || errorContent.value.title
const displayDescription = errorContent.value.description

function handleRetry(): void {
  emit('retry')
}

function handleBack(): void {
  emit('back')
}
</script>

<template>
  <div class="message-error-state">
    <slot
      :title="displayTitle"
      :description="displayDescription"
      :recoverable="recoverable"
      :retry="handleRetry"
      :back="handleBack"
    >
      <div class="message-error-state-content">
        <svg viewBox="0 0 24 24" class="message-error-state-icon" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
        <h3 class="message-error-state-title">{{ displayTitle }}</h3>
        <p class="message-error-state-description">{{ displayDescription }}</p>
        <div v-if="recoverable" class="message-error-state-actions">
          <slot name="actions">
            <button type="button" class="message-error-state-action message-error-state-action-primary" aria-label="Try again" @click="handleRetry">
              Try Again
            </button>
            <button v-if="type === 'notFound' || type === 'permission'" type="button" class="message-error-state-action message-error-state-action-secondary" aria-label="Go back" @click="handleBack">
              Go Back
            </button>
          </slot>
        </div>
        <p v-else class="message-error-state-non-recoverable">This error cannot be recovered automatically.</p>
        <slot name="content" />
      </div>
    </slot>
  </div>
</template>

<style scoped>
.message-error-state {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
}

.message-error-state-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.message-error-state-icon {
  width: 64px;
  height: 64px;
  color: #ef4444;
  opacity: 0.8;
}

.message-error-state-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #000;
}

.message-error-state-description {
  margin: 0;
  font-size: 16px;
  color: #666;
  line-height: 1.5;
  max-width: 300px;
}

.message-error-state-actions {
  display: flex;
  gap: 0.75rem;
  padding-top: 0.5rem;
}

.message-error-state-action {
  padding: 0.5rem 1.25rem;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
  border: none;
}

.message-error-state-action-primary {
  background-color: #1d9bf0;
  color: white;
}

.message-error-state-action-primary:hover {
  background-color: #1a8cd8;
}

.message-error-state-action-secondary {
  background-color: transparent;
  color: #1d9bf0;
  border: 1px solid #1d9bf0;
}

.message-error-state-action-secondary:hover {
  background-color: rgba(29, 155, 240, 0.05);
}

.message-error-state-non-recoverable {
  margin: 0;
  font-size: 14px;
  color: #999;
  font-style: italic;
}
</style>
