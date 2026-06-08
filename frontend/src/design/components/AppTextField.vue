<script setup lang="ts">
/**
 * AppTextField - Semantic Text Input Component
 * 
 * A platform-aware text input that handles:
 * - Native keyboard behavior (inputmode, enterkeyhint, autocapitalize, autocomplete, spellcheck)
 * - Safe area insets
 * - Keyboard avoidance
 * - Focus management
 * - Error states
 * - Loading states
 * 
 * Security considerations:
 * - All input is sanitized by the browser
 * - No dynamic code evaluation
 * - Safe ref handling
 */

import { ref, computed, onMounted, onUnmounted, type Ref } from 'vue'
import { f7Icon } from 'framework7-vue'
import { useKeyboard, getKeyboardConfig, getInputAttributes, KEYBOARD_PRESETS } from '@/platform/keyboardPolicy'
import { useSafeArea } from '@/platform/safeAreaPolicy'
import { useHaptics } from '@/platform/hapticPolicy'
import { useNativeUiProfile } from '@/platform/nativeUiProfile'

export interface AppTextFieldProps {
  // Value binding
  modelValue: string
  
  // Input configuration
  type?: 'text' | 'password' | 'email' | 'url' | 'tel' | 'search' | 'number'
  placeholder?: string
  purpose?: keyof typeof KEYBOARD_PRESETS
  
  // Styling
  size?: 'sm' | 'md' | 'lg'
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full'
  
  // State
  disabled?: boolean
  readonly?: boolean
  loading?: boolean
  error?: boolean
  
  // Labels
  label?: string
  helperText?: string
  errorMessage?: string
  
  // Icons
  leftIcon?: string
  rightIcon?: string
  showClear?: boolean
  
  // Input attributes
  id?: string
  name?: string
  required?: boolean
  maxlength?: number
  minlength?: number
  pattern?: string
  
  // Events
  onFocus?: (event: FocusEvent) => void
  onBlur?: (event: FocusEvent) => void
  onInput?: (event: InputEvent) => void
  onChange?: (event: Event) => void
  onKeyDown?: (event: KeyboardEvent) => void
  onKeyUp?: (event: KeyboardEvent) => void
  onClear?: () => void
}

const props = withDefaults(defineProps<AppTextFieldProps>(), {
  type: 'text',
  purpose: 'text',
  size: 'md',
  rounded: 'lg',
  disabled: false,
  readonly: false,
  loading: false,
  error: false,
  showClear: false,
  required: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'focus', event: FocusEvent): void
  (e: 'blur', event: FocusEvent): void
  (e: 'input', event: InputEvent): void
  (e: 'change', event: Event): void
  (e: 'keydown', event: KeyboardEvent): void
  (e: 'keyup', event: KeyboardEvent): void
  (e: 'clear'): void
}>()

const { scrollIntoView } = useKeyboard()
const safeArea = useSafeArea()
const haptics = useHaptics()
const nativeUiProfile = useNativeUiProfile()

const inputRef = ref<HTMLInputElement | null>(null)
const isFocused = ref(false)
const showPassword = ref(false)

// Computed properties
const keyboardConfig = computed(() => getKeyboardConfig(props.purpose))
const inputAttributes = computed(() => getInputAttributes(keyboardConfig.value))

const inputType = computed(() => {
  if (showPassword.value) return 'text'
  return props.type
})

const hasValue = computed(() => props.modelValue.length > 0)
const shouldShowClear = computed(() => props.showClear && hasValue.value && !props.disabled && !props.readonly && isFocused.value)

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm': return 'text-sm px-3 py-2'
    case 'lg': return 'text-lg px-4 py-3'
    default: return 'text-base px-3 py-2.5'
  }
})

const roundedClasses = computed(() => {
  switch (props.rounded) {
    case 'none': return 'rounded-none'
    case 'sm': return 'rounded-sm'
    case 'md': return 'rounded-lg'
    case 'full': return 'rounded-full'
    default: return 'rounded-xl'
  }
})

const isPasswordType = computed(() => props.type === 'password')

// Handle focus
function handleFocus(event: FocusEvent) {
  isFocused.value = true
  emit('focus', event)
  
  // Scroll into view if keyboard would cover
  if (inputRef.value) {
    scrollIntoView(inputRef.value)
  }
}

function handleBlur(event: FocusEvent) {
  isFocused.value = false
  emit('blur', event)
}

function handleInput(event: InputEvent) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
  emit('input', event)
}

function handleChange(event: Event) {
  emit('change', event)
}

function handleKeyDown(event: KeyboardEvent) {
  emit('keydown', event)
  
  // Handle Enter key based on enterkeyhint
  if (event.key === 'Enter') {
    const enterKeyHint = keyboardConfig.value.enterKeyHint || 'done'
    if (enterKeyHint === 'done' || enterKeyHint === 'search') {
      // Optionally blur on done/search
      // This is handled by the parent component typically
    }
  }
}

function handleKeyUp(event: KeyboardEvent) {
  emit('keyup', event)
}

function handleClear(event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
  emit('update:modelValue', '')
  emit('clear')
  haptics.light().catch(() => {})
  
  // Keep focus on the input
  inputRef.value?.focus()
}

function togglePasswordVisibility() {
  showPassword.value = !showPassword.value
  haptics.light().catch(() => {})
}

// Auto-focus support
defineExpose({ focus: () => inputRef.value?.focus() })

defineOptions({
  inheritAttrs: false,
})
</script>

