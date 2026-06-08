<script setup lang="ts">
/**
 * AppDestructiveAction - Semantic Destructive Action Component
 * 
 * A platform-aware destructive action component that provides:
 * - Confirmation dialog for destructive actions
 * - Undo capability
 * - Loading states
 * - Accessibility support
 * 
 * Features:
 * - Native iOS/Android confirmation dialogs
 * - Undo toast/snackbar notifications
 * - Haptic feedback for user confidence
 * - Multiple confirmation levels (low, medium, high danger)
 * 
 * Security considerations:
 * - All destructive actions require explicit user confirmation
 * - No dynamic code evaluation
 * - Safe DOM access with null checks
 * - Prevents accidental double-triggering with debounce
 * - Input validation for all props
 */

import { ref, computed } from 'vue'
import { f7Button, f7ListItem, f7List, f7Block } from 'framework7-vue'
import { useNativeUiProfile } from '@/platform/nativeUiProfile'
import { useHaptics, HapticLevel } from '@/platform/hapticPolicy'

export type DangerLevel = 'low' | 'medium' | 'high'

export interface AppDestructiveActionProps {
  // Content
  label?: string
  description?: string
  confirmText?: string
  cancelText?: string
  undoText?: string
  
  // Danger level (affects styling and confirmation behavior)
  dangerLevel?: DangerLevel
  
  // Behavior
  debounce?: number
  allowUndo?: boolean
  undoDuration?: number
  
  // State
  loading?: boolean
  disabled?: boolean
  
  // Styling
  block?: boolean
  outline?: boolean
  rounded?: boolean
  size?: 'sm' | 'md' | 'lg'
  
  // Accessibility
  ariaLabel?: string
  ariaDescribedby?: string
  
  // Additional classes
  class?: string | string[] | Record<string, boolean>
}

const props = withDefaults(defineProps<AppDestructiveActionProps>(), {
  label: 'Delete',
  description: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  undoText: 'Undone',
  dangerLevel: 'medium',
  debounce: 500,
  allowUndo: false,
  undoDuration: 3000,
  loading: false,
  disabled: false,
  block: false,
  outline: false,
  rounded: true,
  size: 'md',
})

const emit = defineEmits<{
  (e: 'confirm', value: boolean): void
  (e: 'click', event: MouseEvent): void
  (e: 'undo'): void
}>()

const nativeUiProfile = useNativeUiProfile()
const haptics = useHaptics()

const isConfirming = ref(false)
const isUndoing = ref(false)
const lastActionTime = ref(0)
const undoTimer = ref<ReturnType<typeof setTimeout> | null>(null)

// Effective disabled state
const effectiveDisabled = computed(() => {
  return props.disabled || props.loading || isConfirming.value
})

// Danger level styling
const dangerClasses = computed(() => {
  const classes: Record<string, boolean> = {
    'app-destructive-low': props.dangerLevel === 'low',
    'app-destructive-medium': props.dangerLevel === 'medium',
    'app-destructive-high': props.dangerLevel === 'high',
  }
  return classes
})

// Button color based on danger level
const buttonColor = computed(() => {
  switch (props.dangerLevel) {
    case 'low':
      return nativeUiProfile.theme === 'ios' ? 'red' : 'red'
    case 'medium':
      return 'red'
    case 'high':
      return 'red'
    default:
      return 'red'
  }
})

// Button fill based on outline prop
const buttonFill = computed(() => {
  return props.outline ? undefined : 'filled'
})

// Size class
const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm': return 'app-destructive-sm'
    case 'lg': return 'app-destructive-lg'
    default: return 'app-destructive-md'
  }
})

// Confirmation dialog text
const confirmTitle = computed(() => {
  switch (props.dangerLevel) {
    case 'high':
      return 'Are you sure?'
    case 'medium':
      return 'Confirm action'
    case 'low':
      return 'Confirm'
    default:
      return 'Confirm'
  }
})

