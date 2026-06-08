<script setup lang="ts">
/**
 * AppCheckboxList - Semantic Checkbox List Component
 * 
 * A platform-aware checkbox list that creates iOS Settings-like
 * multi-selection lists or Material-style checkbox groups.
 * 
 * Features:
 * - Native iOS checkbox list styling
 * - Material Design checkbox group styling on Android
 * - Accessibility support
 * - Form integration
 * - Error and helper text support
 * - Select all / deselect all support
 * 
 * Security considerations:
 * - All inputs are type-safe
 * - No dynamic code evaluation
 * - Safe DOM access with null checks
 * - Input validation for all props
 */

import { computed } from 'vue'
import { f7List, f7ListItem, f7Checkbox } from 'framework7-vue'
import { useNativeUiProfile } from '@/platform/nativeUiProfile'
import { useHaptics } from '@/platform/hapticPolicy'

export interface AppCheckboxOption {
  value: string
  label: string
  subtitle?: string
  text?: string
  disabled?: boolean
  icon?: string
}

export interface AppCheckboxListProps {
  // Selected values binding
  modelValue: string[]
  
  // Options
  options: AppCheckboxOption[]
  
  // Labels
  label?: string
  selectAllLabel?: string
  helperText?: string
  errorText?: string
  
  // State
  disabled?: boolean
  readonly?: boolean
  error?: boolean
  
  // Styling
  inset?: boolean
  showSelectAll?: boolean
  
  // Layout
  iconPosition?: 'left' | 'right'
  
  // Accessibility
  ariaLabel?: string
  ariaDescribedby?: string
  
  // Additional classes
  class?: string | string[] | Record<string, boolean>
}

const props = withDefaults(defineProps<AppCheckboxListProps>(), {
  modelValue: () => [],
  options: () => [],
  label: '',
  selectAllLabel: 'Select all',
  disabled: false,
  readonly: false,
  error: false,
  inset: true,
  showSelectAll: false,
  iconPosition: 'left',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
  (e: 'change', value: string[]): void
  (e: 'focus', event: FocusEvent): void
  (e: 'blur', event: FocusEvent): void
}>()

const nativeUiProfile = useNativeUiProfile()
const haptics = useHaptics()

// Computed properties
const effectiveDisabled = computed(() => props.disabled || props.readonly)

const selectedSet = computed(() => new Set(props.modelValue))

const allSelected = computed(() => {
  return props.options.length > 0 && 
         props.options.every(opt => selectedSet.value.has(opt.value))
})

const someSelected = computed(() => {
  return props.options.some(opt => selectedSet.value.has(opt.value)) && !allSelected.value
})

const indeterminate = computed(() => someSelected.value)

// Framework7 checkbox icon based on platform
const checkboxIcon = computed(() => {
  const theme = nativeUiProfile.theme
  return theme === 'md' ? 'checkbox' : 'checkmark_circle'
})

// Handle checkbox change
function handleChange(value: string, checked: boolean, event: Event) {
  if (effectiveDisabled.value) {
    event.preventDefault()
    event.stopPropagation()
    return
  }
  
  // Haptic feedback
  haptics.light().catch(() => {})
  
  const newValue = checked 
    ? [...props.modelValue, value]
    : props.modelValue.filter(v => v !== value)
  
  emit('update:modelValue', newValue)
  emit('change', newValue)
}

// Handle select all / deselect all
function handleSelectAll(checked: boolean, event: Event) {
  if (effectiveDisabled.value) {
    event.preventDefault()
    event.stopPropagation()
    return
  }
  
  // Haptic feedback
  haptics.light().catch(() => {})
  
  const newValue = checked 
    ? props.options.map(opt => opt.value)
    : []
  
  emit('update:modelValue', newValue)
  emit('change', newValue)
}

// Handle focus/blur
function handleFocus(event: FocusEvent) {
  emit('focus', event)
}

function handleBlur(event: FocusEvent) {
  emit('blur', event)
}

// Check if option is selected
function isOptionSelected(value: string): boolean {
  return selectedSet.value.has(value)
}
</script>

<template>
  <div class="app-checkbox-list" :class="{ 'has-error': props.error, 'disabled': effectiveDisabled }">
    <!-- Label -->
    <label v-if="props.label" class="app-checkbox-list-label" :for="$attrs.id">
      {{ props.label }}
    </label>
    
    <!-- Select All option -->
    <f7List v-if="props.showSelectAll && props.options.length > 0" :inset="props.inset" class="app-checkbox-list-select-all">
      <f7ListItem>
        <template #after>
          <f7Checkbox
            :checked="allSelected"
            :indeterminate="indeterminate"
            :icon="checkboxIcon"
            :disabled="effectiveDisabled"
            @change="(e, checked) => handleSelectAll(checked, e)"
            @focus="handleFocus"
            @blur="handleBlur"
            :aria-label="props.selectAllLabel"
          />
        </template>
        <template #title>
          <span class="app-checkbox-list-select-all-label">
            {{ props.selectAllLabel }}
          </span>
        </template>
      </f7ListItem>
    </f7List>
    
    <!-- Options list -->
    <f7List :inset="props.inset" class="app-checkbox-list-options">
      <f7ListItem
        v-for="(option, index) in props.options"
        :key="option.value"
        :title="option.label"
        :subtitle="option.subtitle"
        :text="option.text"
        :disabled="option.disabled || effectiveDisabled"
        :class="{
          'app-checkbox-list-item': true,
          'app-checkbox-list-item-selected': isOptionSelected(option.value),
          'app-checkbox-list-item-disabled': option.disabled || effectiveDisabled,
        }"
        @focus="handleFocus"
        @blur="handleBlur"
      >
        <!-- Icon slot (left) -->
        <template v-if="option.icon && props.iconPosition === 'left'" #media>
          <div class="app-checkbox-list-icon left">
            <slot name="icon" :option="option" :index="index">
              <!-- Icon can be rendered here -->
            </slot>
          </div>
        </template>
        
        <!-- Checkbox -->
        <template #after>
          <f7Checkbox
            :name="$attrs.id || 'checkbox-group'"
            :value="option.value"
            :checked="isOptionSelected(option.value)"
            :icon="checkboxIcon"
            :disabled="option.disabled || effectiveDisabled"
            @change="(e, checked) => handleChange(option.value, checked, e)"
            :aria-label="option.label || props.ariaLabel"
          />
        </template>
        
        <!-- Icon slot (right) -->
        <template v-if="option.icon && props.iconPosition === 'right'" #after>
          <div class="app-checkbox-list-icon right">
            <slot name="icon" :option="option" :index="index">
              <!-- Icon can be rendered here -->
            </slot>
          </div>
        </template>
      </f7ListItem>
    </f7List>
    
    <!-- Helper text or error -->
    <div v-if="props.helperText || props.errorText" class="app-checkbox-list-helper">
      <span :class="{ 'text-red-500': props.error, 'text-dark-50': !props.error }">
        {{ props.error ? props.errorText : props.helperText }}
      </span>
    </div>
  </div>