<template>
  <div class="app-text-field" :class="[props.size, props.rounded, { 'has-error': props.error, 'disabled': props.disabled }]">
    <!-- Label -->
    <label v-if="props.label" class="app-text-field-label" :for="props.id">
      {{ props.label }}
      <span v-if="props.required" class="text-red-500" aria-hidden="true">*</span>
    </label>
    
    <!-- Input container -->
    <div class="app-text-field-container" :class="[roundedClasses, sizeClasses]">
      <!-- Left icon -->
      <slot name="left">
        <f7Icon v-if="props.leftIcon" :icon="props.leftIcon" class="app-text-field-icon left" />
      </slot>
      
      <!-- Input -->
      <input
        ref="inputRef"
        :id="props.id"
        :name="props.name"
        :type="inputType"
        :value="props.modelValue"
        :placeholder="props.placeholder"
        :disabled="props.disabled"
        :readonly="props.readonly"
        :required="props.required"
        :maxlength="props.maxlength"
        :minlength="props.minlength"
        :pattern="props.pattern"
        :class="app-text-field-input"
        v-bind="inputAttributes"
        @focus="handleFocus"
        @blur="handleBlur"
        @input="handleInput"
        @change="handleChange"
        @keydown="handleKeyDown"
        @keyup="handleKeyUp"
      />
      
      <!-- Right icons -->
      <div class="app-text-field-icons right">
        <!-- Password toggle -->
        <button
          v-if="isPasswordType"
          type="button"
          class="app-text-field-icon-btn"
          :aria-label="showPassword ? 'Hide password' : 'Show password'"
          @click="togglePasswordVisibility"
        >
          <f7Icon :icon="showPassword ? 'eye_outline' : 'eye_off_outline'" />
        </button>
        
        <!-- Clear button -->
        <button
          v-if="shouldShowClear"
          type="button"
          class="app-text-field-icon-btn"
          aria-label="Clear"
          @click="handleClear"
        >
          <f7Icon icon="close_circle" />
        </button>
        
        <!-- Loading indicator -->
        <slot v-if="props.loading" name="loading">
          <div class="app-text-field-loader" />
        </slot>
        
        <!-- Right icon slot -->
        <slot name="right">
          <f7Icon v-if="props.rightIcon" :icon="props.rightIcon" class="app-text-field-icon right" />
        </slot>
      </div>
    </div>
    
    <!-- Helper text or error message -->
    <div class="app-text-field-helper" :class="{ 'text-red-500': props.error, 'text-dark-50': !props.error }">
      <slot name="helper">
        {{ props.error ? props.errorMessage : props.helperText }}
      </slot>
    </div>
    
    <!-- Character counter -->
    <div v-if="props.maxlength" class="app-text-field-counter">
      {{ modelValue.length }} / {{ props.maxlength }}
    </div>
  </div>
</template>

<style scoped>
/* Base structure */
.app-text-field {
  --text-field-bg: var(--bg-color, #fff);
  --text-field-border: var(--border-color, #e5e7eb);
  --text-field-border-error: var(--color-red, #ef4444);
  --text-field-text: var(--color-primary, #000);
  --text-field-text-secondary: var(--color-secondary, #666);
  --text-field-text-disabled: var(--color-disabled, #999);
  
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.app-text-field-label {
  font-family: var(--font-family);
  font-size: var(--text-size-small);
  font-weight: 500;
  color: var(--text-field-text);
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.app-text-field-container {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  background: var(--text-field-bg);
  border: 1px solid var(--text-field-border);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  overflow: hidden;
}

/* Focus state */
.app-text-field-container:focus-within {
  border-color: var(--color-accent, #1d9bf0);
  box-shadow: 0 0 0 3px rgba(29, 155, 240, 0.1);
}

/* Error state */
.app-text-field.has-error .app-text-field-container {
  border-color: var(--text-field-border-error);
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

/* Disabled state */
.app-text-field.disabled .app-text-field-container {
  background: var(--bg-disabled, #f5f5f5);
  border-color: var(--border-disabled, #ddd);
}

/* Input */
.app-text-field-input {
  flex: 1;
  min-width: 0;
  
  font-family: var(--font-family);
  color: var(--text-field-text);
  background: transparent;
  border: none;
  outline: none;
  
  /* Prevent iOS text zoom */
  font-size: inherit;
  line-height: inherit;
  
  /* Prevent autocorrect and autocomplete from adding background */
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
}

.app-text-field-input::placeholder {
  color: var(--text-field-text-secondary);
  opacity: 1;
}

.app-text-field-input:disabled {
  color: var(--text-field-text-disabled);
  cursor: not-allowed;
  opacity: 1;
}

.app-text-field-input:readonly {
  cursor: default;
}

/* Icons */
.app-text-field-icon {
  color: var(--text-field-text-secondary);
  flex-shrink: 0;
}

.app-text-field-icon.left {
  margin-left: 0.25rem;
}

.app-text-field-icon.right {
  margin-right: 0.25rem;
}

.app-text-field-icons.right {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: auto;
}

.app-text-field-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  color: var(--text-field-text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  border-radius: 0.25rem;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.app-text-field-icon-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: var(--text-field-text);
}

.app-text-field-icon-btn:active {
  background: rgba(0, 0, 0, 0.1);
}

/* Loading indicator */
.app-text-field-loader {
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top-color: var(--text-field-text-secondary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Helper text */
.app-text-field-helper {
  font-family: var(--font-family);
  font-size: var(--text-size-caption);
  line-height: 1.25;
}

/* Character counter */
.app-text-field-counter {
  font-family: var(--font-family);
  font-size: var(--text-size-caption);
  color: var(--text-field-text-secondary);
  text-align: right;
}

/* Native input sanitization */
.app-text-field-input[autocapitalize],
.app-text-field-input[autocorrect],
.app-text-field-input[autocomplete],
.app-text-field-input[inputmode],
.app-text-field-input[enterkeyhint],
.app-text-field-input[spellcheck] {
  /* These attributes are sanitized by getInputAttributes */
}
</style>
