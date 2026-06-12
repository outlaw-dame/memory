# Semantic Components

**Version:** 1.0.0  
**Last Updated:** 2026-06-11  

This directory contains semantic component wrappers for Framework7 primitives. These components provide a consistent, platform-adaptive interface while abstracting away Framework7-specific details.

## Purpose

The semantic layer serves several critical purposes:

1. **Architecture Enforcement** - Raw Framework7 imports are ONLY allowed in this directory
2. **Platform Adaptation** - Components automatically adapt to iOS, Material, and desktop environments
3. **Accessibility** - Built-in accessibility features and requirements
4. **Consistency** - Uniform styling and behavior across the application
5. **Testability** - Components are designed to be easily tested in isolation

## Import Rules

### ✅ ALLOWED in this directory:
- `framework7-vue` - Raw Framework7 components
- `@/platform/*` - Platform utilities
- `@/design/icons/*` - Icon registry
- `@/composables/*` - Shared composables

### ❌ FORBIDDEN in this directory:
- `konsta` or `konsta/vue` - Konsta UI is completely forbidden
- Direct imports from other semantic components (use relative imports)

## Usage Guidelines

### For Views and Features

```vue
<!-- CORRECT -->
<script setup>
import { AppRoot, AppShell, AppPage, AppNavbar } from '@/design/semantic'
</script>

<template>
  <AppRoot>
    <AppPage>
      <AppShell>
        <AppNavbar title="My Page" />
        <main>
          <!-- Content -->
        </main>
      </AppShell>
    </AppPage>
  </AppRoot>
</template>

<!-- FORBIDDEN -->
<script setup>
import { f7App, f7Page, f7Navbar } from 'framework7-vue'  // ❌ Never do this!
</script>
```

### For Components

```vue
<!-- CORRECT -->
<script setup>
import { AppList, AppListItem } from '@/design/semantic'
</script>

<template>
  <AppList>
    <AppListItem v-for="item in items" :key="item.id" :title="item.title" />
  </AppList>
</template>

<!-- FORBIDDEN -->
<script setup>
import { f7List, f7ListItem } from 'framework7-vue'  // ❌ Never do this!
</script>
```

## Component Categories

### Shell Components
- `AppRoot.vue` - Framework7 app initialization
- `AppShell.vue` - Shell layout (navbar + content + tabbar)
- `AppPage.vue` - Page container
- `AppNavbar.vue` - Navigation bar
- `AppToolbar.vue` - Bottom toolbar/tabbar

### List Components
- `AppList.vue` - List container
- `AppListItem.vue` - List item
- `AppGroupedList.vue` - Grouped list with headers
- `AppVirtualList.vue` - Virtualized list for performance

### Form Components
- `AppSwitch.vue` - Toggle switch (wraps f7Toggle)
- `AppRadioList.vue` - Radio button group
- `AppCheckboxList.vue` - Checkbox group
- `AppSlider.vue` - Range slider

### Action Components
- `AppDestructiveAction.vue` - Destructive actions with confirmation

### Future Components (Not Yet Implemented)
- `AppSheet.vue` - Bottom sheet (migrate from design/components)
- `AppActionsSheet.vue` - Action sheet (migrate from design/components)
- `AppDialog.vue` - Dialog/modal
- `AppPopover.vue` - Popover
- `AppToast.vue` - Toast notifications
- `AppSearchBar.vue` - Search input (migrate from design/components)
- `AppComposer.vue` - Content composer (migrate from design/components)
- `AppTextField.vue` - Text input (migrate from design/components)
- `AppTextArea.vue` - Multi-line text input (migrate from design/components)
- `AppMediaViewer.vue` - Full-screen media viewer
- `AppPullToRefresh.vue` - Pull-to-refresh (migrate from design/components)

## Component Lifecycle

### Adding a New Component

1. **Check if it already exists** - Review existing semantic components
2. **Propose the component** - Create a design document explaining:
   - Purpose and use cases
   - API (props, events, slots)
   - Platform behavior differences
   - Accessibility requirements
   - Testing requirements
3. **Get approval** - PR review with architecture label
4. **Implement the component** - Following these guidelines:
   - TypeScript types for all props
   - JSDoc comments for documentation
   - Platform adaptation logic
   - Accessibility attributes
   - Unit tests
5. **Update exports** - Add to `index.ts`
6. **Document the component** - Add individual `.md` file

### Modifying an Existing Component

1. **Review impact** - Check all usages of the component
2. **Maintain backward compatibility** - Or document breaking changes
3. **Update tests** - Ensure all tests pass
4. **Update documentation** - Update component `.md` file

### Deprecating a Component

1. **Document alternative** - Provide migration path
2. **Add deprecation warning** - Console warning in development
3. **Update all usages** - Migrate to new component
4. **Remove in next major version** - After migration period

## Platform Adaptation

All semantic components automatically adapt to the platform using `useNativeUiProfile()`:

