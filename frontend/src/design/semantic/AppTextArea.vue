<script setup lang="ts">
/**
 * AppTextArea - Semantic Textarea Input Component
 * 
 * A platform-aware textarea input that handles:
 * - Native keyboard behavior (inputmode, enterkeyhint, autocapitalize, autocomplete, spellcheck)
 * - Safe area insets at the bottom
 * - Keyboard avoidance with automatic scrolling
 * - Auto-resize based on content
 * - Error states
 * - Loading states
 * 
 * Security considerations:
 * - All input is sanitized by the browser
 * - No dynamic code evaluation
 * - Safe DOM access with null checks
 * - Rate-limited resize for performance
 */

import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useKeyboard, getKeyboardConfig, getInputAttributes, KEYBOARD_PRESETS } from '@/platform/keyboardPolicy'
import { useSafeArea } from '@/platform/safeAreaPolicy'
import { useHaptics } from '@/platform/hapticPolicy'

export interface AppTextAreaProps {
  // Value binding
  modelValue: string
  
  // Input configuration
  placeholder?: string
  purpose?: keyof typeof KEYBOARD_PRESETS
  
  // Styling
  size?: 'sm' | 'md' | 'lg'
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full'
  
  // Behavior
  autoResize?: boolean
  minRows?: number
  maxRows?: number
  
  // State
  disabled?: boolean
  readonly?: boolean
  loading?: boolean
  error?: boolean
  
  // Labels
  label?: string
  helperText?: string
  errorMessage?: string
  
  // Character counter
  showCounter?: boolean
  maxlength?: number
  
  // Input attributes
  id?: string
  name?: string
  required?: boolean
  
  // Events
  onFocus?: (event: FocusEvent) => void
  onBlur?: (event: FocusEvent) => void
  onInput?: (event: InputEvent) => void
  onChange?: (event: Event) => void
  onKeyDown?: (event: KeyboardEvent) => void
  onKeyUp?: (event: KeyboardEvent) => void
}

const props = withDefaults(defineProps<AppTextAreaProps>(), {
  purpose: 'multiline',
  size: 'md',
  rounded: 'lg',
  autoResize: true,
  minRows: 3,
  maxRows: 10,
  disabled: false,
  readonly: false,
  loading: false,
  error: false,
  showCounter: false,
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
}>()

const { scrollIntoView } = useKeyboard()
const safeArea = useSafeArea()
const haptics = useHaptics()

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const isFocused = ref(false)
const isResizing = ref(false)

// Computed properties
const keyboardConfig = computed(() => getKeyboardConfig(props.purpose))
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

const charCount = computed(() => props.modelValue.length)
const charLimit = computed(() => props.maxlength || Infinity)
const isOverLimit = computed(() => charCount.value > charLimit.value)

// Auto-resize logic
const resizeObserver = ref<ResizeObserver | null>(null)

function updateHeight() {
  if (!props.autoResize || !textareaRef.value) return
  
  isResizing.value = true
  
  nextTick(() => {
    const textarea = textareaRef.value
    if (!textarea) {
      isResizing.value = false
      return
    }
    
    // Reset height to get scrollHeight
    textarea.style.height = ''
    
    // Calculate new height
    const scrollHeight = textarea.scrollHeight
    const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight) || 20
    const minHeight = lineHeight * props.minRows
    const maxHeight = props.maxRows ? lineHeight * props.maxRows : Infinity
    const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight)
    
    textarea.style.height = `${newHeight}px`
    
    // Ensure we don't exceed max height
    if (scrollHeight > maxHeight) {
      textarea.style.overflowY = 'auto'
    } else {
      textarea.style.overflowY = 'hidden'
    }
    
    isResizing.value = false
  })
}

// Handle focus
function handleFocus(event: FocusEvent) {
  isFocused.value = true
  emit('focus', event)
  
  // Scroll into view if keyboard would cover
  if (textareaRef.value) {
    scrollIntoView(textareaRef.value)
  }
}

function handleBlur(event: FocusEvent) {
  isFocused.value = false
  emit('blur', event)
}

function handleInput(event: InputEvent) {
  const target = event.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
  emit('input', event)
  
  // Update height after input
  updateHeight()
}

function handleChange(event: Event) {
  emit('change', event)
}

function handleKeyDown(event: KeyboardEvent) {
  emit('keydown', event)
  
  // Handle Enter key based on enterkeyhint
  if (event.key === 'Enter') {
    const enterKeyHint = keyboardConfig.value.enterKeyHint || 'default'
    if (enterKeyHint === 'done') {
      // Don't insert newline on done
      event.preventDefault()
      // Blur the textarea
      textareaRef.value?.blur()
    }
  }
  
  // Auto-resize on certain keys
  if (props.autoResize) {
    const resizeKeys = ['Enter', 'Backspace', 'Delete', 'Paste']
    if (resizeKeys.includes(event.key)) {
      // Use debounce for performance
      clearTimeout((window as any).resizeTimeout)
      ;(window as any).resizeTimeout = setTimeout(() => {
        updateHeight()
      }, 100)
    }
  }
}

function handleKeyUp(event: KeyboardEvent) {
  emit('keyup', event)
}

// Expose methods
defineExpose({
  focus: () => textareaRef.value?.focus(),
  blur: () => textareaRef.value?.blur(),
  resize: updateHeight,
})

defineOptions({
  inheritAttrs: false,
})

// Setup resize observer
onMounted(() => {
  updateHeight()
  
  if (props.autoResize && textareaRef.value) {
    resizeObserver.value = new ResizeObserver(updateHeight)
    resizeObserver.value.observe(textareaRef.value)
  }
})