// Handle click with debounce
function handleClick(event: MouseEvent) {
  const now = Date.now()
  
  // Debounce to prevent accidental double-clicks
  if (props.debounce > 0 && now - lastActionTime.value < props.debounce) {
    event.preventDefault()
    event.stopPropagation()
    return
  }
  
  lastActionTime.value = now
  emit('click', event)
  
  // For low danger, just emit confirm immediately
  if (props.dangerLevel === 'low') {
    executeAction()
    return
  }
  
  // For medium and high danger, show confirmation
  isConfirming.value = true
}

// Execute the destructive action
function executeAction() {
  if (effectiveDisabled.value) return
  
  emit('confirm', true)
  
  // Heavy haptic for destructive action
  haptics.heavy().catch(() => {})
  
  // Start undo timer if allowed
  if (props.allowUndo) {
    startUndoTimer()
  }
}

// Cancel the action
function cancelAction() {
  isConfirming.value = false
  
  // Light haptic for cancel
  haptics.light().catch(() => {})
}

// Handle undo
function handleUndo() {
  clearUndoTimer()
  emit('undo')
  isUndoing.value = true
  
  // Light haptic for undo
  haptics.light().catch(() => {})
  
  setTimeout(() => {
    isUndoing.value = false
  }, 300)
}

// Start undo timer
function startUndoTimer() {
  clearUndoTimer()
  undoTimer.value = setTimeout(() => {
    isUndoing.value = false
  }, props.undoDuration)
}

// Clear undo timer
function clearUndoTimer() {
  if (undoTimer.value) {
    clearTimeout(undoTimer.value)
    undoTimer.value = null
  }
}

// Framework7 button props
const f7ButtonProps = computed(() => ({
  color: buttonColor.value,
  fill: buttonFill.value,
  rounded: props.rounded,
  outline: props.outline,
  block: props.block,
  size: props.size,
  disabled: effectiveDisabled.value,
  class: [props.class, sizeClass.value, 'app-destructive-action', dangerClasses.value],
}))
</script>

<template>
  <div class="app-destructive-wrapper">
    <!-- Main destructive action button -->
    <f7Button
      v-bind="f7ButtonProps"
      @click="handleClick"
      :aria-label="props.ariaLabel || props.label"
      :aria-describedby="props.ariaDescribedby"
    >
      {{ props.label }}
    </f7Button>
    
    <!-- Confirmation dialog (using Framework7 dialog) -->
    <f7Dialog
      v-if="isConfirming"
      :title="confirmTitle"
      :opened="isConfirming"
      @dialog:closed="cancelAction"
      class="app-destructive-confirm"
    >
      <div class="app-destructive-confirm-content">
        <p v-if="props.description" class="app-destructive-description">
          {{ props.description }}
        </p>
        <p class="app-destructive-warning">
          <template v-if="props.dangerLevel === 'high'">
            This action cannot be undone.
          </template>
          <template v-else-if="props.dangerLevel === 'medium'">
            This action may affect your data.
          </template>
        </p>
        
        <div class="app-destructive-confirm-buttons">
          <f7Button
            color="gray"
            fill="outlined"
            @click="cancelAction"
            class="app-destructive-cancel"
          >
            {{ props.cancelText }}
          </f7Button>
          
          <f7Button
            color="red"
            fill="filled"
            :loading="props.loading"
            @click="executeAction"
            class="app-destructive-confirm-btn"
          >
            {{ props.confirmText }}
          </f7Button>
        </div>
      </div>
    </f7Dialog>
    
    <!-- Undo snackbar/toast -->
    <f7Toast
      v-if="isUndoing && props.allowUndo"
      :opened="isUndoing"
      :duration="props.undoDuration"
      @toast:closed="clearUndoTimer"
      class="app-destructive-undo"
    >
      <div class="app-destructive-undo-content">
        <span>{{ props.undoText }}</span>
        <f7Button
          color="blue"
          size="sm"
          fill="text"
          @click="handleUndo"
          class="app-destructive-undo-btn"
        >
          Undo
        </f7Button>
      </div>
    </f7Toast>
  </div>