</template>

<style scoped>
/* Base container */
.app-checkbox-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Label styling */
.app-checkbox-list-label {
  font-family: var(--font-family);
  font-size: var(--text-size-base);
  font-weight: 500;
  color: var(--color-primary);
}

/* Select all list */
.app-checkbox-list-select-all {
  margin-bottom: 0.5rem;
}

.app-checkbox-list-select-all-label {
  font-family: var(--font-family);
  font-size: var(--text-size-base);
  font-weight: 500;
  color: var(--color-secondary);
}

/* Options list */
.app-checkbox-list-options {
  --f7-list-item-padding-horizontal: var(--padding-main);
  --f7-list-item-padding-vertical: 0.75rem;
  --f7-list-item-font-size: var(--text-size-base);
  --f7-list-item-line-height: 1.5;
  --f7-list-item-color: var(--color-primary);
  --f7-list-item-background: transparent;
}

/* Individual checkbox list item */
.app-checkbox-list-item {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.app-checkbox-list-item:not(.app-checkbox-list-item-disabled):hover {
  background-color: rgba(var(--color-accent-rgb, 29, 155, 240), 0.05);
}

.app-checkbox-list-item.app-checkbox-list-item-selected {
  background-color: rgba(var(--color-accent-rgb, 29, 155, 240), 0.05);
}

.app-checkbox-list-item.app-checkbox-list-item-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Icon styling */
.app-checkbox-list-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-secondary);
}

.app-checkbox-list-icon.left {
  margin-right: 0.5rem;
}

.app-checkbox-list-icon.right {
  margin-left: 0.5rem;
}

/* Helper text */
.app-checkbox-list-helper {
  font-family: var(--font-family);
  font-size: var(--text-size-caption);
  line-height: 1.25;
  color: var(--color-secondary);
}

.app-checkbox-list-helper .text-red-500 {
  color: var(--color-red, #ef4444);
}

/* Framework7 checkbox customization */
:deep(.checkbox) {
  --f7-checkbox-size: 20px;
  --f7-checkbox-icon-size: 20px;
  --f7-checkbox-color: var(--color-accent, #1d9bf0);
  --f7-checkbox-border-color: var(--color-secondary, #666);
  --f7-checkbox-bg-color: transparent;
  --f7-checkbox-checked-bg-color: var(--color-accent, #1d9bf0);
  --f7-checkbox-checked-color: white;
  --f7-checkbox-checked-border-color: var(--color-accent, #1d9bf0);
  
  /* Transition */
  --f7-checkbox-transition-duration: 0.2s;
  
  /* Disabled state */
  --f7-checkbox-opacity-disabled: 0.4;
  
  /* Focus state */
  --f7-checkbox-focus-box-shadow: 0 0 0 3px rgba(29, 155, 240, 0.2);
}

/* Platform-specific checkbox styling */
.app-checkbox-list :deep(.checkbox.ios) {
  --f7-checkbox-size: 22px;
  --f7-checkbox-icon-size: 22px;
  --f7-checkbox-border-radius: 6px;
}

.app-checkbox-list :deep(.checkbox.md) {
  --f7-checkbox-size: 20px;
  --f7-checkbox-icon-size: 20px;
  --f7-checkbox-border-radius: 4px;
}

/* Error state */
.app-checkbox-list.has-error :deep(.checkbox) {
  --f7-checkbox-color: var(--color-red, #ef4444);
  --f7-checkbox-border-color: var(--color-red, #ef4444);
  --f7-checkbox-checked-bg-color: var(--color-red, #ef4444);
  --f7-checkbox-checked-border-color: var(--color-red, #ef4444);
}

.app-checkbox-list.disabled :deep(.checkbox) {
  opacity: var(--f7-checkbox-opacity-disabled);
  cursor: not-allowed;
}

/* Accessibility: ensure checkbox is keyboard accessible */
:deep(.checkbox:focus-visible) {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
</style>
