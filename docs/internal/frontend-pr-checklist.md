# Frontend PR Checklist

**Version:** 1.0.0  
**Last Updated:** 2026-06-11  
**Status:** ACTIVE - Phase 11  

**Purpose:** This checklist must be completed before merging any frontend PR. It enforces the architecture contract and ensures code quality, accessibility, and maintainability.

---

## Quick Links

- [Frontend Architecture Contract](./frontend-architecture-contract.md)
- [Semantic Component Checklist](./frontend-semantic-component-checklist.md)
- [Route Ownership Map](./frontend-route-ownership.md)
- [Known Limitations](./frontend-native-ui-known-limitations.md)

---

## 📋 PR Review Checklist

### Before Review

- [ ] **Title** - Clear, descriptive title following conventional commits
- [ ] **Description** - Explains WHAT changed and WHY
- [ ] **Linked Issues** - References related issues/PRs
- [ ] **Screenshots** - Included for UI changes (if applicable)
- [ ] **Breaking Changes** - Documented with migration notes (if applicable)

---

## ✅ Code Quality Checks

### Architecture Compliance

**All changes must follow import boundaries defined in the architecture contract.**

- [ ] **Semantic Components** - Does this use semantic components from `@/design/semantic/` where appropriate?
  - Check: `AppRoot`, `AppShell`, `AppPage`, `AppNavbar`, `AppToolbar`, etc.
  - No raw Framework7 components in views/features

- [ ] **No Raw Framework7** - No direct `framework7-vue` imports in:
  - [ ] `src/views/`
  - [ ] `src/features/`
  - [ ] `src/components/`
  - [ ] `src/design/components/`
  - ✅ Only allowed in: `src/design/semantic/`

- [ ] **No Raw Capacitor** - No direct `@capacitor/*` imports in:
  - [ ] `src/views/`
  - [ ] `src/features/`
  - [ ] `src/components/`
  - [ ] `src/design/`
  - [ ] `src/stores/`
  - ✅ Only allowed in: `src/platform/`

- [ ] **Icon Usage** - All icons use `AppIcon` component:
  - [ ] No direct `@iconoir/vue` imports outside `src/design/icons/` and `AppIcon.vue`
  - [ ] Icon names are from `AppIconName` type
  - [ ] Icons use semantic naming (`home`, `home-filled`, etc.)

- [ ] **No Konsta** - No Konsta UI imports anywhere:
  - [ ] No `konsta` or `konsta/vue` imports
  - [ ] No Konsta components or styles

- [ ] **Import Direction** - Dependencies flow in correct direction:
  - `views/` → `features/`, `design/semantic/`, `stores/`, `composables/`
  - `features/` → `components/`, `design/semantic/`, `stores/`, `composables/`
  - No circular dependencies

### Code Standards

- [ ] **TypeScript** - All code is properly typed
- [ ] **No `any`** - No `any` types (use `unknown` with type guards)
- [ ] **Null Safety** - Proper null/undefined handling
- [ ] **Error Handling** - All async operations have error handling
- [ ] **No Console Logs** - No `console.log`, `console.error`, etc. in production code
  - ✅ Allowed: `console.warn` for development debugging (with cleanup)
  - ✅ Use logging utility for intentional logs

### Platform Compatibility

- [ ] **Respects Reduced Motion** - Checks `nativeUiProfile.prefersReducedMotion`
- [ ] **Respects Safe Areas** - Uses `safeAreaPolicy` for insets
- [ ] **Touch Targets** - Minimum 44x44px for interactive elements
- [ ] **Platform Detection** - Uses `nativeUiProfile` instead of UA sniffing
- [ ] **Gesture Fallbacks** - Every gesture has non-gesture alternative:
  - [ ] Swipe back → Back button
  - [ ] Swipe to dismiss → Close button
  - [ ] Pull to refresh → Refresh button

### Keyboard and Input

