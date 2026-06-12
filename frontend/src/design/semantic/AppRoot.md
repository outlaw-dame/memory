# AppRoot

**Location:** `@/design/semantic/AppRoot.vue`  
**Status:** ✅ Implemented  
**Category:** Shell Component  
**Framework7 Backing:** `f7App`, `f7Views`, `f7View`  

---

## Purpose

`AppRoot` initializes the Framework7 application and provides the root context for all Framework7 components. It:

1. Sets up the Framework7 app with platform-appropriate configuration
2. Provides the Framework7 app instance to child components via Vue's provide/inject
3. Configures theme (iOS, Material, or Auto)
4. Handles user preferences like reduced motion
5. Enables native-like gestures (swipe-back, panel swipe) on touch devices

---

## Usage

### Basic Usage

```vue
<script setup lang="ts">
import { AppRoot, AppPage, AppShell } from '@/design/semantic'
</script>

<template>
  <AppRoot>
    <AppPage>
      <AppShell>
        <!-- Your content here -->
        <RouterView />
      </AppShell>
    </AppPage>
  </AppRoot>
</template>
```

### With Explicit Theme

```vue
<script setup lang="ts">
import { AppRoot, AppPage } from '@/design/semantic'
</script>

<template>
  <AppRoot theme="ios">
    <AppPage>
      <!-- Content -->
    </AppPage>
  </AppRoot>
</template>
```

---

## Props

### AppRootProps

| Prop | Type | Default | Description | Required |
|------|------|---------|-------------|----------|
| `theme` | `'ios' \| 'md' \| 'auto'` | `'auto'` | Explicit theme override. Useful for testing or forcing a specific theme. | No |

---

## Provides

`AppRoot` provides the following via Vue's provide/inject:

| Name | Type | Description |
|------|------|-------------|
| `f7app` | `Ref<Framework7 \| null>` | The Framework7 app instance |
| `nativeUiProfile` | `Ref<NativeUiProfile>` | The detected native UI profile |

### Usage of Provided Values

```vue
<script setup lang="ts">
import { inject, ref } from 'vue'
import type Framework7 from 'framework7'
import type { NativeUiProfile } from '@/platform/nativeUiProfile'

const f7app = inject<Ref<InstanceType<typeof Framework7> \| null>>('f7app')
const nativeUiProfile = inject<Ref<NativeUiProfile>>('nativeUiProfile')

// Access the Framework7 instance
f7app.value?.dialog.alert('Hello!')

// Access the native UI profile
console.log(nativeUiProfile.value.theme) // 'ios' | 'md' | 'auto'
</script>
```

---

## Platform Behavior

### Theme Detection

| Platform | Detected Theme | Notes |
|----------|----------------|-------|
| iOS (iPhone/iPad) | `'ios'` | Uses iOS-style components |
| Android | `'md'` | Uses Material Design-style components |
| Desktop | `'md'` | Uses Material Design-style components |
| Auto | `'ios'` or `'md'` | Detects platform automatically |

### Override Behavior

When `theme` prop is provided:
- Overrides automatic detection
- Useful for testing or forcing specific themes
- Still respects reduced motion and other preferences

### Gesture Configuration

| Device Type | Swipe Back | Panel Swipe |
|-------------|------------|-------------|
| Touch Primary (mobile/tablet) | ✅ Enabled | ✅ Enabled |
| Non-Touch (desktop) | ❌ Disabled | ❌ Disabled |

### Motion Configuration

| User Preference | Animations | Page Transitions | Dialog Animations | Touch Ripples |
|-----------------|------------|-----------------|-------------------|----------------|
| Normal | ✅ Enabled | ✅ Enabled | ✅ Enabled | ✅ Enabled |
| Reduced Motion | ❌ Disabled | ❌ Disabled | ❌ Disabled | ❌ Disabled |

---

## Accessibility

`AppRoot` itself has minimal accessibility requirements as it's a container component. However, it ensures that:

1. **Framework7 accessibility features are enabled** - Framework7 has built-in accessibility support
2. **Reduced motion is respected** - Users who prefer reduced motion get a non-animated experience
3. **Focus management works** - Framework7 provides proper focus handling for its components

---

## Testing

### Test File

File: `__tests__/AppRoot.spec.ts` (to be created)

### Test Cases

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppRoot from '@/design/semantic/AppRoot.vue'

