<script setup lang="ts">
/**
 * AppSlider - Semantic Range Slider Component
 * 
 * A platform-aware range slider that wraps Framework7's range slider
 * with Memory's design system.
 * 
 * Features:
 * - Native iOS/Android slider styling
 * - Support for min/max values
 * - Step increments
 * - Dual handle support
 * - Vertical or horizontal orientation
 * - Accessibility support
 * - Value display
 * 
 * Security considerations:
 * - All inputs are type-safe and validated
 * - No dynamic code evaluation
 * - Safe DOM access with null checks
 * - Prevents values outside min/max range
 */

import { ref, computed, watch } from 'vue'
import { f7Range } from 'framework7-vue'
import { useNativeUiProfile } from '@/platform/nativeUiProfile'
import { useHaptics } from '@/platform/hapticPolicy'

export interface AppSliderProps {
  // Value binding
  modelValue: number | number[]
  
  // Range
  min?: number
  max?: number
  step?: number
  
  // Dual handle support
  dual?: boolean
  
  // Labels
  label?: string
  labelLeft?: string
  labelRight?: string
  valueLabel?: boolean
  valueFormatter?: (value: number) => string
  
  // State
  disabled?: boolean
  readonly?: boolean
  
  // Styling
  size?: 'sm' | 'md' | 'lg'
  vertical?: boolean
  
  // Accessibility
  ariaLabel?: string
  ariaDescribedby?: string
  
  // Additional classes
  class?: string | string[] | Record<string, boolean>
}

const props = withDefaults(defineProps<AppSliderProps>(), {
  modelValue: 0,
  min: 0,
  max: 100,
  step: 1,
  dual: false,
  valueLabel: false,
  valueFormatter: (value: number) => String(value),
  disabled: false,
  readonly: false,
  size: 'md',
  vertical: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: number | number[]): void
  (e: 'change', value: number | number[]): void
  (e: 'focus', event: FocusEvent): void
  (e: 'blur', event: FocusEvent): void
}>()

const nativeUiProfile = useNativeUiProfile()
const haptics = useHaptics()

const internalValue = ref<number | number[]>(props.modelValue)

