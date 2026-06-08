<script setup lang="ts">
/**
 * AppSwitch - Semantic Toggle/Switch Component
 * 
 * A platform-aware switch/toggle component that wraps Framework7's toggle
 * with Memory's design system and proper accessibility.
 * 
 * Features:
 * - iOS-style switches on iOS
 * - Material-style switches on Android
 * - Native toggle semantics
 * - Accessibility labels and descriptions
 * - Safe change handling
 * - Loading/disabled states
 * 
 * Security considerations:
 * - All inputs are type-safe
 * - No dynamic code evaluation
 * - Safe DOM access with null checks
 * - Prevents rapid toggling with debounce option
 */

import { ref, computed, watch } from 'vue'
import { f7Toggle } from 'framework7-vue'
import { useNativeUiProfile } from '@/platform/nativeUiProfile'
import { useHaptics } from '@/platform/hapticPolicy'

export interface AppSwitchProps {
  // Value binding
  modelValue: boolean
  
  // Labels
  label?: string
  labelLeft?: string
  labelRight?: string
  helperText?: string
  errorText?: string
  
  // State
  disabled?: boolean
  readonly?: boolean
  loading?: boolean
  error?: boolean
  
  // Styling
  size?: 'sm' | 'md' | 'lg'
  
  // Behavior
  debounce?: number
  
  // Accessibility
  ariaLabel?: string
  ariaDescribedby?: string
  
  // Additional classes
  class?: string | string[] | Record<string, boolean>
}

const props = withDefaults(defineProps<AppSwitchProps>(), {
  modelValue: false,
  disabled: false,
  readonly: false,
  loading: false,
  error: false,
  size: 'md',
  debounce: 0,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'change', value: boolean): void
  (e: 'focus', event: FocusEvent): void
  (e: 'blur', event: FocusEvent): void
}>()

const nativeUiProfile = useNativeUiProfile()
const haptics = useHaptics()

const internalValue = ref(props.modelValue)
const isChanging = ref(false)
const lastChangeTime = ref(0)

// Computed properties
const effectiveDisabled = computed(() => props.disabled || props.loading || props.readonly)
const effectiveAriaLabel = computed(() => props.ariaLabel || props.label || 'Toggle switch')

// Handle toggle change with debounce
function handleChange(event: Event) {
  const now = Date.now()
  const target = event.target as HTMLInputElement
  const newValue = target.checked
  
  // Prevent rapid toggling if debounce is set
  if (props.debounce > 0 && now - lastChangeTime.value < props.debounce) {
    target.checked = !newValue
    return
  }
  
  lastChangeTime.value = now
  isChanging.value = true
  
  // Haptic feedback on successful toggle
  if (!effectiveDisabled.value) {
    haptics.light().catch(() => {})
  }
  
  // Update internal value and emit events
  internalValue.value = newValue
  emit('update:modelValue', newValue)
  emit('change', newValue)
  
  // Reset changing state
  setTimeout(() => { isChanging.value = false }, 100)
}

// Handle focus/blur events
function handleFocus(event: FocusEvent) {
  emit('focus', event)
}

function handleBlur(event: FocusEvent) {
  emit('blur', event)
}

// Watch for external value changes
watch(() => props.modelValue, (newValue) => {
  if (internalValue.value !== newValue) {
    internalValue.value = newValue
  }
})

// Framework7 toggle color based on platform
const toggleColor = computed(() => {
  // Use platform-appropriate color
  if (nativeUiProfile.theme === 'ios') {
    return undefined // Use default iOS green
  }
  return undefined // Use default Material color
})

// Size classes
const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm': return 'app-switch-sm'
    case 'lg': return 'app-switch-lg'
    default: return 'app-switch-md'
  }
})

// Framework7 toggle props
const f7ToggleProps = computed(() => ({
  checked: internalValue.value,
  disabled: effectiveDisabled.value,
  readonly: props.readonly,
  color: toggleColor.value,
  class: [props.class, sizeClass.value, 'app-switch', {
    'app-switch-error': props.error,
    'app-switch-loading': props.loading,
    'app-switch-disabled': effectiveDisabled.value,
  }],
}))
</script>