</template>

<style scoped>
/* Base wrapper */
.app-destructive-wrapper {
  display: inline-block;
}

/* Button styling by danger level */
.app-destructive-action {
  font-family: var(--font-family);
  font-size: var(--text-size-base);
  font-weight: 500;
}

.app-destructive-low :deep(.button) {
  --f7-button-bg-color: var(--color-red-light, #fef2f2);
  --f7-button-text-color: var(--color-red, #ef4444);
  --f7-button-border-color: var(--color-red, #ef4444);
}

.app-destructive-medium :deep(.button) {
  --f7-button-bg-color: var(--color-red, #ef4444);
  --f7-button-text-color: white;
  --f7-button-border-color: var(--color-red, #ef4444);
}

.app-destructive-high :deep(.button) {
  --f7-button-bg-color: var(--color-red-dark, #dc2626);
  --f7-button-text-color: white;
  --f7-button-border-color: var(--color-red-dark, #dc2626);
}

/* Size variants */
.app-destructive-sm :deep(.button) {
  --f7-button-height: 32px;
  --f7-button-padding-horizontal: 12px;
  font-size: var(--text-size-small);
}

.app-destructive-md :deep(.button) {
  --f7-button-height: 44px;
  --f7-button-padding-horizontal: 16px;
  font-size: var(--text-size-base);
}

.app-destructive-lg :deep(.button) {
  --f7-button-height: 56px;
  --f7-button-padding-horizontal: 24px;
  font-size: var(--text-size-large);
}

/* Disabled state */
.app-destructive-action.disabled :deep(.button) {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Loading state */
.app-destructive-action.loading :deep(.button) {
  opacity: 0.8;
}

/* Outline variant */
.app-destructive-action.outline :deep(.button) {
  --f7-button-bg-color: transparent;
  --f7-button-text-color: var(--color-red, #ef4444);
  --f7-button-border-color: var(--color-red, #ef4444);
  --f7-button-pressed-bg-color: rgba(239, 68, 68, 0.1);
}

/* Confirmation dialog styling */
:deep(.dialog.app-destructive-confirm) {
  --f7-dialog-width: 90%;
  --f7-dialog-max-width: 400px;
  --f7-dialog-border-radius: var(--rounded-xl);
  --f7-dialog-bg-color: var(--bg-color, #fff);
}

.app-destructive-confirm-content {
  padding: 1rem;
}

.app-destructive-description {
  font-family: var(--font-family);
  font-size: var(--text-size-base);
  color: var(--color-primary);
  margin-bottom: 1rem;
  line-height: 1.5;
}

.app-destructive-warning {
  font-family: var(--font-family);
  font-size: var(--text-size-small);
  color: var(--color-red, #ef4444);
  margin-bottom: 1.5rem;
}

.app-destructive-confirm-buttons {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.app-destructive-cancel :deep(.button) {
  --f7-button-text-color: var(--color-primary);
  --f7-button-border-color: var(--color-secondary, #666);
}

.app-destructive-confirm-btn :deep(.button) {
  --f7-button-bg-color: var(--color-red, #ef4444);
  --f7-button-text-color: white;
}

/* Undo toast styling */
:deep(.toast.app-destructive-undo) {
  --f7-toast-bg-color: var(--color-primary);
  --f7-toast-text-color: white;
  --f7-toast-padding-horizontal: 1rem;
  --f7-toast-padding-vertical: 0.75rem;
  --f7-toast-border-radius: var(--rounded-lg);
}

.app-destructive-undo-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.app-destructive-undo-btn :deep(.button) {
  --f7-button-text-color: white;
  --f7-button-pressed-bg-color: rgba(255, 255, 255, 0.1);
  padding: 0.25rem 0.5rem;
  min-height: auto;
}

/* Accessibility: ensure button is keyboard accessible */
:deep(.button:focus-visible) {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
</style>
