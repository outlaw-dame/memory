<script setup lang="ts">
/**
 * MessageActionSheet - Action sheet for message actions
 * 
 * Displays a bottom sheet with available actions for a message.
 * Supports both mobile and desktop usage patterns.
 * 
 * Security considerations:
 * - User-triggered actions only
 * - No automatic action execution
 * - Confirmation required for destructive actions
 */

import { ref, watch } from 'vue'
import type { MessageAction } from './types'

export interface MessageActionSheetProps {
  /** Message ID this action sheet is for */
  messageId: string
  /** List of available actions */
  actions: MessageAction[]
  /** Title to display at the top */
  title?: string
  /** Whether the sheet is visible */
  modelValue?: boolean
}

const props = withDefaults(defineProps<MessageActionSheetProps>(), {
  title: 'Message Actions',
  modelValue: true,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'close'): void
  (e: 'action', actionId: string): void
}>()

/**
 * Internal visibility state
 */
const isVisible = ref(props.modelValue)

/**
 * Track if we're in a confirmation state
 */
const pendingConfirmation = ref<string | null>(null)

/**
 * Get the action being confirmed
 */
const confirmationAction = computed(() => {
  if (!pendingConfirmation.value) return null
  return props.actions.find(a => a.id === pendingConfirmation.value) ?? null
})

/**
 * Filter actions by category
 */
const primaryActions = computed(() => {
  return props.actions.filter(a => !a.destructive && !a.disabled)
})

const destructiveActions = computed(() => {
  return props.actions.filter(a => a.destructive)
})

const disabledActions = computed(() => {
  return props.actions.filter(a => a.disabled)
})

/**
 * Whether there are actions to display
 */
const hasActions = computed(() => {
  return props.actions.length > 0
})

/**
 * Whether confirmation dialog is open
 */
const showConfirmation = computed(() => {
  return pendingConfirmation.value !== null
})

/**
 * Show the action sheet
 */
function show(): void {
  isVisible.value = true
  emit('update:modelValue', true)
}

/**
 * Hide the action sheet
 */
function hide(): void {
  isVisible.value = false
  pendingConfirmation.value = null
  emit('update:modelValue', false)
  emit('close')
}

/**
 * Toggle visibility
 */
function toggle(): void {
  isVisible.value = !isVisible.value
  emit('update:modelValue', isVisible.value)
  if (!isVisible.value) {
    emit('close')
  }
}

/**
 * Execute an action
 */
function executeAction(actionId: string): void {
  const action = props.actions.find(a => a.id === actionId)
  if (!action) return
  
  // Check if action requires confirmation
  if (action.requiresConfirmation) {
    pendingConfirmation.value = actionId
    return
  }
  
  // Execute immediately
  emit('action', actionId)
  hide()
}

/**
 * Confirm the pending action
 */
function confirmAction(): void {
  if (!pendingConfirmation.value) return
  
  emit('action', pendingConfirmation.value)
  pendingConfirmation.value = null
  hide()
}

/**
 * Cancel confirmation
 */
function cancelConfirmation(): void {
  pendingConfirmation.value = null
}

/**
 * Handle backdrop click
 */
function handleBackdropClick(event: MouseEvent): void {
  if (showConfirmation.value) {
    // Don't close on backdrop click during confirmation
    return
  }
  
  const target = event.target as HTMLElement
  if (target.classList.contains('message-action-sheet-overlay') || 
      target.classList.contains('message-action-sheet')) {
    hide()
  }
}

/**
 * Handle escape key
 */
function handleKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    if (showConfirmation.value) {
      cancelConfirmation()
    } else {
      hide()
    }
  }
}

// Watch for external visibility changes
watch(() => props.modelValue, (newValue) => {
  isVisible.value = newValue
})

// Sync internal state with prop
watch(isVisible, (newValue) => {
  if (newValue !== props.modelValue) {
    emit('update:modelValue', newValue)
  }
})

