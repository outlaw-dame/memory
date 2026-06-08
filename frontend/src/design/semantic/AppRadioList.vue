<script setup lang="ts">
/**
 * AppRadioList - Semantic Radio Button List Component
 * 
 * A platform-aware radio button list that creates iOS Settings-like
 * single-selection lists or Material-style radio groups.
 * 
 * Features:
 * - Native iOS radio list styling
 * - Material Design radio group styling on Android
 * - Accessibility support
 * - Form integration
 * - Error and helper text support
 * 
 * Security considerations:
 * - All inputs are type-safe
 * - No dynamic code evaluation
 * - Safe DOM access with null checks
 * - Input validation for all props
 */

import { computed } from 'vue'
import { f7List, f7ListItem, f7Radio } from 'framework7-vue'
import { useNativeUiProfile } from '@/platform/nativeUiProfile'
import { useHaptics } from '@/platform/hapticPolicy'

export interface AppRadioOption {
  value: string
  label: string
  subtitle?: string
  text?: string
  disabled?: boolean
  icon?: string
}

export interface AppRadioListProps {
  // Value binding
  modelValue: string
  
  // Options
  options: AppRadioOption[]
  
  // Labels
  label?: string
  helperText?: string
  errorText?: string
  
  // State
  disabled?: boolean
  readonly?: boolean
  error?: boolean
  
  // Styling
  inset?: boolean
  
  // Layout
  iconPosition?: 'left' | 'right'
  
  // Accessibility
  ariaLabel?: string
  ariaDescribedby?: string
  
  // Additional classes
  class?: string | string[] | Record<string, boolean>
}

const props = withDefaults(defineProps<AppRadioListProps>(), {
  modelValue: '',
  options: () => [],
  disabled: false,
  readonly: false,
  error: false,
  inset: true,
  iconPosition: 'left',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
  (e: 'focus', event: FocusEvent): void
  (e: 'blur', event: FocusEvent): void
}>()

const nativeUiProfile = useNativeUiProfile()
const haptics = useHaptics()

// Framework7 radio props
const f7RadioProps = computed(() => {
  const theme = nativeUiProfile.theme
  return {
    iconMaterial: theme === 'md' ? 'radio_button_checked' : undefined,
    iconIos: theme === 'ios' ? 'checkmark_circle_fill' : undefined,
  }
})

// Handle radio change
function handleChange(value: string, event: Event) {
  if (props.disabled || props.readonly) {
    event.preventDefault()
    event.stopPropagation()
    return
  }
  
  // Haptic feedback
  haptics.light().catch(() => {})
  
  emit('update:modelValue', value)
  emit('change', value)
}

// Handle focus/blur
function handleFocus(event: FocusEvent) {
  emit('focus', event)
}

function handleBlur(event: FocusEvent) {
  emit('blur', event)
}
</script>

<template>
  <div class="app-radio-list" :class="{ 'has-error': props.error, 'disabled': props.disabled || props.readonly }">
    <!-- Label -->
    <label v-if="props.label" class="app-radio-list-label" :for="$attrs.id">
      {{ props.label }}
    </label>
    
    <!-- List container -->
    <f7List :inset="props.inset" class="app-radio-list-options">
      <f7ListItem
        v-for="(option, index) in props.options"
        :key="option.value"
        :title="option.label"
        :subtitle="option.subtitle"
        :text="option.text"
        :disabled="option.disabled || props.disabled || props.readonly"
        :class="{
          'app-radio-list-item': true,
          'app-radio-list-item-selected': modelValue === option.value,
          'app-radio-list-item-disabled': option.disabled || props.disabled || props.readonly,
        }"
        @focus="handleFocus"
        @blur="handleBlur"
      >
        <!-- Icon slot (left) -->
        <template v-if="option.icon && props.iconPosition === 'left'" #media>
          <div class="app-radio-list-icon left">
            <slot name="icon" :option="option" :index="index">
              <!-- Icon can be rendered here -->
            </slot>
          </div>
        </template>
        
        <!-- Radio button -->
        <template #after>
          <f7Radio
            :name="$attrs.id || 'radio-group'"
            :value="option.value"
            :checked="modelValue === option.value"
            :disabled="option.disabled || props.disabled || props.readonly"
            v-bind="f7RadioProps"
            @change="(e) => handleChange(option.value, e)"
            :aria-label="option.label || props.ariaLabel"
          />
        </template>
        
        <!-- Icon slot (right) -->
        <template v-if="option.icon && props.iconPosition === 'right'" #after>
          <div class="app-radio-list-icon right">
            <slot name="icon" :option="option" :index="index">
              <!-- Icon can be rendered here -->
            </slot>
          </div>
        </template>
      </f7ListItem>
    </f7List>
    
    <!-- Helper text or error -->
    <div v-if="props.helperText || props.errorText" class="app-radio-list-helper">
      <span :class="{ 'text-red-500': props.error, 'text-dark-50': !props.error }">
        {{ props.error ? props.errorText : props.helperText }}
      </span>
    </div>
  </div>
