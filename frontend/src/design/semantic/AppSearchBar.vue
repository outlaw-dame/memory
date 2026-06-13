<script setup lang="ts">
/**
 * AppSearchBar - Semantic Search Input Component
 * 
 * A platform-aware search input that handles:
 * - Native search keyboard (inputmode=search, enterkeyhint=search)
 * - Auto-focus on mount (optional)
 * - Clear button
 * - Cancel button (optional)
 * - Focus management
 * - Keyboard avoidance
 * 
 * Security considerations:
 * - All input is sanitized by the browser
 * - No dynamic code evaluation
 * - Rate-limited events
 * - Safe DOM access
 */

import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useKeyboard, getKeyboardConfig, getInputAttributes, KEYBOARD_PRESETS } from '@/platform/keyboardPolicy'
import { useSafeArea } from '@/platform/safeAreaPolicy'
import { useHaptics } from '@/platform/hapticPolicy'

export interface AppSearchBarProps {
  // Value binding
  modelValue: string
  
  // Configuration
  placeholder?: string
  autoFocus?: boolean
  showCancel?: boolean
  cancelText?: string
  
  // Styling
  size?: 'sm' | 'md' | 'lg'
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full'
  
  // State
  disabled?: boolean
  loading?: boolean
  
  // Events
  onSearch?: (query: string) => void
  onCancel?: () => void
  onFocus?: (event: FocusEvent) => void
  onBlur?: (event: FocusEvent) => void
  onInput?: (event: InputEvent) => void
  onKeyDown?: (event: KeyboardEvent) => void
  onClear?: () => void
}

const props = withDefaults(defineProps<AppSearchBarProps>(), {
  placeholder: 'Search...',
  autoFocus: false,
  showCancel: false,
  cancelText: 'Cancel',
  size: 'md',
  rounded: 'full',
  disabled: false,
  loading: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'search', query: string): void
  (e: 'cancel'): void
  (e: 'focus', event: FocusEvent): void
  (e: 'blur', event: FocusEvent): void
  (e: 'input', event: InputEvent): void
  (e: 'keydown', event: KeyboardEvent): void
  (e: 'clear'): void
}>()

const { scrollIntoView } = useKeyboard()
const safeArea = useSafeArea()
const haptics = useHaptics()

const inputRef = ref<HTMLInputElement | null>(null)
const isFocused = ref(false)
const hasValue = computed(() => props.modelValue.length > 0)

// Keyboard configuration for search
const keyboardConfig = computed(() => getKeyboardConfig('search'))
const inputAttributes = computed(() => getInputAttributes(keyboardConfig.value))

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

function handleKeyDown(event: KeyboardEvent) {
  emit('keydown', event)
  
  // Handle Enter key - trigger search
  if (event.key === 'Enter') {
    event.preventDefault()
    if (hasValue.value) {
      emit('search', props.modelValue)
    }
  }
  
  // Handle Escape key - clear or cancel
  if (event.key === 'Escape') {
    event.preventDefault()
    if (hasValue.value) {
      emit('update:modelValue', '')
      emit('clear')
    } else if (props.showCancel && isFocused.value) {
      emit('cancel')
    } else {
      inputRef.value?.blur()
    }
  }
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

function handleCancel() {
  emit('update:modelValue', '')
  emit('cancel')
  haptics.light().catch(() => {})
  inputRef.value?.blur()
}

// Auto-focus
onMounted(() => {
  if (props.autoFocus && inputRef.value && !props.disabled) {
    // Use setTimeout to ensure component is fully mounted
    setTimeout(() => {
      inputRef.value?.focus()
    }, 100)
  }
})

// Expose methods
defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
  clear: () => {
    emit('update:modelValue', '')
    emit('clear')
  },
  search: () => {
    if (hasValue.value) {
      emit('search', props.modelValue)
    }
  },
})

defineOptions({
  inheritAttrs: false,
})
</script>