expose({
  show,
  hide,
  toggle,
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isVisible"
      class="message-action-sheet-overlay"
      role="dialog"
      :aria-modal="true"
      aria-label="Message actions"
      @click="handleBackdropClick"
      @keydown="handleKeyDown"
    >
      <div
        class="message-action-sheet"
        :class="{ 'message-action-sheet-confirmation': showConfirmation }"
        @click.stop
      >
        <!-- Header -->
        <header class="message-action-sheet-header" v-if="!showConfirmation">
          <h3 class="message-action-sheet-title">{{ title }}</h3>
          <button
            type="button"
            class="message-action-sheet-close"
            aria-label="Close"
            @click="hide"
          >
            <svg viewBox="0 0 24 24" class="message-action-sheet-close-icon" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <!-- Confirmation Dialog -->
        <div v-if="showConfirmation && confirmationAction" class="message-action-sheet-confirmation-content">
          <svg viewBox="0 0 24 24" class="message-action-sheet-confirmation-icon" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h3 class="message-action-sheet-confirmation-title">Confirm Action</h3>
          <p class="message-action-sheet-confirmation-message">
            Are you sure you want to {{ confirmationAction.label.toLowerCase() }} this message?
          </p>
          <div class="message-action-sheet-confirmation-actions">
            <button
              type="button"
              class="message-action-sheet-button message-action-sheet-button-secondary"
              aria-label="Cancel"
              @click="cancelConfirmation"
            >
              Cancel
            </button>
            <button
              type="button"
              class="message-action-sheet-button message-action-sheet-button-destructive"
              :aria-label="confirmationAction.label"
              @click="confirmAction"
            >
              {{ confirmationAction.label }}
            </button>
          </div>
        </div>

        <!-- Action List (when not in confirmation) -->
        <template v-else>
          <!-- Primary Actions -->
          <div v-if="primaryActions.length > 0" class="message-action-sheet-section">
            <button
              v-for="action in primaryActions"
              :key="action.id"
              type="button"
              class="message-action-sheet-action"
              :aria-label="action.label"
              @click="executeAction(action.id)"
            >
              <slot name="action" :action="action">
                <span class="message-action-sheet-action-icon" v-if="!action.destructive">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" v-if="action.type === 'copy'">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" v-else-if="action.type === 'reply'">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" v-else-if="action.type === 'forward'">
                    <path d="M18 15L12 9 6 15" />
                  </svg>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" v-else>
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                </span>
                <span class="message-action-sheet-action-label">{{ action.label }}</span>
              </slot>
            </button>
          </div>

          <!-- Destructive Actions -->
          <div v-if="destructiveActions.length > 0" class="message-action-sheet-section">
            <button
              v-for="action in destructiveActions"
              :key="action.id"
              type="button"
              class="message-action-sheet-action message-action-sheet-action-destructive"
              :aria-label="action.label"
              @click="executeAction(action.id)"
            >
              <slot name="action" :action="action">
                <span class="message-action-sheet-action-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </span>
                <span class="message-action-sheet-action-label">{{ action.label }}</span>
              </slot>
            </button>
          </div>

          <!-- Disabled Actions (for completeness, hidden by default) -->
          <div v-if="disabledActions.length > 0 && false" class="message-action-sheet-section">
            <button
              v-for="action in disabledActions"
              :key="action.id"
              type="button"
              class="message-action-sheet-action message-action-sheet-action-disabled"
              disabled
            >
              <span class="message-action-sheet-action-label">{{ action.label }}</span>
            </button>
          </div>

          <!-- Empty state -->
          <div v-if="!hasActions" class="message-action-sheet-empty">
            <p>No actions available</p>
          </div>
        </template>

        <!-- Cancel button -->
        <div v-if="!showConfirmation" class="message-action-sheet-footer">
          <button
            type="button"
            class="message-action-sheet-button message-action-sheet-button-secondary"
            @click="hide"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.message-action-sheet-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  padding: 1rem;
}

.message-action-sheet {
  width: 100%;
  max-width: 400px;
  max-height: 80vh;
  background: white;
  border-radius: 28px 28px 0 0;
  box-shadow: 0 -24px 60px rgba(35, 31, 32, 0.16);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideUp 0.3s ease-out;
}

.message-action-sheet-confirmation {
  max-height: 300px;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.message-action-sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.message-action-sheet-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #000;
}

.message-action-sheet-close {
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
}

.message-action-sheet-close:hover {
  background: rgba(0, 0, 0, 0.05);
}

.message-action-sheet-close-icon {
  width: 18px;
  height: 18px;
  color: #666;
}

.message-action-sheet-confirmation-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  gap: 1rem;
}

.message-action-sheet-confirmation-icon {
  width: 64px;
  height: 64px;
  color: #ef4444;
  opacity: 0.8;
}

.message-action-sheet-confirmation-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #000;
}

.message-action-sheet-confirmation-message {
  margin: 0;
  font-size: 16px;
  color: #666;
  line-height: 1.5;
}

.message-action-sheet-confirmation-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
}

.message-action-sheet-section {
  display: flex;
  flex-direction: column;
  padding: 0.5rem;
}

.message-action-sheet-action {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background-color 0.2s ease;
  border-radius: 16px;
}

.message-action-sheet-action:hover {
  background: rgba(0, 0, 0, 0.02);
}

.message-action-sheet-action-destructive {
  color: #ef4444;
}

.message-action-sheet-action-destructive:hover {
  background: rgba(239, 68, 68, 0.05);
}

.message-action-sheet-action-disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.message-action-sheet-action-icon {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.message-action-sheet-action-label {
  font-size: 16px;
  font-weight: 500;
  color: #000;
}

.message-action-sheet-empty {
  padding: 2rem;
  text-align: center;
  color: #888;
}

.message-action-sheet-footer {
  padding: 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  background: white;
}

.message-action-sheet-button {
  padding: 0.75rem 1.5rem;
  border-radius: 16px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
  border: none;
}

.message-action-sheet-button-secondary {
  background: transparent;
  color: #1d9bf0;
  border: 1px solid #1d9bf0;
}

.message-action-sheet-button-secondary:hover {
  background: rgba(29, 155, 240, 0.05);
}

.message-action-sheet-button-destructive {
  background: #ef4444;
  color: white;
}

.message-action-sheet-button-destructive:hover {
  background: #dc2626;
}
</style>
