<script setup lang="ts">
/**
 * MessageLoadingState - Loading state for messages
 */

export interface MessageLoadingStateProps {
  type?: 'loadingConversations' | 'loadingThread'
  message?: string
  showSpinner?: boolean
}

const props = withDefaults(defineProps<MessageLoadingStateProps>(), {
  type: 'loadingConversations',
  message: '',
  showSpinner: true,
})

const defaultMessages = {
  loadingConversations: 'Loading conversations...',
  loadingThread: 'Loading messages...',
}

const displayMessage = props.message || defaultMessages[props.type]
</script>

<template>
  <div class="message-loading-state">
    <slot :message="displayMessage" :show-spinner="showSpinner">
      <div class="message-loading-state-content">
        <div v-if="showSpinner" class="message-loading-state-spinner" aria-hidden="true" />
        <p v-if="displayMessage" class="message-loading-state-message">{{ displayMessage }}</p>
        <slot name="content" />
      </div>
    </slot>
  </div>
</template>

<style scoped>
.message-loading-state {
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
}

.message-loading-state-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.message-loading-state-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f5f5f5;
  border-top-color: #1d9bf0;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.message-loading-state-message {
  margin: 0;
  font-size: 16px;
  color: #666;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