<template>
  <div class="app-switch-container" :class="[sizeClass, { 'has-error': props.error, 'disabled': effectiveDisabled }]">
    <!-- Label (left) -->
    <label v-if="props.labelLeft" class="app-switch-label left" :for="$attrs.id">
      {{ props.labelLeft }}
    </label>
    
    <!-- Toggle -->
    <f7Toggle
      v-bind="f7ToggleProps"
      @change="handleChange"
      @focus="handleFocus"
      @blur="handleBlur"
      :aria-label="effectiveAriaLabel"
      :aria-describedby="props.ariaDescribedby"
      role="switch"
    />
    
    <!-- Label (right) -->
    <label v-if="props.labelRight" class="app-switch-label right" :for="$attrs.id">
      {{ props.labelRight }}
    </label>
    
    <!-- Helper text -->
    <div v-if="props.helperText || props.errorText" class="app-switch-helper">
      <span :class="{ 'text-red-500': props.error, 'text-dark-50': !props.error }">
        {{ props.error ? props.errorText : props.helperText }}
      </span>
    </div>
    
    <!-- Loading indicator -->
    <div v-if="props.loading" class="app-switch-loader" />
  </div>
</template>

<style scoped>
/* Base container */
.app-switch-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
}

/* Switch label styling */
.app-switch-label {
  font-family: var(--font-family);
  font-size: var(--text-size-base);
  color: var(--color-primary);
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
}

.app-switch-label.left {
  order: -1;
}

.app-switch-label.right {
  cursor: default;
}

/* Helper text */
.app-switch-helper {
  flex: 1 0 100%;
  font-family: var(--font-family);
  font-size: var(--text-size-caption);
  line-height: 1.25;
  color: var(--color-secondary);
  margin-top: 0.25rem;
}

.app-switch-helper .text-red-500 {
  color: var(--color-red, #ef4444);
}

/* Loading indicator */
.app-switch-loader {
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Framework7 toggle customization */
:deep(.toggle) {
  --f7-toggle-width: 44px;
  --f7-toggle-height: 24px;
  --f7-toggle-border-radius: 12px;
  --f7-toggle-handle-width: 20px;
  --f7-toggle-handle-height: 20px;
  --f7-toggle-handle-border-radius: 50%;
  --f7-toggle-handle-transform: translateX(-2px);
  --f7-toggle-checked-handle-transform: translateX(calc(var(--f7-toggle-width) - var(--f7-toggle-handle-width) - 2px));
  
  /* Transition timing */
  --f7-toggle-transition-duration: 0.2s;
  
  /* Colors - these will be overridden by platform theme */
  --f7-toggle-bg-color: rgba(0, 0, 0, 0.12);
  --f7-toggle-bg-color-checked: var(--color-accent, #1d9bf0);
  --f7-toggle-handle-bg-color: white;
  --f7-toggle-handle-bg-color-checked: white;
  
  /* Disabled state */
  --f7-toggle-opacity-disabled: 0.4;
  
  /* Focus state */
  --f7-toggle-focus-bg-color: transparent;
  --f7-toggle-focus-box-shadow: 0 0 0 3px rgba(29, 155, 240, 0.2);
}

/* Size variants */
.app-switch-container.app-switch-sm :deep(.toggle) {
  --f7-toggle-width: 36px;
  --f7-toggle-height: 20px;
  --f7-toggle-handle-width: 16px;
  --f7-toggle-handle-height: 16px;
}

.app-switch-container.app-switch-lg :deep(.toggle) {
  --f7-toggle-width: 52px;
  --f7-toggle-height: 28px;
  --f7-toggle-handle-width: 24px;
  --f7-toggle-handle-height: 24px;
}

/* Error state */
.app-switch-container.has-error :deep(.toggle) {
  --f7-toggle-bg-color-checked: var(--color-red, #ef4444);
}

/* Disabled state */
.app-switch-container.disabled :deep(.toggle) {
  opacity: var(--f7-toggle-opacity-disabled);
  cursor: not-allowed;
}

/* Loading state - add opacity to indicate loading */
.app-switch-container.app-switch-loading :deep(.toggle) {
  opacity: 0.6;
  pointer-events: none;
}

/* Platform-specific styling */
.app-switch-container :deep(.toggle.ios) {
  --f7-toggle-border-radius: 14px;
  --f7-toggle-handle-border-radius: 12px;
}

.app-switch-container :deep(.toggle.md) {
  --f7-toggle-border-radius: 12px;
  --f7-toggle-handle-border-radius: 50%;
}

/* Accessibility: ensure switch is keyboard accessible */
:deep(.toggle:focus-visible) {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
</style>
