# Frontend Architecture Contract

**Version:** 1.0.0  
**Last Updated:** 2026-06-11  
**Status:** ACTIVE - Phase 11  

This document defines the frontend architecture contract for the Memory application. All future work MUST follow these rules to prevent UI drift, maintain consistency, and ensure long-term maintainability.

---

## Table of Contents

1. [Approved Stack](#1-approved-stack)
2. [Folder Responsibilities](#2-folder-responsibilities)
3. [Allowed Imports by Layer](#3-allowed-imports-by-layer)
4. [Semantic Component Usage](#4-semantic-component-usage)
5. [Platform API Usage](#5-platform-api-usage)
6. [Icon Usage](#6-icon-usage)
7. [Keyboard/Input Rules](#7-keyboardinput-rules)
8. [Motion/Gesture Rules](#8-motiongesture-rules)
9. [Accessibility Baseline](#9-accessibility-baseline)
10. [Testing Baseline](#10-testing-baseline)
11. [PR Checklist](#11-pr-checklist)

---

## 1. Approved Stack

### UI Framework
- **Primary:** Framework7 + Vue 3 (via `framework7-vue`)
- **Purpose:** Native-feel mobile UI components
- **Constraint:** ONLY used through semantic wrappers in `design/semantic/`

### Platform Layer
- **Primary:** Capacitor 6.x for native runtime
- **Purpose:** Cross-platform native capabilities
- **Constraint:** ONLY used through platform wrappers in `platform/`

### Icons
- **Primary:** Iconoir (via `@iconoir/vue`)
- **Purpose:** Consistent iconography across all platforms
- **Constraint:** ONLY used through `AppIcon` component

### State Management
- **Primary:** Pinia
- **Purpose:** Centralized state management
- **Constraint:** All API-facing state in `stores/`

### Styling
- **Primary:** Tailwind CSS + Framework7 CSS variables
- **Purpose:** Design system tokens and utilities
- **Constraint:** Global tokens in `assets/`, component styles scoped

### Testing
- **Primary:** Vitest (unit), Playwright (E2E), @axe-core/playwright (a11y)
- **Purpose:** Comprehensive test coverage
- **Constraint:** All new features require tests

### Build Tooling
- **Primary:** Vite + Bun
- **Purpose:** Fast, modern development and build pipeline

### Forbidden Technologies
- ❌ Konsta UI (or any Konsta imports)
- ❌ Additional major UI frameworks (without explicit approval)
- ❌ Heavy animation libraries (Motion for Vue only if needed for specific use cases)
- ❌ Duplicate gesture libraries
- ❌ Raw icon libraries outside of approved icon system

---

## 2. Folder Responsibilities

### `frontend/src/views/`
**Purpose:** Route orchestration ONLY  
**Responsibilities:**
- Route-level page containers
- Route-specific data fetching coordination
- Route navigation logic
- Integration of feature components and semantic primitives

**Forbidden:**
- Direct Framework7 component imports
- Direct Capacitor plugin imports
- Direct Iconoir imports
- Hard-coded platform detection
- Duplicate native controls
- Business logic (belongs in features or stores)

**Allowed Imports:**
- `@/features/*` - Feature components and composables
- `@/design/semantic/*` - Semantic component wrappers
- `@/stores/*` - Pinia stores
- `@/composables/*` - Shared composables
- `@/platform/*` - Platform utilities (via composables)

---

### `frontend/src/features/`
**Purpose:** Product feature UI and local feature composables  
**Responsibilities:**
- Feature-specific components
- Feature-specific composables
- Feature-specific state management
- Integration of semantic primitives

**Forbidden:**
- Direct Framework7 component imports
- Direct Capacitor plugin imports
- Direct Iconoir imports
- Hard-coded platform detection
- Duplicate native controls
- Route orchestration (belongs in views)

**Allowed Imports:**
- `@/components/*` - Shared product components
- `@/design/semantic/*` - Semantic component wrappers
- `@/stores/*` - Pinia stores
- `@/composables/*` - Shared composables
- `@/platform/*` - Platform utilities (via composables)

---

### `frontend/src/components/`
**Purpose:** Shared product components  
**Responsibilities:**
- Reusable UI components that don't fit in semantic layer
- Product-specific molecules and organisms
- Integration of semantic primitives

**Forbidden:**
- Hard-coded platform behavior
- Direct Framework7 imports (use semantic wrappers)
- Direct Iconoir imports (use AppIcon)

**Allowed Imports:**
- `@/design/semantic/*` - Semantic component wrappers
- `@/composables/*` - Shared composables
- `@/stores/*` - Pinia stores (sparingly)

---

### `frontend/src/design/semantic/`
**Purpose:** Native UI primitives backed by Framework7  
**Responsibilities:**
- Semantic wrappers for Framework7 components
- Platform-adaptive behavior
- Design system token integration
- Accessibility enforcement

**Allowed Imports:**
- `framework7-vue` - Raw Framework7 components (ONLY here)
- `@/design/icons/*` - Icon registry
- `@/platform/*` - Platform detection
- `@/composables/*` - Shared composables

**Forbidden:**
- Any imports from `konsta`

---

### `frontend/src/design/components/`
**Purpose:** Design system components that don't require raw Framework7  
**Responsibilities:**
- Pure design components (badges, icons, etc.)
- Visual styling utilities
- Animation helpers

**Preferred:**
- Use semantic wrappers from `@/design/semantic/` where possible
- Migrate to semantic if using raw Framework7

---

### `frontend/src/design/icons/`
**Purpose:** Icon registry and platform icon mapping  
**Responsibilities:**
- Icon name constants and types
- Icon size definitions
- Platform-specific icon variants

**Allowed Imports:**
- `@iconoir/vue` - Raw Iconoir icons (ONLY here and AppIcon.vue)

---

### `frontend/src/platform/`
**Purpose:** Capacitor/browser capability wrappers  
**Responsibilities:**
- Native capability detection
- Platform-specific behavior abstraction
- Safe area handling
- Haptic feedback
- Motion preferences
- Keyboard behavior

**Allowed Imports:**
- `@capacitor/*` - Raw Capacitor plugins (ONLY here)
- `@/composables/*` - Shared composables

---

### `frontend/src/stores/`
**Purpose:** Pinia state and API-facing orchestration  
**Responsibilities:**
- Centralized application state
- API client integration
- Cross-feature state coordination
- Data persistence

**Allowed Imports:**
- `@/api/*` - API clients
- `@/composables/*` - Shared composables
- `@/platform/*` - Platform utilities

---

### `frontend/src/assets/`
**Purpose:** Tokens, global CSS, and app-level style rules  
**Responsibilities:**
- Design tokens (colors, spacing, typography)
- Global CSS reset and base styles
- CSS custom properties
- Static assets

---

### `frontend/src/composables/`
**Purpose:** Shared, reusable composition functions  
**Responsibilities:**
- Cross-cutting concerns (network, keyboard, etc.)
- Shared utility functions
- Reactivity helpers

**Allowed Imports:**
- `@/platform/*` - Platform utilities
- `@/stores/*` - Pinia stores (sparingly)

---

## 3. Allowed Imports by Layer

### Import Direction (Dependency Flow)

```
views/ 
  → features/ 
  → design/semantic/ 
  → stores/ 
  → composables/ 

features/ 
  → components/ 
  → design/semantic/ 
  → stores/ 
  → composables/ 

components/ 
  → design/semantic/ 
  → composables/ 

design/semantic/ 
  → framework7-vue ⬅️ (ONLY layer allowed to import raw Framework7)
  → design/icons/ 
  → platform/ 
  → composables/ 

platform/ 
  → @capacitor/* ⬅️ (ONLY layer allowed to import raw Capacitor)
  → composables/ 

design/icons/ 
  → @iconoir/vue ⬅️ (ONLY layer allowed to import raw Iconoir)
```

### Import Restriction Matrix

| Source \\ Target | views/ | features/ | components/ | design/semantic/ | design/components/ | platform/ | stores/ |
|-------------------|--------|-----------|-------------|-----------------|-------------------|----------|--------|
| framework7-vue    | ❌     | ❌        | ❌          | ✅              | ❌                | ❌       | ❌     |
| @capacitor/*      | ❌     | ❌        | ❌          | ❌              | ❌                | ✅       | ❌     |
| @iconoir/vue      | ❌     | ❌        | ❌          | ❌              | ❌                | ❌       | ❌     |
| konsta           | ❌     | ❌        | ❌          | ❌              | ❌                | ❌       | ❌     |

---

## 4. Semantic Component Usage

### Rule: All UI must use semantic components

Shell, list, search, form, sheet, dialog, tabbar, toolbar, action menu, and composer UI MUST use semantic components from `design/semantic/`.

### Available Semantic Primitives

| Component | Purpose | Framework7 Backing |
|-----------|---------|---------------------|
| `AppRoot` | Framework7 app initialization | `f7App`, `f7Views`, `f7View` |
| `AppPage` | Page container | `f7Page` |
| `AppShell` | Shell layout (navbar + content + tabbar) | Custom |
| `AppNavbar` | Navigation bar | `f7Navbar`, `f7NavTitle`, etc. |
| `AppToolbar` | Bottom toolbar/tabbar | `f7Toolbar` |
| `AppList` | List container | `f7List` |
| `AppListItem` | List item | `f7ListItem` |
| `AppGroupedList` | Grouped list | `f7ListGroup` |
| `AppSwitch` | Toggle switch | `f7Toggle` |
| `AppRadioList` | Radio button list | `f7List`, `f7Radio` |
| `AppCheckboxList` | Checkbox list | `f7List`, `f7Checkbox` |
| `AppSlider` | Range slider | `f7Range` |
| `AppVirtualList` | Virtualized list | `f7List` (virtual) |
| `AppSearchBar` | Search input | Custom (Framework7 searchbar) |
| `AppSegmentedControl` | Segmented buttons | `f7Segmented` |
| `AppSheet` | Bottom sheet | `f7Sheet` |
| `AppActionsSheet` | Action sheet | `f7Actions` |
| `AppDialog` | Dialog/modal | `f7Dialog` (future) |
| `AppPopover` | Popover | Custom (future) |
| `AppToast` | Toast notification | Custom (future) |
| `AppComposer` | Content composer | Custom (future) |
| `AppTextField` | Text input | Custom (future) |
| `AppTextArea` | Text area | Custom (future) |
| `AppMediaViewer` | Media viewer | Custom (future) |
| `AppPullToRefresh` | Pull-to-refresh | Custom |
| `AppDestructiveAction` | Destructive actions | Custom |

### Justification Required for Custom UI

If a semantic primitive is insufficient for a use case, the developer MUST:

1. Document why the existing primitive cannot be used
2. Propose a new semantic primitive (preferred)
3. OR justify a one-off custom implementation
4. Get architectural approval

**Rationale:** Prevents duplication and ensures design system consistency.

---

## 5. Platform API Usage

### Rule: All platform access must go through `platform/` layer

Direct Capacitor plugin usage is FORBIDDEN in:
- Views
- Features
- Components
- Design (except design/semantic for platform detection)

### Allowed Platform Utilities

| Utility | Purpose | Location |
|---------|---------|----------|
| `nativeUiProfile` | Theme and platform detection | `@/platform/nativeUiProfile` |
| `hapticPolicy` | Haptic feedback management | `@/platform/hapticPolicy` |
| `keyboardPolicy` | Keyboard behavior management | `@/platform/keyboardPolicy` |
| `safeAreaPolicy` | Safe area insets | `@/platform/safeAreaPolicy` |
| `motionPolicy` | Motion preference management | `@/platform/motionPolicy` |
| `capabilityDetection` | Feature detection | `@/platform/capabilityDetection` |

### Platform Detection Strategy

1. **Prefer feature detection** over user agent sniffing
2. **Use nativeUiProfile** for theme/platform classification
3. **Respect user preferences** (reduced motion, etc.)
4. **Provide fallbacks** for unsupported platforms

---

## 6. Icon Usage

### Rule: All icons must use `AppIcon` component

Direct Iconoir imports are FORBIDDEN in:
- Views
- Features
- Components
- Design (except design/icons/ and AppIcon.vue)

### Usage Pattern

```vue
<!-- Correct -->
<AppIcon name="home" :size="24" />
<AppIcon name="home-filled" :size="24" />

<!-- Forbidden -->
import { Home } from '@iconoir/vue'
<Home />
```

### Icon Registry

All icon names are defined in `frontend/src/design/icons/AppIcon.types.ts`:

```ts
type AppIconName = 
  | 'home' | 'home-filled'
  | 'explore' | 'explore-filled'
  | 'messages' | 'messages-filled'
  | 'notifications' | 'notifications-filled'
  | 'profile' | 'profile-filled'
  | 'settings' | 'settings-filled'
  | /* ... etc */
```

### Platform Icon Mapping

Icons automatically adapt to platform:
- iOS: Uses SF Symbols-inspired variants when available
- Material: Uses Material Design-inspired variants
- Falls back to neutral variants

---

## 7. Keyboard/Input Rules

### General Rules

1. **Respect native keyboard behavior** - Never suppress or override without justification
2. **Use appropriate input types** - `type="search"`, `inputmode`, `enterkeyhint`
3. **Preserve emoji/unicode** - Never strip or alter user input
4. **Provide accessible labels** - Every input must have a label

### Input Type Matrix

| Context | type | inputmode | enterkeyhint | autocomplete |
|---------|------|-----------|--------------|--------------|
| Search | `search` | `search` | `search` | `off` |
| Username | `text` | `text` | `next` | `username` |
| Password | `password` | `text` | `done` | `current-password` |
| Email | `email` | `email` | `next` | `email` |
| Phone | `tel` | `tel` | `next` | `tel` |
| URL | `url` | `url` | `go` | `url` |
| Message Composer | `text` | `text` | `send` | `off` |
| Multi-line | `text` | `text` | `default` | `off` |

### Emoji and Unicode

- **Never** strip emoji from user input
- **Never** prevent emoji keyboard access
- **Never** alter unicode content
- **Always** use UTF-8 encoding
- **Always** support full unicode range

### Autocapitalization

- Search fields: `autocapitalize="none"`
- Usernames/emails: `autocapitalize="none"`
- Passwords: `autocapitalize="off"`
- Sentences: `autocapitalize="sentences"`
- Names: `autocapitalize="words"`

### Spellcheck

- Search: `spellcheck="false"`
- Usernames: `spellcheck="false"`
- Emails: `spellcheck="false"`
- Message content: `spellcheck="true"`
- Forms: `spellcheck="true"` (unless field-specific override)

---

## 8. Motion/Gesture Rules

### General Rules

1. **Respect user preferences** - Always check `prefers-reduced-motion`
2. **Provide fallbacks** - Non-gesture alternatives for all interactions
3. **Use Framework7 gestures** - For native-feel interactions
4. **Limit custom animations** - Use CSS transitions for simple cases

### Motion Preference

```ts
// Always check for reduced motion
const nativeUiProfile = useNativeUiProfile()
if (nativeUiProfile.prefersReducedMotion) {
  // Disable animations
}
```

### Gesture Fallbacks

Every gesture interaction MUST have a non-gesture alternative:
- Swipe back → Back button
- Swipe to dismiss → Close button
- Pull to refresh → Refresh button
- Long press → Context menu button

### When to Add Motion for Vue

Only add Motion for Vue library for:
- Shared element transitions
- Gesture-linked story viewer animations
- Springy media viewer dismissal
- Interruptible composer expansion
- Reaction burst animations

Do NOT add for:
- Basic page transitions (use Vue Transition)
- Simple fade effects (use CSS)
- Standard list animations

---

## 9. Accessibility Baseline

### Minimum Requirements

All UI must meet WCAG 2.1 AA standards:

1. **Perceivable**
   - All non-text content has text alternatives
   - Adaptable content (reflow, resize, etc.)
   - Distinguishable content (color, contrast)

2. **Operable**
   - All functionality available from keyboard
   - Enough time for interactions
   - No content that causes seizures

3. **Understandable**
   - Readable text
   - Predictable navigation
   - Input assistance

4. **Robust**
   - Compatible with current and future tools
   - Valid markup

### Specific Requirements

#### Labels
- Every interactive element must have an accessible label
- Icon-only buttons must have `aria-label` or visible text
- Form inputs must have associated labels

#### Keyboard Navigation
- All interactive elements must be focusable
- Focus order must be logical
- Focus indicators must be visible
- All actions must be keyboard-triggerable

#### Color and Contrast
- Minimum 4.5:1 contrast ratio for text
- Minimum 3:1 for large text (18.66px+)
- Never use color alone to convey information
- Provide text alternatives for color-coded information

#### Touch Targets
- Minimum 44x44px touch targets
- Adequate spacing between interactive elements

#### Screen Reader Support
- Use semantic HTML elements
- Provide ARIA attributes when needed
- Test with VoiceOver (iOS) and TalkBack (Android)

### Testing

Automated: `@axe-core/playwright` for critical routes  
Manual: VoiceOver, TalkBack, keyboard-only navigation

---

## 10. Testing Baseline

### Test Pyramid

```
        ┌─────────────┐
        │   E2E (20%)  │  ← Critical user journeys
        ├─────────────┤
        │ Integration  │  ← Component interactions
        ├─────────────┤
        │  Unit (80%)  │  ← Individual components, utilities
        └─────────────┘
```

### Unit Tests (Vitest)

- All composables must have unit tests
- All utility functions must have unit tests
- All semantic components must have unit tests
- All stores must have unit tests

### Integration Tests

- Feature components with dependencies
- Component interactions
- Platform utility behavior

### E2E Tests (Playwright)

**Smoke Tests (Required):**
- Auth flow (signin, signup, welcome)
- Tab navigation
- Back navigation
- Settings navigation
- Explore search
- Feed filter
- Pull-to-refresh
- Story viewer open/close
- Media viewer open/close
- Message composer send disabled/enabled
- Action sheet open/close

**Accessibility Tests (Required):**
- Critical routes: /welcome, /signin, /, /explore, /messages, /notifications, /profile, /settings, /thread/:id
- Check: no critical axe violations
- Check: no unlabeled icon-only buttons
- Check: no missing form labels
- Check: focus order works
- Check: modals/action sheets can close
- Check: keyboard navigation reaches primary controls

### Platform Tests

- `nativeUiProfile` - iPhone, iPad, Android, Desktop
- `capabilityDetection` - feature support matrix
- `keyboardPolicy` - keyboard behavior
- `safeAreaPolicy` - safe area insets
- `hapticPolicy` - haptic feedback
- `motionPolicy` - motion preferences

### Keyboard/Input Tests

- AppSearchBar: type=search, inputmode=search, enterkeyhint=search
- AppTextField: appropriate inputmode, enterkeyhint, autocomplete
- AppTextArea: appropriate inputmode, spellcheck
- AppComposer: inputmode=text, enterkeyhint=send, paste not blocked
- Auth fields: correct autocomplete values

---

## 11. PR Checklist

Before merging any frontend PR, verify:

### Code Quality

- [ ] Does this use semantic components?
- [ ] Does this avoid raw Framework7 in views/features?
- [ ] Does this avoid raw Capacitor in views/features?
- [ ] Does this use `AppIcon` for all icons?
- [ ] Does this preserve native emoji/keyboard behavior?
- [ ] Does this respect safe areas?
- [ ] Does this respect reduced motion preferences?
- [ ] Does this provide non-gesture fallbacks?

### Testing

- [ ] Does this add/update unit tests?
- [ ] Does this add/update integration tests (if applicable)?
- [ ] Does this add/update E2E tests (if applicable)?
- [ ] Do all existing tests pass?
- [ ] Does this pass typecheck?
- [ ] Does this pass build?

### Accessibility

- [ ] Are all interactive elements accessible?
- [ ] Are all icon-only buttons labeled?
- [ ] Are all form inputs labeled?
- [ ] Is color used appropriately (not solely for information)?
- [ ] Are touch targets adequately sized?
- [ ] Does this work with keyboard-only navigation?

### Platform Compatibility

- [ ] Has this been tested on iOS Safari?
- [ ] Has this been tested on iPadOS Safari?
- [ ] Has this been tested on Android Chrome?
- [ ] Has this been tested on Desktop Chrome?
- [ ] Has this been tested on Desktop Safari?
- [ ] Has this been tested in installed PWA mode?

### Security and Privacy

- [ ] Does this avoid sensitive logging?
- [ ] Does this avoid demo data leaking into production?
- [ ] Are there any privacy concerns?
- [ ] Are there any security vulnerabilities?

### Documentation

- [ ] Is this change documented in the appropriate README?
- [ ] Are there any breaking changes that need migration notes?
- [ ] Are new configuration options documented?

### Architecture

- [ ] Does this follow import boundaries?
- [ ] Does this add any forbidden dependencies?
- [ ] Does this maintain separation of concerns?
- [ ] Does this introduce any new architectural debt?

---

## Appendix A: Architecture Enforcement

### ESLint Rules

The following ESLint rules enforce architecture boundaries:

```ts
// Block Konsta everywhere
'no-restricted-imports': ['error', {
  name: 'konsta',
  message: 'Konsta UI is forbidden. Use Framework7 semantic wrappers.',
}]

// Block raw Framework7 in views/features/components
'no-restricted-imports': ['error', {
  name: 'framework7-vue',
  message: 'Direct framework7-vue imports not allowed here. Use semantic wrappers from @/design/semantic.',
}]

// Block raw Capacitor in views/features/components
'no-restricted-imports': ['error', {
  name: '@capacitor',
  message: 'Direct Capacitor imports not allowed here. Use platform wrappers from @/platform.',
}]

// Block raw Iconoir in views/features/components/design/components
'no-restricted-imports': ['error', {
  name: '@iconoir/vue',
  message: 'Direct Iconoir imports not allowed here. Use AppIcon component.',
}]
```

### Architecture Check Script

Run to verify architecture compliance:

```sh
bun run check:frontend-architecture
```

This script checks:
- No Konsta imports anywhere
- No raw Framework7 imports outside design/semantic/
- No raw Capacitor imports outside platform/
- No raw Iconoir imports outside design/icons/ and AppIcon.vue
- Forbidden console patterns (optional)

---

## Appendix B: File Structure

```
frontend/
├── src/
│   ├── views/                 # Route containers
│   │   ├── HomeView.vue
│   │   ├── ExploreView.vue
│   │   ├── MessagesView.vue
│   │   ├── NotificationsView.vue
│   │   ├── ProfileView.vue
│   │   ├── SignInView.vue
│   │   ├── SignupView.vue
│   │   └── WelcomeView.vue
│   │
│   ├── features/              # Product features
│   │   ├── explore/
│   │   ├── messages/
│   │   ├── notifications/
│   │   └── profile/
│   │
│   ├── components/           # Shared product components
│   │   ├── AppIcon.vue
│   │   ├── FederationSourceBadge.vue
│   │   ├── PostLinkPreview.vue
│   │   └── ...
│   │
│   ├── design/
│   │   ├── semantic/         # Semantic wrappers (raw Framework7 allowed)
│   │   │   ├── AppRoot.vue
│   │   │   ├── AppShell.vue
│   │   │   ├── AppPage.vue
│   │   │   ├── AppNavbar.vue
│   │   │   ├── AppToolbar.vue
│   │   │   ├── AppList.vue
│   │   │   ├── AppListItem.vue
│   │   │   ├── ...
│   │   │   └── index.ts
│   │   │
│   │   ├── components/      # Design components (prefer semantic)
│   │   │   ├── AppActionsSheet.vue
│   │   │   ├── AppComposer.vue
│   │   │   ├── AppSearchBar.vue
│   │   │   └── ...
│   │   │
│   │   └── icons/           # Icon registry (raw Iconoir allowed)
│   │       └── AppIcon.types.ts
│   │
│   ├── platform/             # Platform wrappers (raw Capacitor allowed)
│   │   ├── nativeUiProfile.ts
│   │   ├── hapticPolicy.ts
│   │   ├── keyboardPolicy.ts
│   │   ├── safeAreaPolicy.ts
│   │   ├── motionPolicy.ts
│   │   └── capabilityDetection.ts
│   │
│   ├── stores/               # Pinia stores
│   │   ├── authStore.ts
│   │   ├── notificationsStore.ts
│   │   └── ...
│   │
│   ├── composables/          # Shared composables
│   │   ├── useLargeTitle.ts
│   │   ├── useNetworkStatus.ts
│   │   ├── useKeyboard.ts
│   │   └── ...
│   │
│   ├── assets/               # Global assets and tokens
│   │   ├── tokens.css
│   │   └── global.css
│   │
│   ├── i18n/                 # Internationalization
│   │   └── index.ts
│   │
│   └── main.ts              # App entry point
│
├── tests/
│   ├── unit/               # Vitest unit tests
│   │   └── ...
│   ├── integration/         # Integration tests
│   │   └── ...
│   └── e2e/                # Playwright E2E tests
│       ├── smoke/          # Smoke tests
│       └── accessibility/  # Accessibility tests
│
├── docs/
│   └── internal/
│       ├── frontend-architecture-contract.md
│       ├── frontend-semantic-component-checklist.md
│       ├── frontend-route-ownership.md
│       ├── frontend-pr-checklist.md
│       └── frontend-native-ui-known-limitations.md
│
├── eslint.config.ts         # ESLint configuration
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies
```

---

## Appendix C: Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-11 | Initial release - Phase 11 |