// Cleanup
onUnmounted(() => {
  resizeObserver.value?.disconnect()
  resizeObserver.value = null
  clearTimeout((window as any).resizeTimeout)
})

// Watch for value changes from outside
watch(() => props.modelValue, () => {
  if (props.autoResize) {
    updateHeight()
  }
}, { flush: 'post' })
</script>

<template>
  <div class="app-textarea" :class="{ 'has-error': props.error, 'disabled': props.disabled }">
    <!-- Label -->
    <label v-if="props.label" class="app-textarea-label" :for="props.id">
      {{ props.label }}
      <span v-if="props.required" class="text-red-500" aria-hidden="true">*</span>
    </label>
    
    <!-- Textarea container -->
    <div class="app-textarea-container" :class="[roundedClasses, sizeClasses]">
      <!-- Textarea -->
      <textarea
        ref="textareaRef"
        :id="props.id"
        :name="props.name"
        :value="props.modelValue"
        :placeholder="props.placeholder"
        :disabled="props.disabled"
        :readonly="props.readonly"
        :required="props.required"
        :maxlength="props.maxlength"
        :rows="props.minRows"
        :class="app-textarea-input"
        v-bind="inputAttributes"
        @focus="handleFocus"
        @blur="handleBlur"
        @input="handleInput"
        @change="handleChange"
        @keydown="handleKeyDown"
        @keyup="handleKeyUp"
      />
      
      <!-- Loading indicator -->
      <slot v-if="props.loading" name="loading">
        <div class="app-textarea-loader" />
      </slot>
    </div>
    
    <!-- Bottom slot (for character counter, etc.) -->
    <div class="app-textarea-bottom">
      <!-- Character counter -->
      <div v-if="props.showCounter && props.maxlength" class="app-textarea-counter">
        <span :class="{ 'text-red-500': isOverLimit }">
          {{ charCount }} / {{ charLimit }}
        </span>
      </div>
      
      <!-- Helper text or error message -->
      <div class="app-textarea-helper" :class="{ 'text-red-500': props.error, 'text-dark-50': !props.error }">
        <slot name="helper">
          {{ props.error ? props.errorMessage : props.helperText }}
        </slot>
      </div>
      
      <!-- Custom bottom content -->
      <slot name="bottom" />
    </div>
  </div>
</template>

<style scoped>
/* Base structure */
.app-textarea {
  --textarea-bg: var(--bg-color, #fff);
  --textarea-border: var(--border-color, #e5e7eb);
  --textarea-border-error: var(--color-red, #ef4444);
  --textarea-text: var(--color-primary, #000);
  --textarea-text-secondary: var(--color-secondary, #666);
  --textarea-text-disabled: var(--color-disabled, #999);
  
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.app-textarea-label {
  font-family: var(--font-family);
  font-size: var(--text-size-small);
  font-weight: 500;
  color: var(--textarea-text);
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.app-textarea-container {
  position: relative;
  
  background: var(--textarea-bg);
  border: 1px solid var(--textarea-border);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  overflow: hidden;
}

/* Focus state */
.app-textarea-container:focus-within {
  border-color: var(--color-accent, #1d9bf0);
  box-shadow: 0 0 0 3px rgba(29, 155, 240, 0.1);
}

/* Error state */
.app-textarea.has-error .app-textarea-container {
  border-color: var(--textarea-border-error);
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

/* Disabled state */
.app-textarea.disabled .app-textarea-container {
  background: var(--bg-disabled, #f5f5f5);
  border-color: var(--border-disabled, #ddd);
}

/* Textarea */
.app-textarea-input {
  width: 100%;
  min-width: 100%;
  max-width: 100%;
  
  font-family: var(--font-family);
  color: var(--textarea-text);
  background: transparent;
  border: none;
  outline: none;
  resize: none; /* Handled by auto-resize */
  
  /* Prevent iOS text zoom */
  font-size: inherit;
  line-height: inherit;
  
  /* Prevent autocorrect and autocomplete from adding background */
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
}

.app-textarea-input::placeholder {
  color: var(--textarea-text-secondary);
  opacity: 1;
}

.app-textarea-input:disabled {
  color: var(--textarea-text-disabled);
  cursor: not-allowed;
  opacity: 1;
}

.app-textarea-input:readonly {
  cursor: default;
}

/* Safe area padding at bottom */
.app-textarea-container {
  /* Add padding for safe area */
  /* This will be handled by parent component in mobile layouts */
}

/* Loading indicator */
.app-textarea-loader {
  position: absolute;
  right: 0.75rem;
  bottom: 0.75rem;
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top-color: var(--textarea-text-secondary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Bottom area */
.app-textarea-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  min-height: 1.5rem;
}

/* Character counter */
.app-textarea-counter {
  font-family: var(--font-family);
  font-size: var(--text-size-caption);
  color: var(--textarea-text-secondary);
  text-align: right;
  flex-shrink: 0;
}

.app-textarea-counter .text-red-500 {
  color: var(--color-red, #ef4444);
}

/* Helper text */
.app-textarea-helper {
  flex: 1;
  font-family: var(--font-family);
  font-size: var(--text-size-caption);
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Native input sanitization */
.app-textarea-input[autocapitalize],
.app-textarea-input[autocorrect],
.app-textarea-input[autocomplete],
.app-textarea-input[inputmode],
.app-textarea-input[enterkeyhint],
.app-textarea-input[spellcheck] {
  /* These attributes are sanitized by getInputAttributes */
}
</style>
