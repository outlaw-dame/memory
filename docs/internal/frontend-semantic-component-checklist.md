# Frontend Semantic Component Checklist

**Version:** 1.0.0  
**Last Updated:** 2026-06-11  
**Status:** ACTIVE - Phase 11  

This document provides a comprehensive checklist for all semantic components. Every semantic primitive must be documented here with its purpose, allowed props, platform behavior, accessibility requirements, and testing expectations.

---

## Table of Contents

1. [Shell Components](#shell-components)
2. [Navigation Components](#navigation-components)
3. [List Components](#list-components)
4. [Form Components](#form-components)
5. [Overlay Components](#overlay-components)
6. [Media Components](#media-components)
7. [Input Components](#input-components)
8. [Feedback Components](#feedback-components)

---

## Shell Components

### AppRoot

**Status:** ✅ Implemented  
**Location:** `@/design/semantic/AppRoot.vue`  
**Framework7 Backing:** `f7App`, `f7Views`, `f7View`  

#### Purpose
- Initialize Framework7 application
- Provide Framework7 context to all child components
- Handle theme selection (iOS/MD)
- Configure reduced motion preferences
- Manage swipe-back and panel gestures

#### Allowed Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `theme` | `'ios' \| 'md' \| 'auto'` | `'auto'` | Explicit theme override (useful for testing) |

#### Platform Behavior
- iOS: Uses iOS theme with swipe-back gestures
- MD: Uses Material theme
- Auto: Detects platform automatically
- Respects `prefers-reduced-motion` preference

#### Accessibility Rules
- N/A (container component)

#### Testing Expectations
- [ ] Renders f7App with correct theme
- [ ] Provides f7app instance via provide/inject
- [ ] Provides nativeUiProfile via provide/inject
- [ ] Respects reduced motion media query
- [ ] Configures swipe-back for touch-primary devices
- [ ] Configures panel swipe for touch-primary devices

---

### AppPage

**Status:** ✅ Implemented  
**Location:** `@/design/semantic/AppPage.vue`  
**Framework7 Backing:** `f7Page`  

#### Purpose
- Provide page container with consistent styling
- Handle page-level configuration
- Ensure proper layout and overflow behavior

#### Allowed Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `noNavbar` | `boolean` | `true` | Hide navbar |
| `noToolbar` | `boolean` | `true` | Hide toolbar |
| `noSwipeback` | `boolean` | `true` | Disable swipe-back |

#### Platform Behavior
- Consistent across all platforms
- Respects Framework7 page configuration

#### Accessibility Rules
- Ensures page content is accessible via keyboard
- Proper focus management

#### Testing Expectations
- [ ] Renders f7Page with correct props
- [ ] Applies consistent class names
- [ ] Handles no-navbar/toolbar/swipeback props
- [ ] Renders children correctly

---

### AppShell

**Status:** ✅ Implemented  
**Location:** `@/design/semantic/AppShell.vue`  
**Framework7 Backing:** Custom (AppNavbar + AppToolbar)  

#### Purpose
- Provide consistent shell layout (navbar + content + tabbar)
- Handle auth route detection (no shell for auth)
- Manage back button visibility
- Provide proper spacing for safe areas

#### Allowed Props
- None (uses internal route detection)

#### Platform Behavior
- Shows navbar and tabbar for non-auth routes
- Hides shell for auth routes (`signin`, `signup`, `welcome`, `experience`, `auth-callback`)
- Shows back button for non-root routes
- Respects safe area insets

#### Accessibility Rules
- Main content is keyboard-accessible
- Focus order: navbar → content → tabbar

#### Testing Expectations
- [ ] Renders shell for non-auth routes
- [ ] Hides shell for auth routes
- [ ] Shows back button for non-root, non-auth routes
- [ ] Provides proper padding for navbar and tabbar
- [ ] Respects safe area insets

---

## Navigation Components

### AppNavbar

**Status:** ✅ Implemented  
**Location:** `@/design/semantic/AppNavbar.vue`  
**Framework7 Backing:** `f7Navbar`, `f7NavLeft`, `f7NavTitle`, `f7Link`  

#### Purpose
- Provide consistent navigation bar across all pages
- Handle back button with platform-appropriate icon
- Display route-specific titles
- Support large title hiding on scroll

#### Allowed Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showBack` | `boolean` | `false` | Show back button |
| `title` | `string` | `undefined` | Explicit title text |
| `titleKey` | `string` | `undefined` | i18n translation key for title |

#### Emitted Events

| Event | Description |
|-------|-------------|
| `back` | Emitted when back button is clicked |

#### Platform Behavior
- iOS: Uses `chevron_back` icon
- MD/Android: Uses `arrow_back` icon
- Home route: Hides title when large title is visible (IntersectionObserver)
- Other routes: Shows title from route.meta.titleKey or defaults to 'app.name'

#### Accessibility Rules
- [ ] Back button has accessible label
- [ ] Title is properly announced to screen readers
- [ ] Navbar has proper role and ARIA attributes
- [ ] Focusable elements have visible focus indicators

#### Testing Expectations
- [ ] Renders f7Navbar with correct props
- [ ] Shows back button when showBack is true
- [ ] Uses correct icon based on platform theme
- [ ] Displays correct title based on props and route
- [ ] Emits 'back' event when back button clicked
- [ ] Respects reduced motion preferences
- [ ] Matches existing styling from Konsta migration

---

### AppToolbar

**Status:** ✅ Implemented (replaces AppTabBar)  
**Location:** `@/design/semantic/AppToolbar.vue`  
**Framework7 Backing:** `f7Toolbar`, `f7Link`  

#### Purpose
- Provide bottom tab navigation
- Handle tab switching with haptic feedback
- Display notification badges
- Adapt icons to platform style

#### Allowed Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `position` | `'top' \| 'bottom'` | `'bottom'` | Toolbar position |

#### Platform Behavior
- Hides for auth routes
- Shows for all other routes
- Uses AppIcon component for icons
- Displays filled icon variants when tab is active
- Supports haptic feedback on tab selection

#### Navigation Items

Defined internally (computed from i18n):

| Name | Route | Icon (inactive) | Icon (active) |
|------|-------|----------------|---------------|
| home | `/` | `home` | `home-filled` |
| explore | `/explore` | `explore` | `explore-filled` |
| messages | `/messages` | `messages` | `messages-filled` |
| notifications | `/notifications` | `notifications` | `notifications-filled` |
| profile | `/profile` | `profile` | `profile-filled` |

#### Accessibility Rules
- [ ] Each tab has accessible label
- [ ] Active tab is announced to screen readers
- [ ] Focusable via keyboard
- [ ] Proper ARIA attributes for navigation

#### Testing Expectations
- [ ] Renders f7Toolbar with correct props
- [ ] Hides for auth routes
- [ ] Shows for non-auth routes
- [ ] Renders all navigation items
- [ ] Shows correct icon (filled/outline) based on active state
- [ ] Displays notification badge for notifications tab
- [ ] Navigates to correct route on click
- [ ] Triggers haptic feedback on selection
- [ ] Respects safe area insets

---

## List Components

### AppList

**Status:** ✅ Implemented  
**Location:** `@/design/semantic/AppList.vue`  
**Framework7 Backing:** `f7List`  

#### Purpose
- Consistent list container styling
- Proper spacing and dividers
- Platform-adaptive appearance

#### Allowed Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `dividers` | `boolean` | `true` | Show dividers between items |
| `inset` | `boolean` | `false` | Inset list margins |
| `mediaList` | `boolean` | `false` | Media list styling |

#### Platform Behavior
- iOS: Uses iOS-style dividers
- MD: Uses Material-style dividers

#### Accessibility Rules
- [ ] List has proper role attribute
- [ ] Items are properly grouped

#### Testing Expectations
- [ ] Renders f7List with correct props
- [ ] Applies correct class names
- [ ] Renders children correctly
- [ ] Respects divider configuration

---

### AppListItem

**Status:** ✅ Implemented  
**Location:** `@/design/semantic/AppListItem.vue`  
**Framework7 Backing:** `f7ListItem`, `f7ListButton`, `f7Link`  

#### Purpose
- Consistent list item styling
- Support for various item types (button, link, label, etc.)
- Platform-adaptive appearance

#### Allowed Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | `undefined` | Item title |
| `subtitle` | `string` | `undefined` | Item subtitle |
| `text` | `string` | `undefined` | Item text content |
| `media` | `string` | `undefined` | Media content (icon, image) |
| `after` | `string` | `undefined` | After content |
| `badge` | `string \| number` | `undefined` | Badge content |
| `chevron` | `boolean` | `false` | Show chevron indicator |
| `divider` | `boolean` | `false` | Show divider |
| `link` | `boolean` | `false` | Render as link |
| `button` | `boolean` | `false` | Render as button |
| `to` | `string \| RouteLocation` | `undefined` | Navigation target (if link) |

#### Platform Behavior
- Consistent across platforms with Framework7 styling

#### Accessibility Rules
- [ ] All interactive items have accessible labels
- [ ] Buttons have proper type attribute
- [ ] Links have proper href or to prop

#### Testing Expectations
- [ ] Renders appropriate element based on props
- [ ] Displays title, subtitle, text correctly
- [ ] Shows media content when provided
- [ ] Shows badge when provided
- [ ] Navigates when to prop is provided
- [ ] Emits click event when button

---

### AppGroupedList

**Status:** ✅ Implemented  
**Location:** `@/design/semantic/AppGroupedList.vue`  
**Framework7 Backing:** `f7ListGroup`  

#### Purpose
- Group related list items
- Provide section headers
- Consistent spacing

#### Allowed Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | `undefined` | Group title |

#### Platform Behavior
- Consistent across platforms

#### Accessibility Rules
- [ ] Group has proper role and ARIA attributes

#### Testing Expectations
- [ ] Renders f7ListGroup with correct props
- [ ] Displays group title
- [ ] Renders children correctly

---

## Form Components

### AppSwitch

**Status:** ✅ Implemented  
**Location:** `@/design/semantic/AppSwitch.vue`  
**Framework7 Backing:** `f7Toggle`  

#### Purpose
- Consistent toggle switch styling
- Platform-adaptive appearance
- Accessible form control

#### Allowed Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `boolean` | `false` | v-model binding |
| `disabled` | `boolean` | `false` | Disable interaction |
| `readonly` | `boolean` | `false` | Read-only mode |
| `name` | `string` | `undefined` | Form name |
| `id` | `string` | `undefined` | Element ID |

#### Platform Behavior
- iOS: Uses iOS-style toggle
- MD: Uses Material-style toggle

#### Accessibility Rules
- [ ] Has proper role="switch" attribute
- [ ] Has associated label (via aria-labelledby or aria-label)
- [ ] Keyboard-accessible (Space to toggle)
- [ ] Screen reader announces state changes

#### Testing Expectations
- [ ] Renders f7Toggle with correct props
- [ ] Emits update:modelValue event on change
- [ ] Respects disabled state
- [ ] Respects readonly state
- [ ] Has proper accessibility attributes

---

### AppRadioList

**Status:** ✅ Implemented  
**Location:** `@/design/semantic/AppRadioList.vue`  
**Framework7 Backing:** `f7List`, `f7ListItem`, `f7Radio`  

#### Purpose
- Radio button group with consistent styling
- Single selection from multiple options
- Platform-adaptive appearance

#### Allowed Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `string` | `undefined` | v-model binding (selected value) |
| `options` | `AppRadioOption[]` | `[]` | Radio options |
| `disabled` | `boolean` | `false` | Disable all options |

#### Types

```ts
export interface AppRadioOption {
  value: string
  label: string
  disabled?: boolean
  checked?: boolean
}
```

#### Platform Behavior
- Consistent with Framework7 radio styling

#### Accessibility Rules
- [ ] Radio group has proper role attribute
- [ ] Each radio has proper role and aria attributes
- [ ] Group has legend or label
- [ ] Keyboard navigation works (Arrow keys)

#### Testing Expectations
- [ ] Renders list of radio options
- [ ] Single selection enforced
- [ ] Emits update:modelValue event on selection
- [ ] Respects disabled state for individual options
- [ ] Has proper accessibility attributes

---

### AppCheckboxList

**Status:** ✅ Implemented  
**Location:** `@/design/semantic/AppCheckboxList.vue`  
**Framework7 Backing:** `f7List`, `f7ListItem`, `f7Checkbox`  

#### Purpose
- Checkbox group with consistent styling
- Multiple selection from options
- Platform-adaptive appearance

#### Allowed Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `string[]` | `[]` | v-model binding (selected values) |
| `options` | `AppCheckboxOption[]` | `[]` | Checkbox options |
| `disabled` | `boolean` | `false` | Disable all options |

#### Types

```ts
export interface AppCheckboxOption {
  value: string
  label: string
  disabled?: boolean
  checked?: boolean
}
```

#### Platform Behavior
- Consistent with Framework7 checkbox styling

#### Accessibility Rules
- [ ] Each checkbox has proper role and aria attributes
- [ ] Keyboard navigation works (Tab, Space)
- [ ] Screen reader announces state

#### Testing Expectations
- [ ] Renders list of checkbox options
- [ ] Multiple selection supported
- [ ] Emits update:modelValue event on change
- [ ] Respects disabled state
- [ ] Has proper accessibility attributes

---

### AppSlider

**Status:** ✅ Implemented  
**Location:** `@/design/semantic/AppSlider.vue`  
**Framework7 Backing:** `f7Range`  

#### Purpose
- Range input with consistent styling
- Platform-adaptive appearance
- Accessible slider control

#### Allowed Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `number` | `0` | v-model binding |
| `min` | `number` | `0` | Minimum value |
| `max` | `number` | `100` | Maximum value |
| `step` | `number` | `1` | Step increment |
| `disabled` | `boolean` | `false` | Disable interaction |
| `label` | `string` | `undefined` | Accessible label |

#### Platform Behavior
- iOS: Uses iOS-style range input
- MD: Uses Material-style range input

#### Accessibility Rules
- [ ] Has proper role and ARIA attributes
- [ ] Has associated label
- [ ] Keyboard-accessible (Arrow keys)
- [ ] Screen reader announces value changes

#### Testing Expectations
- [ ] Renders f7Range with correct props
- [ ] Emits update:modelValue event on change
- [ ] Respects min/max/step constraints
- [ ] Respects disabled state
- [ ] Has proper accessibility attributes

---

## Overlay Components

### AppSheet

**Status:** ⚠️ Exists in design/components (needs migration)  
**Location:** `@/design/components/AppSheet.vue` → `@/design/semantic/AppSheet.vue` (future)  
**Framework7 Backing:** `f7Sheet`  

#### Purpose
- Bottom sheet overlay
- Modal-like behavior
- Platform-adaptive appearance

#### Allowed Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `boolean` | `false` | v-model: visible state |
| `title` | `string` | `undefined` | Sheet title |
| `swipeToClose` | `boolean` | `true` | Allow swipe to close |
| `backdrop` | `boolean` | `true` | Show backdrop |
| `closeOnBackdrop` | `boolean` | `true` | Close on backdrop click |

#### Platform Behavior
- iOS: Uses iOS-style bottom sheet
- MD: Uses Material-style bottom sheet
- Respects safe area insets

#### Accessibility Rules
- [ ] Has proper role="dialog" or role="region"
- [ ] Focus is trapped within sheet
- [ ] Focus returns to trigger on close
- [ ] Escape key closes sheet (desktop)
- [ ] Backdrop click closes sheet (mobile)

#### Testing Expectations
- [ ] Opens and closes correctly
- [ ] Emits update:modelValue event on close
- [ ] Swipe to close works on touch devices
- [ ] Backdrop click closes when enabled
- [ ] Focus management works correctly
- [ ] Respects safe area insets

---

### AppActionsSheet

**Status:** ⚠️ Exists in design/components (needs migration)  
**Location:** `@/design/components/AppActionsSheet.vue` → `@/design/semantic/AppActionsSheet.vue` (future)  
**Framework7 Backing:** `f7Actions`, `f7ActionsGroup`, `f7ActionsButton`, `f7ActionsLabel`  

#### Purpose
- Action sheet for important actions
- Platform-adaptive appearance
- Consistent styling

#### Allowed Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `boolean` | `false` | v-model: visible state |
| `actions` | `ActionGroup[]` | `[]` | Action groups |
| `title` | `string` | `undefined` | Sheet title |

#### Types

```ts
export interface ActionButton {
  text: string
  icon?: AppIconName
  color?: 'red' | 'orange' | 'blue' | 'green' | 'default'
  action?: () => void | Promise<void>
  bold?: boolean
}

export interface ActionGroup {
  label?: string
  buttons: ActionButton[]
}
```

#### Platform Behavior
- iOS: Uses iOS-style action sheet
- MD: Uses Material-style action sheet

#### Accessibility Rules
- [ ] Each button has accessible label
- [ ] Keyboard navigation works
- [ ] Focus management works correctly

#### Testing Expectations
- [ ] Opens and closes correctly
- [ ] Renders action groups and buttons
- [ ] Calls action handlers on button click
- [ ] Emits update:modelValue on close
- [ ] Focus management works correctly

---

## Media Components

### AppMediaViewer

**Status:** ⏳ Not yet implemented  
**Location:** `@/design/semantic/AppMediaViewer.vue` (future)  
**Framework7 Backing:** Custom + Framework7 Photo Browser (future)  

#### Purpose
- Full-screen media viewer
- Support for images, videos, GIFs
- Gesture-based navigation
- Platform-adaptive behavior

#### Required Features
- Zoom/pan gestures
- Swipe between media items
- Dismiss with swipe down
- Safe area respect
- Reduced motion support

#### Accessibility Rules
- [ ] All media has alt text
- [ ] Keyboard navigation between items
- [ ] Focus indicators visible
- [ ] Screen reader support

---

## Input Components

### AppSearchBar

**Status:** ⚠️ Exists in design/components (needs migration)  
**Location:** `@/design/components/AppSearchBar.vue` → `@/design/semantic/AppSearchBar.vue` (future)  
**Framework7 Backing:** Framework7 Searchbar  

#### Purpose
- Consistent search input across app
- Native keyboard optimization
- Platform-adaptive styling

#### Required Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `string` | `''` | v-model: search query |
| `placeholder` | `string` | `'Search'` | Placeholder text |
| `disabled` | `boolean` | `false` | Disable input |

#### Required HTML Attributes

| Attribute | Value | Purpose |
|-----------|-------|---------|
| `type` | `search` | Proper input semantics |
| `inputmode` | `search` | Optimize mobile keyboard |
| `enterkeyhint` | `search` | Optimize return key |
| `autocapitalize` | `none` | No auto-capitalization |
| `spellcheck` | `false` | Disable spellcheck |
| `autocomplete` | `off` | Disable autocomplete |

#### Platform Behavior
- iOS: Uses iOS-style search input
- MD: Uses Material-style search input

#### Accessibility Rules
- [ ] Has associated label
- [ ] Clear button has accessible label
- [ ] Submit button has accessible label
- [ ] Focus visible indicator

#### Testing Expectations
- [ ] Renders with correct type/inputmode/enterkeyhint
- [ ] Emits update:modelValue on input
- [ ] Has proper accessibility attributes
- [ ] Respects disabled state
- [ ] Clears input when clear button clicked

---

### AppTextField

**Status:** ⚠️ Exists in design/components (needs migration)  
**Location:** `@/design/components/AppTextField.vue` → `@/design/semantic/AppTextField.vue` (future)  
**Framework7 Backing:** Custom  

#### Purpose
- Consistent text input
- Native keyboard optimization
- Platform-adaptive styling

#### Required Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `string` | `''` | v-model: input value |
| `type` | `InputType` | `'text'` | Input type |
| `label` | `string` | `undefined` | Accessible label |
| `placeholder` | `string` | `''` | Placeholder text |
| `disabled` | `boolean` | `false` | Disable input |
| `readonly` | `boolean` | `false` | Read-only |

#### Types

```ts
type InputType = 'text' | 'email' | 'password' | 'tel' | 'url' | 'number' | 'search'
```

#### Keyboard Configuration by Type

| Type | inputmode | enterkeyhint | autocomplete | spellcheck | autocapitalize |
|------|-----------|--------------|--------------|------------|----------------|
| text | text | default | off | true | sentences |
| email | email | next | email | false | none |
| password | text | done | current-password | false | off |
| tel | tel | next | tel | false | none |
| url | url | go | url | false | none |
| number | numeric | next | off | false | none |
| search | search | search | off | false | none |

#### Accessibility Rules
- [ ] Has associated label
- [ ] Proper type attribute
- [ ] Focus visible indicator
- [ ] Error state announced

#### Testing Expectations
- [ ] Renders with correct type and attributes
- [ ] Emits update:modelValue on input
- [ ] Has proper accessibility attributes
- [ ] Respects disabled/readonly states

---

### AppTextArea

**Status:** ⚠️ Exists in design/components (needs migration)  
**Location:** `@/design/components/AppTextArea.vue` → `@/design/semantic/AppTextArea.vue` (future)  
**Framework7 Backing:** Custom  

#### Purpose
- Consistent multi-line text input
- Native keyboard optimization
- Platform-adaptive styling

#### Required Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `string` | `''` | v-model: input value |
| `label` | `string` | `undefined` | Accessible label |
| `placeholder` | `string` | `''` | Placeholder text |
| `disabled` | `boolean` | `false` | Disable input |
| `readonly` | `boolean` | `false` | Read-only |
| `rows` | `number` | `4` | Visible rows |
| `maxlength` | `number` | `undefined` | Maximum length |

#### Required HTML Attributes

| Attribute | Value | Purpose |
|-----------|-------|---------|
| `inputmode` | `text` | Text input |
| `enterkeyhint` | `default` | Default return key |
| `autocapitalize` | `sentences` | Sentence capitalization |
| `spellcheck` | `true` | Enable spellcheck |
| `autocomplete` | `off` | Disable autocomplete |

#### Accessibility Rules
- [ ] Has associated label
- [ ] Resizes appropriately
- [ ] Focus visible indicator

#### Testing Expectations
- [ ] Renders with correct attributes
- [ ] Emits update:modelValue on input
- [ ] Has proper accessibility attributes
- [ ] Respects disabled/readonly states
- [ ] Paste works correctly

---

### AppComposer

**Status:** ⚠️ Exists in design/components (needs migration)  
**Location:** `@/design/components/AppComposer.vue` → `@/design/semantic/AppComposer.vue` (future)  
**Framework7 Backing:** Custom  

#### Purpose
- Content creation composer
- Rich text support
- Emoji/unicode preservation
- Platform-adaptive behavior

#### Required Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `modelValue` | `string` | `''` | v-model: content |
| `placeholder` | `string` | `'Type a message...'` | Placeholder text |
| `disabled` | `boolean` | `false` | Disable input |
| `valid` | `boolean` | `true` | Validation state |

#### Required HTML Attributes

| Attribute | Value | Purpose |
|-----------|-------|---------|
| `inputmode` | `text` | Text input |
| `enterkeyhint` | `send` | Send return key |
| `autocapitalize` | `sentences` | Sentence capitalization |
| `spellcheck` | `true` | Enable spellcheck |
| `autocomplete` | `off` | Disable autocomplete |

#### Emoji and Unicode Requirements
- [ ] Preserves all emoji characters
- [ ] Does not strip or alter unicode
- [ ] Supports emoji keyboard access
- [ ] Renders emoji correctly

#### Accessibility Rules
- [ ] Has associated label
- [ ] Send button has accessible label
- [ ] Focus visible indicator
- [ ] Disabled state announced

#### Testing Expectations
- [ ] Renders with correct attributes
- [ ] Emits update:modelValue on input
- [ ] Send button disabled when not valid
- [ ] Send button enabled when valid
- [ ] Paste works correctly
- [ ] Emoji input works correctly
- [ ] Unicode preserved on input and output

---

## Feedback Components

### AppPullToRefresh

**Status:** ✅ Implemented  
**Location:** `@/design/components/AppPullToRefresh.vue` → `@/design/semantic/AppPullToRefresh.vue` (future)  
**Framework7 Backing:** Framework7 ptr (Pull to Refresh)  

#### Purpose
- Pull-to-refresh gesture support
- Platform-adaptive behavior
- Visual feedback during refresh

#### Allowed Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `refreshing` | `boolean` | `false` | Currently refreshing state |
| `disabled` | `boolean` | `false` | Disable pull-to-refresh |
| `onRefresh` | `() => Promise<void>` | `undefined` | Refresh callback |

#### Platform Behavior
- Touch devices: Pull gesture triggers refresh
- Non-touch devices: Provide alternative refresh mechanism
- Respects reduced motion preferences

#### Accessibility Rules
- [ ] Provides non-gesture alternative
- [ ] Announces refresh state
- [ ] Focusable refresh button for non-touch

#### Testing Expectations
- [ ] Triggers onRefresh callback on pull
- [ ] Shows refreshing state correctly
- [ ] Respects disabled state
- [ ] Provides fallback for non-touch devices

---

### AppDestructiveAction

**Status:** ✅ Implemented  
**Location:** `@/design/semantic/AppDestructiveAction.vue`  
**Framework7 Backing:** Custom (f7Button, f7ListItem, etc.)  

#### Purpose
- Consistent destructive action styling
- Platform-appropriate danger color
- Confirmation handling
- Accessible destructive UI

#### Allowed Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `text` | `string` | `''` | Action text |
| `dangerLevel` | `DangerLevel` | `'low'` | Severity level |
| `confirmText` | `string` | `'Are you sure?'` | Confirmation text |
| `confirmLabel` | `string` | `'Confirm'` | Confirm button label |
| `cancelLabel` | `string` | `'Cancel'` | Cancel button label |
| `onAction` | `() => void \| Promise<void>` | `undefined` | Action callback |

#### Types

```ts
export type DangerLevel = 'low' | 'medium' | 'high'
```

#### Platform Behavior
- iOS: Uses iOS-style destructive buttons (red)
- MD: Uses Material-style destructive buttons

#### Accessibility Rules
- [ ] Destructive nature announced to screen readers
- [ ] Confirmation dialog has proper focus management
- [ ] Buttons have clear labels

#### Testing Expectations
- [ ] Renders with correct danger level styling
- [ ] Shows confirmation dialog when clicked
- [ ] Calls onAction when confirmed
- [ ] Cancels when not confirmed
- [ ] Has proper accessibility attributes

---

## Migration Status Summary

| Component | Status | Location | Action Needed |
|-----------|--------|----------|---------------|
| AppRoot | ✅ | design/semantic | None |
| AppPage | ✅ | design/semantic | None |
| AppShell | ✅ | design/semantic | None |
| AppNavbar | ✅ | design/semantic | None |
| AppToolbar | ✅ | design/semantic | None |
| AppList | ✅ | design/semantic | None |
| AppListItem | ✅ | design/semantic | None |
| AppGroupedList | ✅ | design/semantic | None |
| AppSwitch | ✅ | design/semantic | None |
| AppRadioList | ✅ | design/semantic | None |
| AppCheckboxList | ✅ | design/semantic | None |
| AppSlider | ✅ | design/semantic | None |
| AppVirtualList | ✅ | design/semantic | None |
| AppDestructiveAction | ✅ | design/semantic | None |
| AppPullToRefresh | ⚠️ | design/components | Migrate to semantic |
| AppSheet | ⚠️ | design/components | Migrate to semantic |
| AppActionsSheet | ⚠️ | design/components | Migrate to semantic |
| AppSearchBar | ⚠️ | design/components | Migrate to semantic |
| AppTextField | ⚠️ | design/components | Migrate to semantic |
| AppTextArea | ⚠️ | design/components | Migrate to semantic |
| AppComposer | ⚠️ | design/components | Migrate to semantic |
| AppMediaViewer | ⏳ | Not implemented | Implement in semantic |

---

## Component Quality Checklist

For every semantic component, verify:

### Code Quality
- [ ] TypeScript types defined
- [ ] Props documentation complete
- [ ] Event documentation complete
- [ ] No direct framework7-vue imports outside semantic/
- [ ] No console.log statements
- [ ] Error handling for edge cases

### Platform Adaptation
- [ ] iOS theme support
- [ ] Material theme support
- [ ] Reduced motion support
- [ ] Safe area support (where applicable)
- [ ] Touch/non-touch support

### Accessibility
- [ ] Proper ARIA attributes
- [ ] Keyboard navigation support
- [ ] Screen reader support
- [ ] Focus management (where applicable)
- [ ] Color contrast meets WCAG 2.1 AA

### Testing
- [ ] Unit tests exist
- [ ] All props tested
- [ ] All events tested
- [ ] Edge cases tested
- [ ] Platform variations tested (if applicable)

### Documentation
- [ ] Purpose documented
- [ ] Usage examples provided
- [ ] Do/Don't guidelines documented
- [ ] Platform behavior documented
- [ ] Accessibility rules documented
- [ ] Test expectations documented

---

## New Component Proposal Process

To propose a new semantic component:

1. **Justify the need** - Explain why existing components are insufficient
2. **Define the API** - Props, events, slots
3. **Specify platform behavior** - How it behaves on iOS/MD
4. **Define accessibility requirements** - ARIA, keyboard, screen reader
5. **Outline test requirements** - What needs to be tested
6. **Get architectural approval** - PR review with architecture label

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-11 | Initial release - Phase 11 |