- [ ] **Emoji Preservation** - Never strips emoji or alters unicode
- [ ] **Keyboard Behavior** - Uses appropriate input types:
  - [ ] `type="search"` for search inputs
  - [ ] `inputmode` and `enterkeyhint` for mobile optimization
  - [ ] `autocapitalize` appropriate for context
  - [ ] `spellcheck` enabled where appropriate
- [ ] **Paste Support** - Paste works in all text inputs
- [ ] **Autocomplete** - Correct autocomplete values for form fields

---

## 🧪 Testing Checks

### Unit Tests (Vitest)

- [ ] **New Features** - All new composables have unit tests
- [ ] **New Utilities** - All new utility functions have unit tests
- [ ] **New Components** - All new semantic components have unit tests
- [ ] **New Stores** - All new Pinia stores have unit tests
- [ ] **Existing Tests** - All existing tests pass
- [ ] **Edge Cases** - Tests cover edge cases and error states

### Type Checking

- [ ] **TypeCheck Passes** - `bun run type-check` passes with no errors
- [ ] **No Type Errors** - No TypeScript errors in code

### Linting

- [ ] **ESLint Passes** - `bun run lint:no-fix` passes
- [ ] **Architecture Check** - `bun run check:frontend-architecture` passes
- [ ] **No Warnings** - No lint warnings (or justified with comments)

### Build

- [ ] **Build Succeeds** - `bun run build` completes without errors
- [ ] **No Warnings** - No build warnings
- [ ] **Tree Shaking** - Unused code is properly tree-shaken

---

## ♿ Accessibility Checks

### WCAG 2.1 AA Compliance

**Minimum Requirements:** All UI must meet WCAG 2.1 AA standards.

#### Perceivable

- [ ] **Text Alternatives** - All non-text content has text alternatives
  - [ ] Images have `alt` text
  - [ ] Icons have `aria-label` or visible text
  - [ ] Icon-only buttons have `aria-label`

- [ ] **Adaptable** - Content can be presented in different ways
  - [ ] Logical structure without style sheets
  - [ ] Proper heading hierarchy
  - [ ] Readable text with sufficient contrast

- [ ] **Distinguishable** - Content is easy to see and hear
  - [ ] Minimum 4.5:1 contrast ratio for text
  - [ ] Minimum 3:1 for large text (18.66px+)
  - [ ] Never uses color alone to convey information

#### Operable

- [ ] **Keyboard Accessible** - All functionality available from keyboard
  - [ ] All interactive elements are focusable
  - [ ] Focus order is logical
  - [ ] Focus indicators are visible
  - [ ] All actions can be triggered via keyboard

- [ ] **Enough Time** - Users have enough time to read/interact
  - [ ] No content that times out without user control
  - [ ] Animations respect reduced motion

- [ ] **Navigable** - Users can navigate and find content
  - [ ] Skip navigation mechanism (skip links)
  - [ ] Clear headings and labels
  - [ ] Descriptive link text (no "click here")

#### Understandable

- [ ] **Readable** - Text is readable and understandable
  - [ ] Language of page is identified
  - [ ] Language of parts is identified when different

- [ ] **Predictable** - UI operates in predictable ways
  - [ ] Consistent navigation
  - [ ] Consistent component behavior
  - [ ] Focus doesn't change without user action

- [ ] **Input Assistance** - Help users avoid and correct mistakes
  - [ ] Clear labels and instructions
  - [ ] Error identification and suggestions
  - [ ] Form validation feedback

#### Robust

- [ ] **Compatible** - Content is compatible with current and future tools
  - [ ] Valid HTML markup
  - [ ] Proper ARIA attributes
  - [ ] Semantic HTML elements used appropriately

### Screen Reader Testing

- [ ] **VoiceOver (iOS)** - Tested with VoiceOver
- [ ] **TalkBack (Android)** - Tested with TalkBack
- [ ] **NVDA/JAWS** - Tested with desktop screen readers (if applicable)
- [ ] **Announcements** - State changes are announced
- [ ] **Focus Management** - Focus moves logically