describe('AppRoot', () => {
  it('renders f7App with default theme', () => {
    const wrapper = mount(AppRoot, {
      global: {
        stubs: {
          f7App: true,
          f7Views: true,
          f7View: true,
        },
      },
    })
    
    expect(wrapper.findComponent({ name: 'f7App' }).exists()).toBe(true)
  })

  it('provides f7app instance', () => {
    const wrapper = mount(AppRoot, {
      global: {
        stubs: {
          f7App: {
            template: '<div><slot /></div>',
            setup() {
              return { ref: null }
            },
          },
          f7Views: true,
          f7View: true,
        },
      },
    })
    
    // Check that f7app is provided
    // This would need a child component to verify
  })

  it('respects explicit theme prop', () => {
    const wrapper = mount(AppRoot, {
      props: { theme: 'ios' },
      global: {
        stubs: {
          f7App: true,
          f7Views: true,
          f7View: true,
        },
      },
    })
    
    // Verify theme is passed to f7App
    expect(wrapper.findComponent({ name: 'f7App' }).props('theme')).toBe('ios')
  })

  it('provides nativeUiProfile', () => {
    // Similar test for nativeUiProfile
  })

  it('configures touch gestures for touch-primary devices', () => {
    // Mock touch-primary device
    // Verify swipeBack and panel swipe are enabled
  })

  it('disables animations for reduced motion preference', () => {
    // Mock prefers-reduced-motion
    // Verify animate is false
  })
})
```

### Test Checklist

- [ ] Renders f7App with correct theme
- [ ] Provides f7app instance via provide/inject
- [ ] Provides nativeUiProfile via provide/inject
- [ ] Respects explicit theme prop
- [ ] Respects reduced motion media query
- [ ] Configures swipe-back for touch-primary devices
- [ ] Configures panel swipe for touch-primary devices
- [ ] Configures auto-dark mode correctly
- [ ] Handles theme changes dynamically
- [ ] Cleans up event listeners on unmount

---

## Do / Don't

### ✅ DO

- Use `AppRoot` as the root component for your Framework7 app
- Use the provided `f7app` instance for Framework7 API calls
- Use the provided `nativeUiProfile` for platform detection
- Provide explicit theme only when necessary (testing, overrides)
- Nest `AppPage` directly inside `AppRoot`

### ❌ DON'T

- Don't import `f7App` directly from framework7-vue (use `AppRoot`)
- Don't use multiple `AppRoot` instances in the same app
- Don't manually configure Framework7 outside `AppRoot`
- Don't ignore the provided `nativeUiProfile` (use it for platform detection)
- Don't nest `AppRoot` inside other `AppRoot` components

---

## Examples

### Basic App Structure

```vue
<script setup lang="ts">
import { AppRoot, AppPage, AppShell } from '@/design/semantic'
</script>

<template>
  <AppRoot>
    <AppPage>
      <AppShell>
        <RouterView />
      </AppShell>
    </AppPage>
  </AppRoot>
</template>
```

### With Multiple Views

```vue
<script setup lang="ts">
import { AppRoot, AppPage } from '@/design/semantic'
</script>

<template>
  <AppRoot>
    <AppPage>
      <!-- Multiple views can be nested here -->
      <RouterView />
    </AppPage>
  </AppRoot>
</template>
```

### Testing Theme Override

```vue
<script setup lang="ts">
import { AppRoot, AppPage } from '@/design/semantic'

// Force iOS theme for testing
const theme = import.meta.env.MODE === 'test' ? 'ios' : undefined
</script>

<template>
  <AppRoot :theme="theme">
    <AppPage>
      <RouterView />
    </AppPage>
  </AppRoot>
</template>
```

---

## Common Issues

### Issue: Multiple AppRoot instances

**Symptom:** Framework7 warnings about multiple app instances

**Solution:** Ensure only one `AppRoot` exists in your app. It should be at the very root of your component tree.

### Issue: Theme not updating

**Symptom:** Theme changes don't take effect immediately

**Solution:** Framework7 theme changes require a page reload. Use `f7app.value?.theme.set()` for dynamic changes, but note this may cause a reload.

### Issue: Touch gestures not working on desktop

**Symptom:** Swipe-back doesn't work on desktop

**Solution:** This is expected. Touch gestures are only enabled on touch-primary devices. Provide alternative navigation (back buttons) for desktop.

### Issue: Reduced motion not respected

**Symptom:** Animations still play when user prefers reduced motion

**Solution:** Ensure `nativeUiProfile.prefersReducedMotion` is being checked. This is automatically configured by `AppRoot`.

---

## API Reference

### Framework7 App Instance Methods

The provided `f7app` instance has all Framework7 app methods:

| Method | Description |
|--------|-------------|
| `f7app.value?.theme.set(theme)` | Set app theme |
| `f7app.value?.dialog.alert(message)` | Show alert dialog |
| `f7app.value?.dialog.confirm(message)` | Show confirm dialog |
| `f7app.value?.toast.create(message)` | Show toast |
| `f7app.value?.notification.create(message)` | Show notification |

### NativeUiProfile Interface

```ts
interface NativeUiProfile {
  platform: 'ios' | 'android' | 'desktop'
  theme: 'ios' | 'md' | 'auto'
  prefersReducedMotion: boolean
  isTouchPrimary: boolean
  userAgent: string
  // ... other properties
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-11 | Initial documentation |

---

## See Also

- [AppPage](./AppPage.md) - Page container component
- [AppShell](./AppShell.md) - Shell layout component
- [Frontend Architecture Contract](../../../docs/internal/frontend-architecture-contract.md)
- [Semantic Component Checklist](../../../docs/internal/frontend-semantic-component-checklist.md)