```ts
const nativeUiProfile = useNativeUiProfile()

// Platform detection
nativeUiProfile.platform // 'ios' | 'android' | 'desktop'

// Theme detection
nativeUiProfile.theme // 'ios' | 'md' | 'auto'

// Motion preferences
nativeUiProfile.prefersReducedMotion // boolean

// Touch capabilities
nativeUiProfile.isTouchPrimary // boolean
```

Components should:
- Use platform-appropriate icons (e.g., `chevron_back` for iOS, `arrow_back` for MD)
- Respect `prefersReducedMotion`
- Adapt styling for platform differences
- Handle safe area insets where applicable

## Accessibility Requirements

All semantic components MUST:

1. **Have proper ARIA roles** - Use semantic HTML elements or add ARIA attributes
2. **Support keyboard navigation** - All interactive elements must be keyboard-accessible
3. **Have accessible labels** - Every interactive element must have a text label or `aria-label`
4. **Respect focus order** - Tab order must be logical
5. **Provide focus indicators** - Focus states must be visible
6. **Announce state changes** - Screen readers must be informed of dynamic changes
7. **Meet color contrast** - Minimum 4.5:1 for text, 3:1 for large text

## Testing Requirements

All semantic components MUST have:

1. **Unit tests** - Test props, events, and rendering
2. **Platform tests** - Test iOS, MD, and desktop behavior (if applicable)
3. **Accessibility tests** - Test ARIA attributes and keyboard support
4. **Edge case tests** - Test null/undefined props, error states, etc.

Run tests with:
```bash
bun run test:unit
```

## File Structure

```
frontend/src/design/semantic/
├── README.md                    # This file
├── index.ts                     # Barrel export
├── AppRoot.vue                  # Shell: Framework7 app
├── AppRoot.md                   # Shell: AppRoot documentation
├── AppShell.vue                # Shell: App shell
├── AppShell.md                 # Shell: AppShell documentation
├── AppPage.vue                  # Shell: Page container
├── AppPage.md                   # Shell: AppPage documentation
├── AppNavbar.vue                # Navigation: Navbar
├── AppNavbar.md                 # Navigation: AppNavbar documentation
├── AppToolbar.vue               # Navigation: Toolbar
├── AppToolbar.md                # Navigation: AppToolbar documentation
├── AppList.vue                  # Lists: List container
├── AppList.md                   # Lists: AppList documentation
├── AppListItem.vue              # Lists: List item
├── AppListItem.md               # Lists: AppListItem documentation
├── AppGroupedList.vue           # Lists: Grouped list
├── AppGroupedList.md            # Lists: AppGroupedList documentation
├── AppVirtualList.vue           # Lists: Virtual list
├── AppVirtualList.md            # Lists: AppVirtualList documentation
├── AppSwitch.vue                # Forms: Toggle switch
├── AppSwitch.md                 # Forms: AppSwitch documentation
├── AppRadioList.vue             # Forms: Radio list
├── AppRadioList.md              # Forms: AppRadioList documentation
├── AppCheckboxList.vue          # Forms: Checkbox list
├── AppCheckboxList.md           # Forms: AppCheckboxList documentation
├── AppSlider.vue                # Forms: Range slider
├── AppSlider.md                 # Forms: AppSlider documentation
└── AppDestructiveAction.vue     # Actions: Destructive action
└── AppDestructiveAction.md      # Actions: AppDestructiveAction documentation
```

## Best Practices

### Component Design

1. **Single Responsibility** - Each component should do one thing well
2. **Composable** - Components should be easily combined
3. **Reusable** - Components should be usable in multiple contexts
4. **Testable** - Components should be easy to test in isolation
5. **Maintainable** - Components should be easy to understand and modify

### Props Design

1. **Use TypeScript interfaces** - Define props with proper types
2. **Provide defaults** - Use `withDefaults()` for optional props
3. **Document props** - JSDoc comments for all props
4. **Keep it simple** - Avoid complex prop dependencies
5. **Use events for actions** - Prefer events over callback props

### Styling

1. **Use scoped styles** - `<style scoped>` for component styles
2. **Use CSS variables** - For theming and platform adaptation
3. **Avoid deep selectors** - Use `:deep()` sparingly
4. **Respect safe areas** - Use `env(safe-area-inset-*)` where needed
5. **Respect reduced motion** - Check `prefers-reduced-motion`

## Performance Considerations

1. **Avoid heavy computations in templates** - Use computed properties
2. **Use v-once for static content** - Reduces reactivity overhead
3. **Lazy load non-critical components** - Use dynamic imports
4. **Virtualize large lists** - Use AppVirtualList for long lists
5. **Memoize expensive computations** - Use memoization for complex calculations

## Security Considerations

1. **Sanitize user content** - Never render raw user HTML
2. **Escape dynamic content** - Use text interpolation, not innerHTML
3. **Validate props** - Use TypeScript types and runtime validation
4. **Avoid XSS vulnerabilities** - Never use `v-html` with user content
5. **Respect content security** - Don't expose sensitive data in components

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-11 | Initial release - Phase 11 |
