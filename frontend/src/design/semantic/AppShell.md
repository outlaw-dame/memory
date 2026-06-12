# AppShell

**Location:** `@/design/semantic/AppShell.vue`  
**Status:** ✅ Implemented  
**Category:** Shell Component  
**Framework7 Backing:** Custom (composes AppNavbar + AppToolbar)  

---

## Purpose

`AppShell` provides the consistent shell layout for the application, including:

1. **Navigation bar** (top) - Via `AppNavbar`
2. **Main content area** - With proper padding for navbar and tabbar
3. **Tab bar** (bottom) - Via `AppToolbar`
4. **Auth route handling** - Shell is hidden for auth routes

It ensures a consistent user experience across all non-auth routes while allowing full-screen layouts for authentication flows.

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
        <!-- Content goes here -->
        <RouterView />
      </AppShell>
    </AppPage>
  </AppRoot>
</template>
```

### With Named Slots (if needed in future)

```vue
<AppShell>
  <!-- Custom navbar -->
  <template #navbar>
    <CustomNavbar />
  </template>
  
  <!-- Main content -->
  <RouterView />
  
  <!-- Custom tabbar -->
  <template #tabbar>
    <CustomTabBar />
  </template>
</AppShell>
```

---

## Props

`AppShell` currently does not accept any props. It automatically:
- Detects the current route
- Shows/hides the shell based on route
- Manages back button visibility
- Applies proper padding for safe areas

---

## Route Handling

### Auth Routes (Shell Hidden)

The shell (navbar + tabbar) is **hidden** for these routes to allow full-screen layouts:

```ts
const AUTH_ROUTES = new Set([
  'signin',
  'signup',
  'welcome',
  'experience',
  'auth-callback',
])
```

### Non-Auth Routes (Shell Visible)

For all other routes, the shell is visible with:
- AppNavbar at the top
- AppToolbar (tabbar) at the bottom
- Proper padding between them

### Root Routes

Root routes (home, explore, messages, notifications, profile) are identified as:

```ts
const ROOT_ROUTES = new Set([
  'home',
  'explore',
  'messages',
  'notifications',
  'profile',
])
```

### Back Button Visibility

The back button in AppNavbar is shown when:
1. The route is **NOT** a root route
2. The route is **NOT** an auth route
3. The shell is visible

---

## Platform Behavior

### Layout

```
┌─────────────────────────┐
│      AppNavbar          │  ← 44px height
├─────────────────────────┤
│                         │
│      Main Content       │  ← Flexible, with padding
│                         │
├─────────────────────────┤
│      AppToolbar          │  ← 56px height
└─────────────────────────┘
```

### Safe Area Handling

- **iOS:** Respects `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`
- **Android:** Works with standard viewport
- **Desktop:** Safe area insets not applicable, but padding still applied

### Responsive Behavior

| Device | Navbar | Toolbar | Content Padding |
|--------|--------|---------|------------------|
| iPhone | 44px | 56px | Top: 44px, Bottom: 56px |
| iPad | 44px | 56px | Top: 44px, Bottom: 56px |
| Android | 44px | 56px | Top: 44px, Bottom: 56px |
| Desktop | 44px | 56px | Top: 44px, Bottom: 56px |

---

## Accessibility

`AppShell` ensures:

1. **Keyboard Navigation**
   - Tab order: Navbar → Content → Tabbar
   - All interactive elements in navbar and tabbar are focusable

2. **Focus Management**
   - Focus is properly contained within the shell
   - Content area is keyboard-accessible

3. **Screen Reader Support**
   - Navbar and tabbar have proper landmarks (via AppNavbar and AppToolbar)
   - Main content has proper role

4. **Skip Links** (Future Enhancement)
   - Consider adding skip-to-main-content link for keyboard users

---

## Testing

### Test File

File: `__tests__/AppShell.spec.ts` (to be created)

### Test Cases

```ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import AppShell from '@/design/semantic/AppShell.vue'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', name: 'home', component: { template: '<div>Home</div>' } },
    { path: '/signin', name: 'signin', component: { template: '<div>Sign In</div>' } },
    { path: '/settings', name: 'settings', component: { template: '<div>Settings</div>' } },
  ],
})