// Validate and clamp values
function clampValue(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function validateValue(val: number | number[]): number | number[] {
  if (Array.isArray(val)) {
    return val.map(v => clampValue(v, props.min, props.max))
  }
  return clampValue(val, props.min, props.max)
}

// Format value for display
const displayValue = computed(() => {
  if (props.valueFormatter && typeof props.valueFormatter === 'function') {
    if (Array.isArray(internalValue.value)) {
      return internalValue.value.map(props.valueFormatter).join(' - ')
    }
    return props.valueFormatter(internalValue.value as number)
  }
  return Array.isArray(internalValue.value) 
    ? internalValue.value.join(' - ') 
    : String(internalValue.value)
})

// Effective disabled state
const effectiveDisabled = computed(() => props.disabled || props.readonly)

// Handle range change
function handleChange(event: Event, value: number | number[]) {
  const validated = validateValue(value)
  internalValue.value = validated
  emit('update:modelValue', validated)
  emit('change', validated)
  
  // Haptic feedback
  if (!effectiveDisabled.value) {
    haptics.light().catch(() => {})
  }
}

// Handle input for dual sliders
function handleInput(event: Event, value: number | number[]) {
  const validated = validateValue(value)
  internalValue.value = validated
  emit('update:modelValue', validated)
}

// Handle focus/blur
function handleFocus(event: FocusEvent) {
  emit('focus', event)
}

function handleBlur(event: FocusEvent) {
  emit('blur', event)
}

// Watch for external value changes
watch(() => props.modelValue, (newValue) => {
  if (JSON.stringify(internalValue.value) !== JSON.stringify(newValue)) {
    internalValue.value = validateValue(newValue)
  }
})

// Size classes
const sizeClass = computed(() => {
  switch (props.size) {
    case 'sm': return 'app-slider-sm'
    case 'lg': return 'app-slider-lg'
    default: return 'app-slider-md'
  }
})

// Framework7 range props
const f7RangeProps = computed(() => ({
  value: internalValue.value,
  min: props.min,
  max: props.max,
  step: props.step,
  dual: props.dual,
  vertical: props.vertical,
  disabled: effectiveDisabled.value,
  class: [props.class, sizeClass.value, 'app-slider', {
    'app-slider-error': props.error,
    'app-slider-disabled': effectiveDisabled.value,
  }],
}))
</script>

<template>
  <div class="app-slider-container" :class="[sizeClass, { 'has-error': props.error, 'disabled': effectiveDisabled, 'vertical': props.vertical }]">
    <!-- Label -->
    <label v-if="props.label" class="app-slider-label" :for="$attrs.id">
      {{ props.label }}
    </label>
    
    <!-- Label (left) -->
    <label v-if="props.labelLeft" class="app-slider-label left" :for="$attrs.id">
      {{ props.labelLeft }}
    </label>
    
    <!-- Slider -->
    <div class="app-slider-wrapper">
      <f7Range
        v-bind="f7RangeProps"
        @range:change="(e, v) => handleChange(e, v)"
        @range:input="(e, v) => handleInput(e, v)"
        @focus="handleFocus"
        @blur="handleBlur"
        :aria-label="props.ariaLabel || props.label || 'Slider'"
        :aria-describedby="props.ariaDescribedby"
        role="slider"
      />
      
      <!-- Value display -->
      <div v-if="props.valueLabel" class="app-slider-value">
        {{ displayValue }}
      </div>
    </div>
    
    <!-- Label (right) -->
    <label v-if="props.labelRight" class="app-slider-label right" :for="$attrs.id">
      {{ props.labelRight }}
    </label>
  </div>
</template>

<style scoped>
/* Base container */
.app-slider-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.app-slider-container.vertical {
  flex-direction: column;
  align-items: stretch;
}

/* Label styling */
.app-slider-label {
  font-family: var(--font-family);
  font-size: var(--text-size-base);
  color: var(--color-primary);
}

.app-slider-label.left {
  order: -1;
}

.app-slider-label.right {
  order: 1;
}

/* Slider wrapper */
.app-slider-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.app-slider-container.vertical .app-slider-wrapper {
  flex-direction: column;
  align-items: stretch;
}

/* Value display */
.app-slider-value {
  font-family: var(--font-family);
  font-size: var(--text-size-base);
  font-weight: 500;
  color: var(--color-primary);
  min-width: 40px;
  text-align: center;
}

/* Framework7 range customization */
:deep(.range-slider) {
  --f7-range-height: 4px;
  --f7-range-bg-color: rgba(var(--color-accent-rgb, 29, 155, 240), 0.2);
  --f7-range-bg-color-active: var(--color-accent, #1d9bf0);
  --f7-range-bar-bg-color: var(--color-accent, #1d9bf0);
  --f7-range-bar-border-radius: 2px;
  --f7-range-bar-height: 4px;
  
  /* Knob (thumb) styling */
  --f7-range-knob-size: 24px;
  --f7-range-knob-bg-color: white;
  --f7-range-knob-border-color: var(--color-accent, #1d9bf0);
  --f7-range-knob-border-width: 2px;
  --f7-range-knob-box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  --f7-range-knob-border-radius: 50%;
  
  /* Disabled state */
  --f7-range-opacity-disabled: 0.4;
  
  /* Focus state */
  --f7-range-knob-focus-box-shadow: 0 0 0 3px rgba(29, 155, 240, 0.3);
}

/* Size variants */
.app-slider-container.app-slider-sm :deep(.range-slider) {
  --f7-range-knob-size: 20px;
}

.app-slider-container.app-slider-lg :deep(.range-slider) {
  --f7-range-knob-size: 28px;
}

/* Vertical slider */
.app-slider-container.vertical :deep(.range-slider) {
  --f7-range-height: 100%;
  --f7-range-knob-size: 20px;
}

/* Error state */
.app-slider-container.has-error :deep(.range-slider) {
  --f7-range-bg-color-active: var(--color-red, #ef4444);
  --f7-range-bar-bg-color: var(--color-red, #ef4444);
  --f7-range-knob-border-color: var(--color-red, #ef4444);
}

/* Disabled state */
.app-slider-container.disabled :deep(.range-slider) {
  opacity: var(--f7-range-opacity-disabled);
  cursor: not-allowed;
}

/* Platform-specific styling */
.app-slider-container :deep(.range-slider.ios) {
  --f7-range-bar-border-radius: 4px;
  --f7-range-knob-box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}

.app-slider-container :deep(.range-slider.md) {
  --f7-range-bar-border-radius: 2px;
  --f7-range-knob-box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* Accessibility: ensure slider is keyboard accessible */
:deep(.range-knob:focus-visible) {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}
</style>