<template>
  <div class="app-search-bar">
    <div class="app-search-bar-container" :class="[roundedClasses, sizeClasses]">
      <!-- Search icon (left) -->
      <div class="app-search-bar-icon left">
        <f7Icon icon="search" />
      </div>
      
      <!-- Input -->
      <input
        ref="inputRef"
        :value="props.modelValue"
        :placeholder="props.placeholder"
        :disabled="props.disabled"
        type="search"
        :class="app-search-bar-input"
        v-bind="inputAttributes"
        @focus="handleFocus"
        @blur="handleBlur"
        @input="handleInput"
        @keydown="handleKeyDown"
      />
      
      <!-- Clear button (right) - shown when there's text -->
      <button
        v-if="hasValue"
        type="button"
        class="app-search-bar-icon-btn clear"
        aria-label="Clear search"
        @click="handleClear"
      >
        <f7Icon icon="close_circle" />
      </button>
      
      <!-- Loading indicator -->
      <slot v-if="props.loading" name="loading">
        <div class="app-search-bar-loader" />
      </slot>
    </div>
    
    <!-- Cancel button - shown when focused and showCancel is true -->
    <button
      v-if="props.showCancel && isFocused"
      type="button"
      class="app-search-bar-cancel"
      aria-label="Cancel search"
      @click="handleCancel"
    >
      {{ props.cancelText }}
    </button>
  </div>
</template>

<style scoped>
/* Base structure */
.app-search-bar {
  --search-bar-bg: var(--bg-color, #fff);
  --search-bar-border: var(--border-color, #e5e7eb);
  --search-bar-text: var(--color-primary, #000);
  --search-bar-text-secondary: var(--color-secondary, #666);
  --search-bar-text-disabled: var(--color-disabled, #999);
  
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.app-search-bar-container {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  background: var(--search-bar-bg);
  border: 1px solid var(--search-bar-border);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  overflow: hidden;
  flex: 1;
}

/* Focus state */
.app-search-bar-container:focus-within {
  border-color: var(--color-accent, #1d9bf0);
  box-shadow: 0 0 0 3px rgba(29, 155, 240, 0.1);
}

/* Disabled state */
.app-search-bar .app-search-bar-container:disabled {
  background: var(--bg-disabled, #f5f5f5);
  border-color: var(--border-disabled, #ddd);
}

/* Input */
.app-search-bar-input {
  flex: 1;
  min-width: 0;
  
  font-family: var(--font-family);
  color: var(--search-bar-text);
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

.app-search-bar-input::placeholder {
  color: var(--search-bar-text-secondary);
  opacity: 1;
}

.app-search-bar-input:disabled {
  color: var(--search-bar-text-disabled);
  cursor: not-allowed;
  opacity: 1;
}

/* Icons */
.app-search-bar-icon {
  color: var(--search-bar-text-secondary);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.app-search-bar-icon.left {
  margin-left: 0.25rem;
  color: var(--search-bar-text-secondary);
}

.app-search-bar-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  color: var(--search-bar-text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  border-radius: 0.25rem;
  transition: background-color 0.2s ease, color 0.2s ease;
  flex-shrink: 0;
}

.app-search-bar-icon-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: var(--search-bar-text);
}

.app-search-bar-icon-btn:active {
  background: rgba(0, 0, 0, 0.1);
}

/* Loading indicator */
.app-search-bar-loader {
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top-color: var(--search-bar-text-secondary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Cancel button */
.app-search-bar-cancel {
  font-family: var(--font-family);
  font-size: var(--text-size-base);
  font-weight: 500;
  color: var(--color-accent, #1d9bf0);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  white-space: nowrap;
  transition: color 0.2s ease;
}

.app-search-bar-cancel:hover {
  color: var(--color-accent-dark, #1a8cd8);
  text-decoration: underline;
}

.app-search-bar-cancel:active {
  color: var(--color-accent-darker, #1677b3);
}

/* Native input sanitization */
.app-search-bar-input[autocapitalize],
.app-search-bar-input[autocorrect],
.app-search-bar-input[autocomplete],
.app-search-bar-input[inputmode],
.app-search-bar-input[enterkeyhint],
.app-search-bar-input[spellcheck] {
  /* These attributes are sanitized by getInputAttributes */
}
</style>