describe('AppShell', () => {
  it('renders shell for non-auth routes', async () => {
    router.push('/')
    await router.isReady()
    
    const wrapper = mount(AppShell, {
      global: {
        plugins: [router],
        stubs: {
          AppNavbar: true,
          AppToolbar: true,
        },
      },
    })
    
    expect(wrapper.findComponent({ name: 'AppNavbar' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'AppToolbar' }).exists()).toBe(true)
  })

  it('hides shell for auth routes', async () => {
    router.push('/signin')
    await router.isReady()
    
    const wrapper = mount(AppShell, {
      global: {
        plugins: [router],
        stubs: {
          AppNavbar: true,
          AppToolbar: true,
        },
      },
    })
    
    expect(wrapper.findComponent({ name: 'AppNavbar' }).exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'AppToolbar' }).exists()).toBe(false)
  })

  it('shows back button for non-root, non-auth routes', async () => {
    router.push('/settings')
    await router.isReady()
    
    const wrapper = mount(AppShell, {
      global: {
        plugins: [router],
        stubs: {
          AppNavbar: {
            template: '<div><slot name="left" /></div>',
          },
          AppToolbar: true,
        },
      },
    })
    
    // Verify AppNavbar receives showBack=true
    expect(wrapper.findComponent({ name: 'AppNavbar' }).props('showBack')).toBe(true)
  })

  it('hides back button for root routes', async () => {
    router.push('/')
    await router.isReady()
    
    const wrapper = mount(AppShell, {
      global: {
        plugins: [router],
        stubs: {
          AppNavbar: {
            template: '<div><slot name="left" /></div>',
          },
          AppToolbar: true,
        },
      },
    })
    
    // Verify AppNavbar receives showBack=false
    expect(wrapper.findComponent({ name: 'AppNavbar' }).props('showBack')).toBe(false)
  })

  it('applies proper padding for content area', () => {
    const wrapper = mount(AppShell, {
      global: {
        stubs: {
          AppNavbar: true,
          AppToolbar: true,
        },
      },
    })
    
    const main = wrapper.find('.app-shell-main')
    expect(main.attributes('style')).toContain('padding-top: 44px')
    expect(main.attributes('style')).toContain('padding-bottom: 56px')
  })
})
```

### Test Checklist

- [ ] Renders shell for non-auth routes
- [ ] Hides shell for auth routes
- [ ] Shows back button for non-root, non-auth routes
- [ ] Hides back button for root routes
- [ ] Provides proper padding for navbar (44px top)
- [ ] Provides proper padding for toolbar (56px bottom)
- [ ] Respects safe area insets
- [ ] Renders AppNavbar with correct props
- [ ] Renders AppToolbar with correct props
- [ ] Handles route changes reactively
- [ ] Works with Vue Router

---

## Do / Don't

### ✅ DO

- Use `AppShell` as the primary layout component for all non-auth routes
- Nest `RouterView` or content directly inside `AppShell`
- Let `AppShell` handle auth route detection automatically
- Use `AppShell` with `AppPage` and `AppRoot` for complete layout

### ❌ DON'T

- Don't manually show/hide navbar or tabbar in views (let `AppShell` handle it)
- Don't use `AppShell` inside auth routes (it will be hidden anyway)
- Don't override shell padding (it's carefully calculated)
- Don't nest `AppShell` inside other `AppShell` components
- Don't manually manage back button visibility (use `AppNavbar`'s showBack prop)

---

## Examples

### Complete App Layout

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

### With Custom Content

```vue
<script setup lang="ts">
import { AppRoot, AppPage, AppShell } from '@/design/semantic'
</script>

<template>
  <AppRoot>
    <AppPage>
      <AppShell>
        <div class="custom-content">
          <h1>My Page</h1>
          <p>Content goes here</p>
        </div>
      </AppShell>
    </AppPage>
  </AppRoot>
</template>
```

### Auth Route (No Shell)

For auth routes, simply don't use `AppShell`:

```vue
<script setup lang="ts">
import { AppRoot, AppPage } from '@/design/semantic'
import AppNavbar from '@/design/semantic/AppNavbar.vue'
</script>

<template>
  <AppRoot>
    <AppPage>
      <!-- No AppShell here - full screen layout -->
      <AppNavbar title="Sign In" :show-back="true" />
      <main class="auth-content">
        <SignInForm />
      </main>
    </AppPage>
  </AppRoot>
</template>
```

---

## Common Issues

### Issue: Shell visible on auth route

**Symptom:** Navbar and tabbar appear on signin/signup pages

**Solution:** 
1. Ensure the route name is in `AUTH_ROUTES` set
2. Verify the route is correctly configured in Vue Router
3. Check that `AppShell` is being used correctly

### Issue: Content cut off by navbar/toolbar

**Symptom:** Content is hidden behind navbar or toolbar

**Solution:** 
1. Ensure content is inside `AppShell` (not outside)
2. Don't override the padding on `.app-shell-main`
3. Use `overflow-y-auto` on content containers

### Issue: Back button missing on non-root route

**Symptom:** No back button on a route that should have one

**Solution:**
1. Verify the route name is not in `ROOT_ROUTES` set
2. Ensure the route is not an auth route
3. Check that `AppNavbar` is receiving the `showBack` prop correctly

### Issue: Double navbar/toolbar

**Symptom:** Multiple navbars or toolbars appear

**Solution:**
1. Ensure only one `AppShell` is rendered
2. Don't manually add `AppNavbar` or `AppToolbar` inside `AppShell`
3. Check for nested `AppShell` components

---

## Migration Guide

If you were previously using separate `AppTopBar` and `AppTabBar` components:

### Before (Phase 10)

```vue
<template>
  <AppRoot>
    <f7Page no-navbar no-toolbar>
      <AppTopBar v-if="!isAuthRoute" />
      <main>
        <RouterView />
      </main>
      <AppTabBar v-if="!isAuthRoute" />
    </f7Page>
  </AppRoot>
</template>
```

### After (Phase 11)

```vue
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

The migration simplifies the layout structure and moves the auth route logic into `AppShell`.

---

## See Also

- [AppRoot](./AppRoot.md) - Framework7 app initialization
- [AppPage](./AppPage.md) - Page container
- [AppNavbar](./AppNavbar.md) - Navigation bar
- [AppToolbar](./AppToolbar.md) - Bottom toolbar/tabbar
- [Frontend Architecture Contract](../../../docs/internal/frontend-architecture-contract.md)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-11 | Initial documentation |
