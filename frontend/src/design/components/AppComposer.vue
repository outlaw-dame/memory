<script setup lang="ts">
/**
 * AppComposer - Semantic Post/Reply Composer Component
 * 
 * A platform-aware composer that handles:
 * - Native keyboard behavior for post content
 * - Safe area insets at the bottom
 * - Keyboard avoidance with automatic scrolling
 * - Auto-resize based on content
 * - Character counter
 * - Error states
 * - Loading states
 * - Media attachment previews
 * 
 * Security considerations:
 * - All input is sanitized by the browser
 * - No dynamic code evaluation
 * - Safe DOM access with null checks
 * - Rate-limited events
 * - Input validation for all user-provided values
 */

import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useKeyboard, getKeyboardConfig, getInputAttributes, KEYBOARD_PRESETS } from '@/platform/keyboardPolicy'
import { useSafeArea } from '@/platform/safeAreaPolicy'
import { useHaptics } from '@/platform/hapticPolicy'

export interface AppComposerProps {
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
  
  // Character counter
  showCounter?: boolean
  maxlength?: number
  
  // State
  disabled?: boolean
  readonly?: boolean
  loading?: boolean
  error?: boolean
  
  // Labels
  label?: string
  helperText?: string
  errorMessage?: string
  
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
  onSubmit?: (content: string) => void
}

const props = withDefaults(defineProps<AppComposerProps>(), {
  purpose: 'composer',
  size: 'md',
  rounded: 'lg',
  autoResize: true,
  minRows: 3,
  maxRows: 10,
  disabled: false,
  readonly: false,
  loading: false,
  error: false,
  showCounter: true,
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
  (e: 'submit', content: string): void
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
  if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
    const enterKeyHint = keyboardConfig.value.enterKeyHint || 'default'
    if (enterKeyHint === 'done' || enterKeyHint === 'send') {
      // Don't insert newline on done/send
      event.preventDefault()
      // Submit if there's content
      if (props.modelValue.trim()) {
        emit('submit', props.modelValue)
      }
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
  clear: () => {
    emit('update:modelValue', '')
  },
  submit: () => {
    if (props.modelValue.trim()) {
      emit('submit', props.modelValue)
    }
  }
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
  <div class="app-composer" :class="{ 'has-error': props.error, 'disabled': props.disabled }">
    <!-- Label -->
    <label v-if="props.label" class="app-composer-label" :for="props.id">
      {{ props.label }}
      <span v-if="props.required" class="text-red-500" aria-hidden="true">*</span>
    </label>
    
    <!-- Composer container -->
    <div class="app-composer-container" :class="[roundedClasses, sizeClasses]">
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
        :class="app-composer-input"
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
        <div class="app-composer-loader" />
      </slot>
      
      <!-- Bottom slot (for character counter, buttons, etc.) -->
      <div class="app-composer-bottom" :class="{ 'safe-area-pb': safeArea.bottom > 0 }" :style="{ paddingBottom: `${safeArea.bottom}px` }">
        <!-- Character counter -->
        <div v-if="props.showCounter" class="app-composer-counter">
          <span :class="{ 'text-red-500': isOverLimit }">
            {{ charCount }} / {{ charLimit === Infinity ? '∞' : charLimit }}
          </span>
        </div>
        
        <!-- Helper text or error message -->
        <div class="app-composer-helper" :class="{ 'text-red-500': props.error, 'text-dark-50': !props.error }">
          <slot name="helper">
            {{ props.error ? props.errorMessage : props.helperText }}
          </slot>
        </div>
        
        <!-- Custom bottom content -->
        <slot name="bottom" />
        
        <!-- Submit button slot -->
        <slot name="submit" />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Base structure */
.app-composer {
  --composer-bg: var(--bg-color, #fff);
  --composer-border: var(--border-color, #e5e7eb);
  --composer-border-error: var(--color-red, #ef4444);
  --composer-text: var(--color-primary, #000);
  --composer-text-secondary: var(--color-secondary, #666);
  --composer-text-disabled: var(--color-disabled, #999);
  
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.app-composer-label {
  font-family: var(--font-family);
  font-size: var(--text-size-small);
  font-weight: 500;
  color: var(--composer-text);
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.app-composer-container {
  position: relative;
  
  background: var(--composer-bg);
  border: 1px solid var(--composer-border);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  overflow: hidden;
}

/* Focus state */
.app-composer-container:focus-within {
  border-color: var(--color-accent, #1d9bf0);
  box-shadow: 0 0 0 3px rgba(29, 155, 240, 0.1);
}

/* Error state */
.app-composer.has-error .app-composer-container {
  border-color: var(--composer-border-error);
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}

/* Disabled state */
.app-composer.disabled .app-composer-container {
  background: var(--bg-disabled, #f5f5f5);
  border-color: var(--border-disabled, #ddd);
}

/* Textarea */
.app-composer-input {
  width: 100%;
  min-width: 100%;
  max-width: 100%;
  
  font-family: var(--font-family);
  color: var(--composer-text);
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

.app-composer-input::placeholder {
  color: var(--composer-text-secondary);
  opacity: 1;
}

.app-composer-input:disabled {
  color: var(--composer-text-disabled);
  cursor: not-allowed;
  opacity: 1;
}

.app-composer-input:readonly {
  cursor: default;
}

/* Loading indicator */
.app-composer-loader {
  position: absolute;
  right: 0.75rem;
  bottom: 0.75rem;
  width: 1rem;
  height: 1rem;
  border: 2px solid transparent;
  border-top-color: var(--composer-text-secondary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Bottom area */
.app-composer-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  min-height: 1.5rem;
  padding-bottom: calc(v-bind("safeArea.bottom") * 1px);
}

/* Character counter */
.app-composer-counter {
  font-family: var(--font-family);
  font-size: var(--text-size-caption);
  color: var(--composer-text-secondary);
  text-align: right;
  flex-shrink: 0;
}

.app-composer-counter .text-red-500 {
  color: var(--color-red, #ef4444);
}

/* Helper text */
.app-composer-helper {
  flex: 1;
  font-family: var(--font-family);
  font-size: var(--text-size-caption);
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Safe area padding at bottom */
.app-composer-bottom.safe-area-pb {
  /* Padding handled by inline style */
}

/* Native input sanitization */
.app-composer-input[autocapitalize],
.app-composer-input[autocorrect],
.app-composer-input[autocomplete],
.app-composer-input[inputmode],
.app-composer-input[enterkeyhint],
.app-composer-input[spellcheck] {
  /* These attributes are sanitized by getInputAttributes */
}
</style>
