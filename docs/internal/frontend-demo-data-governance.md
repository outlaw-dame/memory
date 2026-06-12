# Frontend Demo/Mock Data Governance

**Version:** 1.0.0  
**Last Updated:** 2026-06-11  
**Status:** ACTIVE - Phase 11  

This document defines the rules and practices for handling demo, mock, and placeholder data in the Memory application. It ensures that demo data cannot accidentally leak into production and that all demo UI is clearly labeled.

---

## Table of Contents

1. [Governance Principles](#1-governance-principles)
2. [Demo Data Classification](#2-demo-data-classification)
3. [Implementation Rules](#3-implementation-rules)
4. [File Naming Conventions](#4-file-naming-conventions)
5. [Environment Detection](#5-environment-detection)
6. [Visual Indicators](#6-visual-indicators)
7. [Data Patterns](#7-data-patterns)
8. [Testing Demo Data](#8-testing-demo-data)
9. [Audit Checklist](#9-audit-checklist)

---

## 1. Governance Principles

### Core Principles

1. **No Production Leaks** - Demo data MUST NOT appear in production builds
2. **Clear Labeling** - All demo data must be clearly identifiable as non-real
3. **Environment Isolation** - Demo data must only appear in development environments
4. **Transparency** - It must be obvious when demo data is being used
5. **Safety** - Demo data must not expose real user information

### Why This Matters

- **User Trust** - Users expect real data, not placeholders
- **Privacy** - Accidental exposure of demo data can reveal implementation details
- **Security** - Demo data can be used to probe application behavior
- **Quality** - Production data should be handled consistently

---

## 2. Demo Data Classification

### Category A: Development-Only Data

Data that is **only** used in development and **never** in production:

| Type | Description | Example | Production Risk |
|------|-------------|---------|-----------------|
| Mock API Responses | Simulated API data for testing | `{ id: 1, name: 'Mock Post' }` | ❌ None |
| Fixture Data | Static data for component development | `const mockUsers = [...]` | ❌ None |
| Storybook Data | Data for component stories | `{ user: mockUser }` | ❌ None |
| Test Data | Data for unit/integration tests | `createTestPost()` | ❌ None |

**Requirements:**
- Only loaded in development mode (`import.meta.env.DEV`)
- Never bundled in production
- Clearly labeled as mock

### Category B: Placeholder Data

Data that appears in the UI but is clearly not real:

| Type | Description | Example | Production Risk |
|------|-------------|---------|-----------------|
| Empty State Text | Text shown when no real data exists | "No posts yet. Start by creating one!" | ❌ None |
| Loading Text | Text shown during loading | "Loading..." | ❌ None |
| Skeleton Text | Text in skeleton loaders | "Loading post..." | ❌ None |
| Placeholder Images | Images shown when no real image | Placeholder avatar | ⚠️ Low |

**Requirements:**
- Clearly not real data
- No personal information
- Visually distinct from real data

### Category C: Demo Mode Data

Data that appears when the app is in a special demo mode:

| Type | Description | Example | Production Risk |
|------|-------------|---------|-----------------|
| Demo User Accounts | Pre-configured demo accounts | `demo_user_1` | ✅ Medium |
| Demo Content | Pre-configured posts, messages | "This is a demo post" | ✅ Medium |
| Onboarding Demos | Demo data shown during onboarding | Demo conversation | ✅ Medium |

**Requirements:**
- Only enabled via explicit feature flag
- Clearly labeled as "Demo Mode"
- Requires user opt-in
- Easily distinguishable from real data

---

## 3. Implementation Rules

### Rule 1: Development-Only Check

**All Category A data MUST be wrapped in development-only checks:**

```ts
// CORRECT - Development only
if (import.meta.env.DEV) {
  // Mock data here
  const mockPosts = [...]
}

// FORBIDDEN - Will leak to production
export const mockPosts = [...]
```

### Rule 2: Feature Flag Check

**All Category C data MUST be behind a feature flag:**

```ts
// CORRECT - Feature flagged
const ENABLE_DEMO_MODE = import.meta.env.VITE_ENABLE_DEMO_MODE === 'true'

if (ENABLE_DEMO_MODE) {
  // Demo data here
}

// CORRECT - Runtime check with development fallback
const isDemoMode = ENABLE_DEMO_MODE || import.meta.env.DEV
```

### Rule 3: Environment Detection

**Always use Vite's environment variables:**

```ts
// CORRECT
import.meta.env.DEV        // true in development
import.meta.env.PROD       // true in production
import.meta.env.MODE       // 'development' or 'production'

// FORBIDDEN - Process.env is Node.js, not browser
if (process.env.NODE_ENV === 'development') { }
```

### Rule 4: Production Guard

**Always check for production before logging or exposing data:**

```ts
// CORRECT
function logDebugInfo(data: any) {
  if (!import.meta.env.PROD) {
    console.log('Debug:', data)
  }
}

// FORBIDDEN - Will log in production
console.log('Debug:', data)
```

---

## 4. File Naming Conventions

### Mock Data Files

Files containing mock data MUST use one of these naming patterns:

```
*.mock.ts          # Mock data
*.fixture.ts       # Test fixtures
*.stories.ts       # Storybook stories
*.demo.ts          # Demo data
*.test-data.ts     # Test data
*.factory.ts       # Data factories
*.seeds.ts         # Database seeds
mock*.ts           # Mock prefix
fixture*.ts        # Fixture prefix
demo*.ts           # Demo prefix
```

### Mock File Examples

```
frontend/src/__tests__/
  ├── fixtures/
  │   ├── mockPosts.fixture.ts
  │   ├── mockUsers.fixture.ts
  │   └── mockMessages.fixture.ts
  ├── factories/
  │   ├── postFactory.mock.ts
  │   ├── userFactory.mock.ts
  │   └── messageFactory.mock.ts
  └── mocks/
      ├── apiResponses.mock.ts
      ├── handlers.mock.ts
      └── stores.mock.ts

frontend/src/components/
  └── StoryCard/
      └── StoryCard.stories.ts

frontend/src/views/
  └── DemoView/
      ├── demoData.ts
      └── DemoView.vue
```

### Mock File Content Example

```ts
// frontend/src/__tests__/fixtures/mockPosts.fixture.ts

/**
 * Mock post data for development and testing
 * NEVER use in production
 */

export interface MockPost {
  id: string
  title: string
  content: string
  author: MockUser
  createdAt: Date
}

// Clearly not real data
const mockUsers: MockUser[] = [
  { id: 'demo_user_1', name: 'Demo User One', avatar: '/images/avatar-placeholder.png' },
  { id: 'demo_user_2', name: 'Demo User Two', avatar: '/images/avatar-placeholder.png' },
]

// Clearly mock data
const mockPosts: MockPost[] = [
  {
    id: 'demo_post_1',
    title: '[DEMO] First Post',
    content: 'This is a demonstration post for development purposes only.',
    author: mockUsers[0],
    createdAt: new Date('2024-01-01'),
  },
  {
    id: 'demo_post_2',
    title: '[DEMO] Second Post',
    content: 'This is another demo post to show how the UI looks with content.',
    author: mockUsers[1],
    createdAt: new Date('2024-01-02'),
  },
]

// Guard against production use
export function getMockPosts(): MockPost[] {
  if (import.meta.env.PROD) {
    console.warn('[Mock Data] Attempted to access mock posts in production!')
    return []
  }
  return mockPosts
}

export { mockPosts, mockUsers }
```

---

## 5. Environment Detection

### Vite Environment Variables

Vite provides these built-in environment variables:

```ts
import.meta.env.MODE          // 'development' or 'production'
import.meta.env.BASE_URL      // Base URL
import.meta.env.PROD          // true in production
import.meta.env.DEV           // true in development
import.meta.env.SSR           // true in SSR
```

### Custom Environment Variables

Define custom variables in `.env` files:

```
# .env.development
VITE_ENABLE_DEMO_MODE=true
VITE_MOCK_API=false

# .env.production
VITE_ENABLE_DEMO_MODE=false
VITE_MOCK_API=false

# .env.test
VITE_ENABLE_DEMO_MODE=true
VITE_MOCK_API=true
```

Access them in code:

```ts
const enableDemo = import.meta.env.VITE_ENABLE_DEMO_MODE === 'true'
const useMockAPI = import.meta.env.VITE_MOCK_API === 'true'
```

### Environment Detection Utility

Create a utility for consistent environment checks:

```ts
// frontend/src/utils/environment.ts

export const isDev = import.meta.env.DEV
export const isProd = import.meta.env.PROD
export const isTest = import.meta.env.MODE === 'test'
export const isDemoMode = import.meta.env.VITE_ENABLE_DEMO_MODE === 'true'

export function assertDev(): asserts isDev {
  if (!isDev) {
    throw new Error('This function should only be called in development')
  }
}

export function assertProd(): asserts isProd {
  if (!isProd) {
    throw new Error('This function should only be called in production')
  }
}
```

---

## 6. Visual Indicators

### UI Watermarks

All demo UI MUST have visual indicators:

```vue
<!-- Demo mode banner -->
<template>
  <div v-if="isDemoMode" class="demo-banner">
    🔧 DEMO MODE - Not real data
  </div>
</template>

<style>
.demo-banner {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(255, 200, 0, 0.9);
  color: black;
  padding: 8px;
  text-align: center;
  font-weight: bold;
  z-index: 10000;
}
</style>
```

### Placeholder Styling

Placeholder content should be visually distinct:

```css
/* Placeholder text styling */
.placeholder-text {
  color: var(--color-placeholder, #999);
  font-style: italic;
}

/* Placeholder image styling */
.placeholder-image {
  background: linear-gradient(135deg, #eee 25%, #ddd 25%);
  background-size: 400% 400%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 0% 0%; }
  100% { background-position: 100% 100%; }
}
```

### Empty State Indicators

Empty states should be helpful and clear:

```vue
<template>
  <div v-if="posts.length === 0" class="empty-state">
    <AppIcon name="inbox" :size="48" />
    <h3>No posts yet</h3>
    <p>Start by creating your first post</p>
    <AppButton @click="createPost">Create Post</AppButton>
  </div>
</template>
```

### Demo User Indicators

Demo users should be clearly labeled:

```vue
<template>
  <div class="user-card">
    <Avatar :src="user.avatar" />
    <div class="user-info">
      <span class="user-name">{{ user.name }}</span>
      <span v-if="user.isDemo" class="demo-badge">DEMO</span>
    </div>
  </div>
</template>

<style>
.demo-badge {
  background: var(--color-warning);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: bold;
  margin-left: 8px;
}
</style>
```

---

## 7. Data Patterns

### Mock User Data

```ts
// CORRECT - Clearly demo users
const mockUsers = [
  {
    id: 'demo_user_1',
    name: 'Demo User',
    username: 'demo.user',
    email: 'demo+1@example.com',  // Clearly not real
    avatar: '/images/avatar-placeholder.svg',
    bio: 'This is a demo user for development purposes.',
    isDemo: true,  // Explicit flag
  },
]

// FORBIDDEN - Looks real
const mockUsers = [
  {
    id: '123',
    name: 'John Smith',
    email: 'john.smith@gmail.com',  // Looks real!
    avatar: '/images/avatar.jpg',
  },
]
```

### Mock Post Content

```ts
// CORRECT - Clearly placeholder
const mockPosts = [
  {
    id: 'demo_post_1',
    title: 'Sample Post Title',
    content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit...',
    isDemo: true,
  },
]

// FORBIDDEN - Could be real
const mockPosts = [
  {
    id: '1',
    title: 'My First Post',
    content: 'Today I went to the park and had a great time...',
  },
]
```

### Mock Messages

```ts
// CORRECT - Clearly demo
const mockMessages = [
  {
    id: 'demo_message_1',
    sender: mockUsers[0],
    recipient: mockUsers[1],
    content: '[Demo] Hello, how are you?',
    timestamp: new Date(),
    isDemo: true,
  },
]

// FORBIDDEN - Could be real
const mockMessages = [
  {
    id: '1',
    sender: users[0],
    recipient: users[1],
    content: 'Hey, want to meet up tomorrow?',
    timestamp: new Date(),
  },
]
```

---

## 8. Testing Demo Data

### Unit Tests

Test that demo data is properly guarded:

```ts
import { describe, it, expect, vi } from 'vitest'
import { getMockPosts, mockPosts } from '@/__tests__/fixtures/mockPosts.fixture'

describe('Mock Data', () => {
  it('should not expose mock data in production', () => {
    // Simulate production
    vi.stubEnv('NODE_ENV', 'production')
    
    // In production, getMockPosts should return empty array
    const posts = getMockPosts()
    expect(posts).toEqual([])
  })

  it('should expose mock data in development', () => {
    // Simulate development
    vi.stubEnv('NODE_ENV', 'development')
    
    const posts = getMockPosts()
    expect(posts.length).toBeGreaterThan(0)
    expect(posts[0].id).toMatch(/^demo_/)
  })

  it('should have demo identifiers', () => {
    mockPosts.forEach(post => {
      // All mock posts should have demo in ID or isDemo flag
      expect(post.id).toMatch(/demo|mock/i)
      expect(post.isDemo).toBe(true)
    })
  })

  it('should not contain real-looking data', () => {
    mockPosts.forEach(post => {
      // Title should not look like real content
      expect(post.title).not.toMatch(/^[A-Z][a-z]+/)
      
      // Content should be placeholder or have demo prefix
      expect(post.content).toMatch(/lorem|ipsum|demo|sample/i)
    })
  })
})
```

### E2E Tests

Test that demo mode shows appropriate UI:

```ts
import { test, expect } from '@playwright/test'

test.describe('Demo Mode', () => {
  test('should show demo banner when enabled', async ({ page }) => {
    // Set demo mode flag
    await page.goto('/?demoMode=true')
    
    const banner = page.getByText(/DEMO MODE/i)
    await expect(banner).toBeVisible()
  })

  test('should not show demo banner in production', async ({ page }) => {
    await page.goto('/')
    
    const banner = page.getByText(/DEMO MODE/i)
    await expect(banner).not.toBeVisible()
  })

  test('should show placeholder avatars for demo users', async ({ page }) => {
    // Set demo mode
    await page.goto('/?demoMode=true')
    
    const avatars = page.getByRole('img', { name: /avatar/i })
    await expect(avatars).toHaveCountGreaterThan(0)
    
    // Check that avatars are placeholders
    for (const avatar of await avatars.all()) {
      const src = await avatar.getAttribute('src')
      expect(src).toMatch(/placeholder|demo|default/i)
    }
  })
})
```

---

## 9. Audit Checklist

### For New Demo Data

- [ ] **File Location** - Demo data is in appropriate directory (`__tests__`, `mocks`, etc.)
- [ ] **File Naming** - File name includes `mock`, `fixture`, `demo`, or `test`
- [ ] **Environment Check** - Data is wrapped in `import.meta.env.DEV` or feature flag
- [ ] **Data Format** - Data is clearly not real (demo prefixes, placeholder content)
- [ ] **Type Safety** - Data has proper TypeScript types
- [ ] **Documentation** - File has header comment explaining it's mock data

### For Existing Code Audit

Search for potential demo data leaks:

```bash
# Search for potentially real-looking mock data
grep -r "john\|jane\|doe\|smith" frontend/src --include="*.ts" --include="*.vue"

# Search for real email domains in mocks
grep -r "@gmail\|@yahoo\|@outlook" frontend/src/__tests__ --include="*.ts"

# Search for mock data not in test directories
find frontend/src -name "*.ts" -not -path "*/__tests__/*" -not -path "*/node_modules/*" -exec grep -l "mock\|demo\|fixture" {} \;

# Search for process.env (should use import.meta.env in Vite)
grep -r "process.env" frontend/src --include="*.ts" --include="*.vue"
```

### Production Build Check

1. **Build the app:**
   ```bash
   bun run build
   ```

2. **Check the dist directory:**
   ```bash
   # Check for mock data in production build
   grep -r "demo_user\|mockPost\|fixture" dist/
   
   # Should find nothing
   ```

3. **Check bundle contents:**
   ```bash
   # Check what's in the bundle
   bunx vite-bundle-visualizer dist/
   
   # Look for mock data modules
   ```

---

## Demo Data Violations

### High Severity (Must Fix Immediately)

1. **Mock data in production bundle**
   - Mock data that gets bundled in production
   - Fix: Add `import.meta.env.DEV` guard

2. **Real-looking mock data**
   - Mock data that could be mistaken for real user data
   - Fix: Add prefixes (demo_, mock_) or use placeholder content

3. **Sensitive data in mocks**
   - Real passwords, tokens, or PII in mock data
   - Fix: Use placeholder values and remove real data

### Medium Severity (Fix Soon)

1. **Missing file naming convention**
   - Mock data file without mock/demo/fixture in name
   - Fix: Rename file to follow convention

2. **Missing visual indicators**
   - Demo UI without clear labeling
   - Fix: Add demo banner or watermark

3. **Missing type annotations**
   - Mock data without TypeScript types
   - Fix: Add proper types

### Low Severity (Fix When Convenient)

1. **Missing documentation**
   - Mock data file without header comment
   - Fix: Add comment explaining purpose

2. **Inconsistent patterns**
   - Demo data not following established patterns
   - Fix: Align with patterns in this document

---

## Reporting Demo Data Issues

If you find demo data that violates these rules:

1. **Create an issue:**
   - Title: `[Demo Data] <description>`
   - Label: `demo-data`, `security`
   - Priority: Based on severity above

2. **Include details:**
   - Location of the violation
   - Type of violation
   - Suggested fix
   - Severity assessment

3. **Fix immediately if high severity**

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-11 | Initial release - Phase 11 |