### Manual Accessibility Tests

For UI changes, manually verify:

- [ ] **Keyboard-Only Navigation** - Can navigate entire feature with keyboard only
- [ ] **Focus Order** - Tab order is logical and intuitive
- [ ] **Focus Indicators** - Focus states are clearly visible
- [ ] **Screen Reader** - Content is properly announced
- [ ] **High Contrast Mode** - UI works in high contrast mode (Windows)
- [ ] **Large Text Mode** - UI works with large text enabled
- [ ] **Reduced Motion** - UI respects prefers-reduced-motion

---

## 🌍 Platform Testing Checks

### Required Testing Matrix

| Platform | Browser/Environment | Status |
|----------|---------------------|--------|
| iOS | Safari (iPhone) | [ ] Tested |
| iOS | Safari (iPad) | [ ] Tested |
| iOS | Safari (iPadOS with desktop UA) | [ ] Tested |
| Android | Chrome | [ ] Tested |
| Desktop | Chrome | [ ] Tested |
| Desktop | Safari | [ ] Tested |
| PWA | iOS Installed | [ ] Tested |
| PWA | Android Installed | [ ] Tested |
| PWA | Desktop Installed | [ ] Tested |

### Critical Flows to Test

**Auth:**
- [ ] Sign in flow
- [ ] Sign up flow
- [ ] Welcome screen
- [ ] Experience selection

**Navigation:**
- [ ] Tab switching
- [ ] Back navigation
- [ ] Deep link handling
- [ ] Android hardware back button

**Core Features:**
- [ ] Home feed loading
- [ ] Explore search
- [ ] Message list
- [ ] Message thread
- [ ] Notifications list
- [ ] Profile screen
- [ ] Settings screen

**Interactions:**
- [ ] Pull to refresh
- [ ] Swipe back gesture
- [ ] Action sheets
- [ ] Bottom sheets
- [ ] Media viewer
- [ ] Story viewer
- [ ] Message composer

### Native Behavior

- [ ] **Status Bar** - Properly configured for native feel
- [ ] **Safe Areas** - Respects notches and home indicators
- [ ] **Haptics** - Feedback works on supported devices
- [ ] **Keyboard** - Native keyboard behavior preserved
- [ ] **Orientation** - Handles device rotation correctly

---

## 🔒 Security and Privacy Checks

### Sensitive Data Protection

- [ ] **No Sensitive Logging** - No logging of:
  - [ ] Post bodies
  - [ ] Message bodies
  - [ ] Draft text
  - [ ] Auth tokens
  - [ ] Private attachment URLs
  - [ ] Raw encrypted payloads
  - [ ] Full platform fingerprint dumps

- [ ] **Secure Storage** - Sensitive data stored securely:
  - [ ] Auth tokens in secure storage (Capacitor Preferences)
  - [ ] No sensitive data in localStorage
  - [ ] No sensitive data in sessionStorage (unless required)

- [ ] **Network Security** - All network requests:
  - [ ] Use HTTPS
  - [ ] Validate responses
  - [ ] Handle errors gracefully
  - [ ] No sensitive data in URLs

### Content Safety

- [ ] **User Content** - Properly escaped/sanitized:
  - [ ] No XSS vulnerabilities
  - [ ] Safe HTML rendering (if applicable)
  - [ ] URL validation for links

- [ ] **Input Validation** - All user input:
  - [ ] Length limits enforced
  - [ ] Type validation
  - [ ] Sanitization where needed

---

## 📦 Demo/Mock Data Checks

### Demo Data Governance

- [ ] **No Production Leaks** - Demo data cannot leak into production:
  - [ ] Demo data behind `import.meta.env.DEV` flag
  - [ ] OR behind explicit feature flag
  - [ ] Production builds strip demo data