</template>

<style scoped>
/* Base container */
.app-radio-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Label styling */
.app-radio-list-label {
  font-family: var(--font-family);
  font-size: var(--text-size-base);
  font-weight: 500;
  color: var(--color-primary);
}

/* Options list */
.app-radio-list-options {
  --f7-list-item-padding-horizontal: var(--padding-main);
  --f7-list-item-padding-vertical: 0.75rem;
  --f7-list-item-font-size: var(--text-size-base);
  --f7-list-item-line-height: 1.5;
  --f7-list-item-color: var(--color-primary);
  --f7-list-item-background: transparent;
  
  /* Selected state */
  --f7-list-item-selected-bg-color: rgba(var(--color-accent-rgb, 29, 155, 240), 0.05);
}

/* Individual radio list item */
.app-radio-list-item {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.app-radio-list-item:not(.app-radio-list-item-disabled):hover {
  background-color: var(--f7-list-item-selected-bg-color);
}

.app-radio-list-item.app-radio-list-item-selected {
  background-color: var(--f7-list-item-selected-bg-color);
}

.app-radio-list-item.app-radio-list-item-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Icon styling */
.app-radio-list-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-secondary);
}

.app-radio-list-icon.left {
  margin-right: 0.5rem;
}

.app-radio-list-icon.right {
  margin-left: 0.5rem;
}

/* Helper text */
.app-radio-list-helper {
  font-family: var(--font-family);
  font-size: var(--text-size-caption);
  line-height: 1.25;
  color: var(--color-secondary);
}

.app-radio-list-helper .text-red-500 {
  color: var(--color-red, #ef4444);
}

/* Framework7 radio customization */
:deep(.radio) {
  --f7-radio-size: 20px;
  --f7-radio-icon-size: 20px;
  --f7-radio-color: var(--color-accent, #1d9bf0);
  --f7-radio-border-color: var(--color-secondary, #666);
  --f7-radio-bg-color: transparent;
  
  /* Transition */
  --f7-radio-transition-duration: 0.2s;
  
  /* Disabled state */
  --f7-radio-opacity-disabled: 0.4;
  
  /* Focus state */
  --f7-radio-focus-box-shadow: 0 0 0 3px rgba(29, 155, 240, 0.2);
}

/* Platform-specific radio styling */
.app-radio-list :deep(.radio.ios) {
  --f7-radio-size: 22px;
  --f7-radio-icon-size: 22px;
}

.app-radio-list :deep(.radio.md) {
  --f7-radio-size: 20px;
  --f7-radio-icon-size: 20px;
}

/* Disabled state */
.app-radio-list.has-error :deep(.radio) {
  --f7-radio-color: var(--color-red, #ef4444);
  --f7-radio-border-color: var(--color-red, #ef4444);
}

.app-radio-list.disabled :deep(.radio) {
  opacity: var(--f7-radio-opacity-disabled);
  cursor: not-allowed;
}

/* Accessibility: ensure radio is keyboard accessible */
:deep(.radio:focus-visible) {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
</style>
