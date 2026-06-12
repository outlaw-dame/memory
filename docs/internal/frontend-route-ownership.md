# Frontend Route Ownership Map

**Version:** 1.0.0  
**Last Updated:** 2026-06-11  
**Status:** ACTIVE - Phase 11  

This document maps every route to its owner, dependencies, and testing coverage. It provides a clear reference for where logic belongs and who is responsible for each part of the application.

---

## Table of Contents

1. [Route Map](#route-map)
2. [Feature Ownership](#feature-ownership)
3. [Store Dependencies](#store-dependencies)
4. [Semantic Primitives Usage](#semantic-primitives-usage)
5. [Testing Coverage](#testing-coverage)
6. [Known Gaps](#known-gaps)

---

## Route Map

### Auth Routes

| Route | Path | View Component | Feature Folder | Stores Used | Semantic Primitives | Tests | Status |
|-------|------|----------------|---------------|-------------|---------------------|-------|--------|
| Welcome | `/welcome` | `WelcomeView.vue` | N/A | None | AppPage, AppShell | WelcomeView spec | ✅ |
| Sign In | `/signin` | `SignInView.vue` | N/A | authStore | AppPage, AppShell, AppNavbar | SignInView spec | ✅ |
| Sign Up | `/signup` | `SignupView.vue` | N/A | authStore | AppPage, AppShell, AppNavbar | SignupView spec | ✅ |
| Experience | `/experience` | `ExperienceView.vue` | N/A | None | AppPage, AppShell | ExperienceView spec | ✅ |
| Auth Callback | `/auth-callback` | `AuthCallbackView.vue` | auth | authStore | AppPage, AppShell | AuthCallbackView spec | ✅ |

### Main App Routes

| Route | Path | View Component | Feature Folder | Stores Used | Semantic Primitives | Tests | Status |
|-------|------|----------------|---------------|-------------|---------------------|-------|--------|
| Home | `/` | `HomeView.vue` | features/home | postsStore, authStore | AppPage, AppShell, AppNavbar, AppToolbar, AppList, AppListItem | HomeView spec, E2E smoke | ✅ |
| Explore | `/explore` | `ExploreView.vue` | features/explore | searchStore, exploreStore | AppPage, AppShell, AppNavbar, AppToolbar, AppSearchBar, AppList, AppListItem, AppSegmentedControl | ExploreView spec, E2E smoke | ✅ |
| Messages | `/messages` | `MessagesView.vue` | features/messages | messagesStore, authStore | AppPage, AppShell, AppNavbar, AppToolbar, AppList, AppListItem, AppPullToRefresh | MessagesView spec, E2E smoke | ✅ |
| Message Thread | `/messages/:id` | `MessageThreadView.vue` | features/messages | messagesStore, authStore | AppPage, AppShell, AppNavbar, AppToolbar, AppList, AppListItem, AppComposer | MessageThreadView spec | ⚠️ |
| Notifications | `/notifications` | `NotificationsView.vue` | features/notifications | notificationsStore, authStore | AppPage, AppShell, AppNavbar, AppToolbar, AppList, AppListItem | NotificationsView spec, E2E smoke | ✅ |
| Profile | `/profile` | `ProfileView.vue` | features/profile | authStore, profileStore | AppPage, AppShell, AppNavbar, AppToolbar, AppList, AppListItem | ProfileView spec, E2E smoke | ✅ |
| Profile Settings | `/profile/settings` | `ProfileSettingsView.vue` | features/profile | authStore, settingsStore | AppPage, AppShell, AppNavbar, AppList, AppListItem | ProfileSettingsView spec | ⚠️ |
| Profile Edit | `/profile/edit` | `ProfileEditView.vue` | features/profile | authStore, profileStore | AppPage, AppShell, AppNavbar, AppForm components | ProfileEditView spec | ⚠️ |

### Content Routes

| Route | Path | View Component | Feature Folder | Stores Used | Semantic Primitives | Tests | Status |
|-------|------|----------------|---------------|-------------|---------------------|-------|--------|
| Post Detail | `/post/:id` | `PostDetailView.vue` | features/post | postsStore, authStore | AppPage, AppShell, AppNavbar, AppToolbar | PostDetailView spec | ⚠️ |
| Story Detail | `/story/:id` | `StoryDetailView.vue` | features/story | storiesStore, authStore | AppPage, AppShell, AppNavbar, AppToolbar, AppMediaViewer | StoryDetailView spec | ⚠️ |
| Thread | `/thread/:id` | `ThreadView.vue` | features/thread | postsStore, messagesStore, authStore | AppPage, AppShell, AppNavbar, AppToolbar, AppList, AppListItem, AppComposer | ThreadView spec, E2E smoke | ⚠️ |

### Settings Routes

| Route | Path | View Component | Feature Folder | Stores Used | Semantic Primitives | Tests | Status |
|-------|------|----------------|---------------|-------------|---------------------|-------|--------|
| Settings | `/settings` | `SettingsView.vue` | features/settings | settingsStore, authStore | AppPage, AppShell, AppNavbar, AppToolbar, AppList, AppListItem | SettingsView spec, E2E smoke | ✅ |
| Settings Appearance | `/settings/appearance` | `SettingsAppearanceView.vue` | features/settings | settingsStore | AppPage, AppShell, AppNavbar, AppList, AppListItem, AppSwitch, AppRadioList | SettingsAppearanceView spec | ⚠️ |
| Settings Notifications | `/settings/notifications` | `SettingsNotificationsView.vue` | features/settings | settingsStore, notificationsStore | AppPage, AppShell, AppNavbar, AppList, AppListItem, AppSwitch | SettingsNotificationsView spec | ⚠️ |
| Settings Privacy | `/settings/privacy` | `SettingsPrivacyView.vue` | features/settings | settingsStore | AppPage, AppShell, AppNavbar, AppList, AppListItem, AppSwitch | SettingsPrivacyView spec | ⚠️ |
| Settings Account | `/settings/account` | `SettingsAccountView.vue` | features/settings | authStore, settingsStore | AppPage, AppShell, AppNavbar, AppList, AppListItem | SettingsAccountView spec | ⚠️ |

### Admin Routes (Future)

| Route | Path | View Component | Feature Folder | Stores Used | Semantic Primitives | Tests | Status |
|-------|------|----------------|---------------|-------------|---------------------|-------|--------|
| Admin Dashboard | `/admin` | `AdminView.vue` | features/admin | adminStore | AppPage, AppShell, AppNavbar, AppToolbar | AdminView spec | ⏳ |
| Admin Users | `/admin/users` | `AdminUsersView.vue` | features/admin | adminStore | AppPage, AppShell, AppNavbar, AppToolbar, AppList | AdminUsersView spec | ⏳ |

---

## Feature Ownership

### features/auth/

**Responsibility:** Authentication flows and user onboarding  
**Routes:** `/signin`, `/signup`, `/welcome`, `/experience`, `/auth-callback`  
**Stores:** `authStore`  
**Components:**
- `SignInForm.vue`
- `SignupForm.vue`
- `ExperienceSelector.vue`
- `AuthCallbackHandler.vue`

**Dependencies:**
- `@/stores/authStore`
- `@/design/semantic/*`
- `@/composables/useAuth`
- `@/platform/capabilityDetection`

**Testing:**
- Unit: Auth composables
- Unit: Auth form components
- E2E: Auth flow smoke tests

---

### features/explore/

**Responsibility:** Content discovery and search  
**Routes:** `/explore`  
**Stores:** `exploreStore`, `searchStore`  
**Components:**
- `ExploreGrid.vue`
- `ExploreSearch.vue`
- `ExploreFilters.vue`
- `ExploreResults.vue`

**Dependencies:**
- `@/stores/exploreStore`
- `@/stores/searchStore`
- `@/design/semantic/AppSearchBar`
- `@/design/semantic/AppSegmentedControl`
- `@/design/semantic/AppList*`

**Testing:**
- Unit: Search composables
- Unit: Filter components
- E2E: Explore search smoke test

---

### features/messages/

**Responsibility:** Messaging functionality  
**Routes:** `/messages`, `/messages/:id`  
**Stores:** `messagesStore`  
**Components:**
- `MessageList.vue`
- `MessageThread.vue`
- `MessageComposer.vue`
- `MessageItem.vue`

**Dependencies:**
- `@/stores/messagesStore`
- `@/design/semantic/AppList*`
- `@/design/semantic/AppComposer`
- `@/design/semantic/AppPullToRefresh`

**Testing:**
- Unit: Message composables
- Unit: Message components
- E2E: Messages smoke tests

---

### features/notifications/

**Responsibility:** Notification display and management  
**Routes:** `/notifications`  
**Stores:** `notificationsStore`  
**Components:**
- `NotificationList.vue`
- `NotificationItem.vue`

**Dependencies:**
- `@/stores/notificationsStore`
- `@/design/semantic/AppList*`

**Testing:**
- Unit: Notification composables
- Unit: Notification components
- E2E: Notifications smoke tests

---

### features/profile/

**Responsibility:** User profile management  
**Routes:** `/profile`, `/profile/settings`, `/profile/edit`  
**Stores:** `profileStore`, `authStore`, `settingsStore`  
**Components:**
- `ProfileHeader.vue`
- `ProfileStats.vue`
- `ProfilePosts.vue`
- `ProfileEditForm.vue`
- `ProfileSettingsForm.vue`

**Dependencies:**
- `@/stores/profileStore`
- `@/stores/authStore`
- `@/stores/settingsStore`
- `@/design/semantic/AppList*`
- `@/design/semantic/AppForm*`

**Testing:**
- Unit: Profile composables
- Unit: Profile components
- E2E: Profile smoke tests

---

### features/home/

**Responsibility:** Main feed/landing page  
**Routes:** `/`  
**Stores:** `postsStore`, `authStore`  
**Components:**
- `HomeFeed.vue`
- `HomeHeader.vue`
- `HomeStoryCarousel.vue`
- `PostCard.vue`

**Dependencies:**
- `@/stores/postsStore`
- `@/stores/authStore`
- `@/design/semantic/AppList*`
- `@/design/semantic/AppPullToRefresh`
- `@/composables/useLargeTitle`

**Testing:**
- Unit: Home composables
- Unit: Feed components
- E2E: Home smoke tests

---

### features/settings/

**Responsibility:** Application settings and preferences  
**Routes:** `/settings`, `/settings/*`  
**Stores:** `settingsStore`, `authStore`  
**Components:**
- `SettingsList.vue`
- `SettingsSection.vue`
- `SettingsToggle.vue`
- `SettingsSelect.vue`

**Dependencies:**
- `@/stores/settingsStore`
- `@/stores/authStore`
- `@/design/semantic/AppList*`
- `@/design/semantic/AppSwitch`
- `@/design/semantic/AppRadioList`
- `@/design/semantic/AppCheckboxList`

**Testing:**
- Unit: Settings composables
- Unit: Settings components
- E2E: Settings smoke tests

---

### features/post/

**Responsibility:** Individual post viewing and interaction  
**Routes:** `/post/:id`  
**Stores:** `postsStore`, `authStore`  
**Components:**
- `PostDetail.vue`
- `PostActions.vue`
- `PostReactions.vue`
- `PostComments.vue`

**Dependencies:**
- `@/stores/postsStore`
- `@/stores/authStore`
- `@/design/semantic/AppList*`

**Testing:**
- Unit: Post composables
- Unit: Post components
- E2E: Post detail smoke tests (future)

---

### features/story/

**Responsibility:** Story viewing and interaction  
**Routes:** `/story/:id`  
**Stores:** `storiesStore`, `authStore`  
**Components:**
- `StoryViewer.vue`
- `StoryControls.vue`
- `StoryReactions.vue`

**Dependencies:**
- `@/stores/storiesStore`
- `@/stores/authStore`
- `@/design/semantic/AppMediaViewer` (future)

**Testing:**
- Unit: Story composables
- Unit: Story components
- E2E: Story viewer smoke tests

---

### features/thread/

**Responsibility:** Thread viewing and interaction  
**Routes:** `/thread/:id`  
**Stores:** `postsStore`, `messagesStore`, `authStore`  
**Components:**
- `ThreadHeader.vue`
- `ThreadMessages.vue`
- `ThreadComposer.vue`

**Dependencies:**
- `@/stores/postsStore`
- `@/stores/messagesStore`
- `@/stores/authStore`
- `@/design/semantic/AppList*`
- `@/design/semantic/AppComposer`

**Testing:**
- Unit: Thread composables
- Unit: Thread components
- E2E: Thread smoke tests

---

## Store Dependencies

### authStore

**File:** `@/stores/authStore.ts`  
**Purpose:** Authentication state and user session management  
**Used by:** All features that require authentication  
**API Dependencies:** Auth API client  
**Platform Dependencies:** `@/platform/capabilityDetection`  

**Responsibilities:**
- User authentication state
- Session management
- Token storage/retrieval
- User profile data
- Auth error handling

---

### postsStore

**File:** `@/stores/postsStore.ts`  
**Purpose:** Post data management  
**Used by:** home, explore, post, thread features  
**API Dependencies:** Posts API client  

**Responsibilities:**
- Post fetching and caching
- Post creation/editing/deletion
- Post reactions
- Post comments

---

### messagesStore

**File:** `@/stores/messagesStore.ts`  
**Purpose:** Message data management  
**Used by:** messages, thread features  
**API Dependencies:** Messages API client  
**Platform Dependencies:** `@/platform/hapticPolicy`  

**Responsibilities:**
- Message fetching and caching
- Message sending/receiving
- Message threads
- Unread count management

---

### notificationsStore

**File:** `@/stores/notificationsStore.ts`  
**Purpose:** Notification data management  
**Used by:** notifications feature  
**API Dependencies:** Notifications API client  

**Responsibilities:**
- Notification fetching
- Notification marking as read
- Unread count management
- Notification preferences

---

### exploreStore

**File:** `@/stores/exploreStore.ts`  
**Purpose:** Explore content and search  
**Used by:** explore feature  
**API Dependencies:** Search API client  

**Responsibilities:**
- Search query management
- Search results caching
- Explore feed content
- Trending content

---

### searchStore

**File:** `@/stores/searchStore.ts`  
**Purpose:** Search state management  
**Used by:** explore feature  

**Responsibilities:**
- Search input state
- Search filters
- Search history

---

### profileStore

**File:** `@/stores/profileStore.ts`  
**Purpose:** User profile data management  
**Used by:** profile feature  
**API Dependencies:** Profile API client  

**Responsibilities:**
- Profile fetching
- Profile editing
- Profile stats
- Profile posts

---

### settingsStore

**File:** `@/stores/settingsStore.ts`  
**Purpose:** Application settings management  
**Used by:** settings feature  

**Responsibilities:**
- App settings persistence
- Theme preferences
- Notification preferences
- Privacy preferences

---

## Semantic Primitives Usage

### Shell Components

| Primitive | Used By | Routes |
|-----------|---------|--------|
| `AppRoot` | All views | All |
| `AppPage` | All views | All |
| `AppShell` | All views | All |
| `AppNavbar` | All views (except auth) | Non-auth |
| `AppToolbar` | All views (except auth) | Non-auth |

### List Components

| Primitive | Used By | Routes |
|-----------|---------|--------|
| `AppList` | home, explore, messages, notifications, profile, settings | `/`, `/explore`, `/messages`, `/notifications`, `/profile`, `/settings` |
| `AppListItem` | home, explore, messages, notifications, profile, settings | Multiple |
| `AppGroupedList` | settings | `/settings/*` |
| `AppVirtualList` | messages (future) | `/messages` (planned) |

### Form Components

| Primitive | Used By | Routes |
|-----------|---------|--------|
| `AppSwitch` | settings | `/settings/*` |
| `AppRadioList` | settings | `/settings/appearance` |
| `AppCheckboxList` | settings | `/settings/notifications`, `/settings/privacy` |
| `AppSlider` | settings | `/settings` (future) |

### Input Components (Planned Migration)

| Primitive | Current Location | Target Location | Used By |
|-----------|------------------|----------------|---------|
| `AppSearchBar` | design/components | design/semantic | explore |
| `AppTextField` | design/components | design/semantic | profile, settings |
| `AppTextArea` | design/components | design/semantic | profile, settings |
| `AppComposer` | design/components | design/semantic | messages, thread |

### Overlay Components (Planned Migration)

| Primitive | Current Location | Target Location | Used By |
|-----------|------------------|----------------|---------|
| `AppSheet` | design/components | design/semantic | messages, profile |
| `AppActionsSheet` | design/components | design/semantic | messages, notifications |

---

## Testing Coverage

### Unit Test Coverage

| Feature | Components | Composables | Stores | Coverage |
|---------|------------|-------------|--------|----------|
| auth | SignInForm, SignupForm | useAuth | authStore | ⚠️ Partial |
| explore | ExploreGrid, ExploreSearch | useExploreSearch | exploreStore, searchStore | ⚠️ Partial |
| home | HomeFeed, PostCard | useHomeFeed | postsStore | ⚠️ Partial |
| messages | MessageList, MessageItem | useMessages | messagesStore | ⚠️ Partial |
| notifications | NotificationList | useNotifications | notificationsStore | ⚠️ Partial |
| profile | ProfileHeader, ProfileEditForm | useProfile | profileStore | ⚠️ Partial |
| settings | SettingsList, SettingsToggle | useSettings | settingsStore | ⚠️ Partial |
| post | PostDetail, PostActions | usePost | postsStore | ❌ Missing |
| story | StoryViewer | useStory | storiesStore | ❌ Missing |
| thread | ThreadMessages | useThread | postsStore, messagesStore | ❌ Missing |

### E2E Test Coverage

| Route | Smoke Test | Accessibility Test | Native Behavior Test | Status |
|-------|------------|-------------------|---------------------|--------|
| `/welcome` | ✅ | ✅ | ⚠️ | Partial |
| `/signin` | ✅ | ✅ | ⚠️ | Partial |
| `/signup` | ✅ | ✅ | ⚠️ | Partial |
| `/` | ✅ | ✅ | ✅ | Good |
| `/explore` | ✅ | ✅ | ✅ | Good |
| `/messages` | ✅ | ✅ | ⚠️ | Partial |
| `/messages/:id` | ❌ | ❌ | ❌ | Missing |
| `/notifications` | ✅ | ✅ | ⚠️ | Partial |
| `/profile` | ✅ | ✅ | ⚠️ | Partial |
| `/settings` | ✅ | ✅ | ✅ | Good |
| `/thread/:id` | ❌ | ❌ | ❌ | Missing |
| `/post/:id` | ❌ | ❌ | ❌ | Missing |
| `/story/:id` | ❌ | ❌ | ❌ | Missing |

---

## Known Gaps

### Missing Components

1. **AppMediaViewer** - Full-screen media viewer not yet implemented in semantic layer
2. **AppDialog** - Dialog/modal component not yet in semantic layer
3. **AppPopover** - Popover component not yet in semantic layer
4. **AppToast** - Toast notification component not yet in semantic layer

### Missing Tests

1. **Post Detail** - No E2E tests for post detail page
2. **Story Viewer** - No E2E tests for story viewer
3. **Thread View** - No E2E tests for thread view
4. **Message Thread** - No E2E tests for individual message threads
5. **Profile Edit** - No unit tests for profile edit components

### Missing Documentation

1. **Component READMEs** - Individual component documentation stubs
2. **Platform Tests** - Dedicated tests for platform utilities
3. **Keyboard Tests** - Regression tests for keyboard behavior
4. **Accessibility Tests** - Automated axe-core tests for all routes

### Technical Debt

1. **design/components Migration** - Several components still in design/components that should be in semantic:
   - AppSheet.vue
   - AppActionsSheet.vue
   - AppSearchBar.vue
   - AppTextField.vue
   - AppTextArea.vue
   - AppComposer.vue
   - AppPullToRefresh.vue

2. **Raw Framework7 in design/components** - Some design/components still import framework7-vue directly

3. **Iconoir Usage Audit** - Need to verify all Iconoir imports are behind AppIcon

---

## Action Items

### High Priority

- [ ] Migrate remaining design/components to semantic layer
- [ ] Add unit tests for all semantic components
- [ ] Add E2E tests for missing critical routes
- [ ] Add platform profile tests
- [ ] Add keyboard/input regression tests

### Medium Priority

- [ ] Implement missing semantic components (AppMediaViewer, AppDialog, etc.)
- [ ] Add component documentation stubs
- [ ] Complete accessibility test coverage
- [ ] Add visual regression test structure

### Low Priority

- [ ] Add demo/mock data governance
- [ ] Document all known limitations
- [ ] Add production logging utility

---

## How to Use This Document

### For Developers

1. **Find Your Route** - Locate the route you're working on in the Route Map
2. **Check Dependencies** - See which stores and semantic primitives are used
3. **Review Testing** - Check what tests exist and what's missing
4. **Identify Gaps** - See known gaps and action items for your area

### For Reviewers

1. **Verify Ownership** - Ensure changes are in the correct feature folder
2. **Check Dependencies** - Verify only allowed dependencies are used
3. **Review Testing** - Ensure tests cover the changed functionality
4. **Validate Architecture** - Confirm changes follow import boundaries

### For Architecture Maintainers

1. **Update Map** - Keep this document updated with new routes/features
2. **Track Gaps** - Monitor and prioritize known gaps
3. **Enforce Boundaries** - Ensure PRs don't introduce architecture violations

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-11 | Initial release - Phase 11 |