- [ ] **Clear Labeling** - Demo data is clearly labeled:
  - [ ] Files with demo data have `*demo*`, `*mock*`, or `*placeholder*` in name
  - [ ] Demo UI has visual indicators (watermarks, labels, etc.)
  - [ ] Demo data marked with comments

- [ ] **No Real-Looking Data** - Demo data doesn't appear real:
  - [ ] Usernames are clearly fake (e.g., `demo_user_1`)
  - [ ] Content is clearly placeholder (Lorem ipsum, etc.)
  - [ ] No real user data in mocks

---

## 📚 Documentation Checks

### Code Documentation

- [ ] **New Components** - Component files include:
  - [ ] JSDoc comments for props
  - [ ] JSDoc comments for events
  - [ ] JSDoc comments for methods
  - [ ] Usage examples in comments

- [ ] **New Functions/Utilities** - Include:
  - [ ] JSDoc comments with parameter descriptions
  - [ ] Return type documentation
  - [ ] Example usage

- [ ] **Complex Logic** - Includes:
  - [ ] Inline comments for non-obvious logic
  - [ ] Explanation of algorithms
  - [ ] References to related code

### External Documentation

- [ ] **Architecture Changes** - Updated:
  - [ ] `frontend-architecture-contract.md` (if contract changed)
  - [ ] `frontend-semantic-component-checklist.md` (if components changed)
  - [ ] `frontend-route-ownership.md` (if routes changed)

- [ ] **API Documentation** - If new API endpoints:
  - [ ] Documented in API docs
  - [ ] Type definitions updated

- [ ] **Migration Guides** - If breaking changes:
  - [ ] Migration guide created
  - [ ] Deprecation notices added

---

## 🏗️ Architecture Checks

### Separation of Concerns

- [ ] **Views** - Only route orchestration, no business logic
- [ ] **Features** - Feature-specific UI and logic
- [ ] **Components** - Reusable UI components
- [ ] **Stores** - State management only
- [ ] **Composables** - Reusable logic only
- [ ] **Platform** - Platform-specific code only
- [ ] **Design** - Design system code only

### No Circular Dependencies

- [ ] No circular imports between modules
- [ ] Dependencies flow in one direction
- [ ] No tight coupling between layers

### Future Maintainability

- [ ] **No Architecture Debt** - This PR doesn't introduce:
  - [ ] Direct framework imports in wrong layers
  - [ ] Tight coupling between components
  - [ ] Duplicate code
  - [ ] Magic strings/numbers
  - [ ] Unnecessary complexity

- [ ] **Extensibility** - Changes are:
  - [ ] Easy to extend
  - [ ] Easy to modify
  - [ ] Easy to test
  - [ ] Easy to document

---

## 🎯 Final Approval Checklist

**Before merging, verify all of the following:**

### Automated Checks
- [ ] ✅ TypeCheck passes
- [ ] ✅ Lint passes
- [ ] ✅ Architecture check passes
- [ ] ✅ Build succeeds
- [ ] ✅ Unit tests pass
- [ ] ✅ Integration tests pass (if applicable)
- [ ] ✅ E2E tests pass (if applicable)

### Manual Checks
- [ ] ✅ Code review completed
- [ ] ✅ All review comments addressed
- [ ] ✅ PR description complete
- [ ] ✅ Screenshots/videos included (for UI changes)
- [ ] ✅ Breaking changes documented
- [ ] ✅ Migration guide provided (if needed)

### Sign-Off
- [ ] **Author** - Self-review completed
- [ ] **Reviewer 1** - Approved
- [ ] **Reviewer 2** - Approved (if required)
- [ ] **Architecture Lead** - Approved (for architecture changes)

---

## 📖 References

- [Frontend Architecture Contract](./frontend-architecture-contract.md)
- [Semantic Component Checklist](./frontend-semantic-component-checklist.md)
- [Route Ownership Map](./frontend-route-ownership.md)
- [Known Limitations](./frontend-native-ui-known-limitations.md)

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-11 | Initial release - Phase 11 |
