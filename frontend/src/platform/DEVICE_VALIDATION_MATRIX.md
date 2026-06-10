# Phase 10: Manual Device Validation Matrix

## Overview

This document defines the manual device validation requirements for Phase 10: Native UI Consolidation, Hardening, and Release Readiness.

**Document Date:** 2026-06-09  
**Scope:** Device testing requirements, test cases, acceptance criteria  
**Priority:** Medium (Important for release readiness)

---

## Device Categories

### Priority 1: Primary Target Devices (Must Test)

#### iOS Devices

| Device | iOS Version | Screen Size | Notes | Status |
|--------|-------------|-------------|-------|--------|
| iPhone 15 | 17.x | 6.1" | Latest iPhone | ⬜ Not Tested |
| iPhone 15 Pro | 17.x | 6.1" | Pro model | ⬜ Not Tested |
| iPhone 14 | 16.x | 6.1" | Previous gen | ⬜ Not Tested |
| iPhone SE (3rd gen) | 17.x | 4.7" | Small screen | ⬜ Not Tested |
| iPad Pro (12.9") | 17.x | 12.9" | Large tablet | ⬜ Not Tested |
| iPad Air (5th gen) | 17.x | 10.9" | Mid-size tablet | ⬜ Not Tested |

#### Android Devices

| Device | Android Version | Screen Size | Notes | Status |
|--------|------------------|-------------|-------|--------|
| Google Pixel 8 | 14 | 6.2" | Latest Pixel | ⬜ Not Tested |
| Google Pixel 8 Pro | 14 | 6.7" | Pro model | ⬜ Not Tested |
| Samsung Galaxy S24 | 14 | 6.2" | Latest Samsung | ⬜ Not Tested |
| Samsung Galaxy S23 | 13 | 6.1" | Previous gen | ⬜ Not Tested |
| Samsung Galaxy A54 | 14 | 6.4" | Mid-range | ⬜ Not Tested |
| Samsung Galaxy Tab S9 | 14 | 11" | Tablet | ⬜ Not Tested |

#### Desktop Browsers

| Browser | Version | OS | Notes | Status |
|---------|---------|----|-------|--------|
| Chrome | Latest | macOS | Primary desktop | ⬜ Not Tested |
| Chrome | Latest | Windows 10/11 | Primary desktop | ⬜ Not Tested |
| Safari | Latest | macOS | Primary for Mac users | ⬜ Not Tested |
| Firefox | Latest | macOS/Windows | Secondary | ⬜ Not Tested |
| Edge | Latest | Windows | Secondary | ⬜ Not Tested |

### Priority 2: Secondary Devices (Should Test)

#### iOS Devices

| Device | iOS Version | Screen Size | Notes |
|--------|-------------|-------------|-------|
| iPhone 13 | 15.x-17.x | 6.1" | Common device |
| iPhone 12 | 15.x-17.x | 6.1" | Still widely used |
| iPhone 11 | 15.x-17.x | 6.1" | Budget iPhone |
| iPad Mini (6th gen) | 17.x | 8.3" | Small tablet |

#### Android Devices

| Device | Android Version | Screen Size | Notes |
|--------|------------------|-------------|-------|
| OnePlus 12 | 14 | 6.8" | Popular brand |
| Xiaomi 14 | 14 | 6.4" | International market |
| Motorola Moto G (2024) | 13-14 | 6.5" | Budget device |
| Google Pixel 7 | 13 | 6.3" | Older flagship |

### Priority 3: Edge Cases (Consider Testing)

| Device/Environment | Notes | Priority |
|--------------------|-------|----------|
| iOS Simulator | Various iOS versions | Low |
| Android Emulator | Various Android versions | Low |
| iPhone with VoiceOver | Accessibility testing | Medium |
| Android with TalkBack | Accessibility testing | Medium |
| Reduced Motion enabled | Accessibility preference | Medium |
| Dark Mode | Theme testing | Medium |
| Low battery mode | Performance testing | Low |
| Slow network (3G) | Performance testing | Medium |
| Offline mode | PWA testing | High |

---

## Test Cases by Feature

### Core App Functionality

#### Test Case 1: App Launch

| Step | Action | Expected Result | Priority |
|------|--------|-----------------|----------|
| 1 | Launch app (native) | App opens without errors | P0 |
| 2 | Launch app (PWA) | App opens without errors | P0 |
| 3 | Launch app (browser) | App opens without errors | P0 |
| 4 | Verify splash screen (if configured) | Splash screen displays | P1 |
| 5 | Verify initial load time | < 2 seconds | P1 |

**Platforms:** All iOS, All Android, All Desktop  
**Status:** ⬜ Not Tested

#### Test Case 2: Authentication Flow

| Step | Action | Expected Result | Priority |
|------|--------|-----------------|----------|
| 1 | Open sign in page | Page loads correctly | P0 |
| 2 | Enter valid credentials | Form accepts input | P0 |
| 3 | Submit form | Authentication succeeds | P0 |
| 4 | Navigate to home | Redirected to home | P0 |
| 5 | Sign out | Returns to sign in | P0 |

**Platforms:** All iOS, All Android, All Desktop  
**Status:** ⬜ Not Tested

### Navigation

#### Test Case 3: Tab Navigation

| Step | Action | Expected Result | Priority |
|------|--------|-----------------|----------|
| 1 | Tap Home tab | Home feed displays | P0 |
| 2 | Tap Explore tab | Explore page displays | P0 |
| 3 | Tap Messages tab | Messages list displays | P0 |
| 4 | Tap Notifications tab | Notifications list displays | P0 |
| 5 | Tap Profile tab | Profile page displays | P0 |
| 6 | Verify active tab state | Active tab is highlighted | P1 |

**Platforms:** All iOS, All Android, All Desktop  
**Status:** ⬜ Not Tested

#### Test Case 4: Deep Linking

| Step | Action | Expected Result | Priority |
|------|--------|-----------------|----------|
| 1 | Open deep link (memory://post/123) | App opens to post | P1 |
| 2 | Open deep link from external app | App opens to correct content | P1 |
| 3 | Open deep link when not installed | Redirects to web | P2 |

**Platforms:** All iOS, All Android  
**Status:** ⬜ Not Tested

### Native Features

#### Test Case 5: Status Bar (Native)

| Step | Action | Expected Result | Priority |
|------|--------|-----------------|----------|
| 1 | Launch app on iOS | Status bar is light | P0 |
| 2 | Launch app on Android | Status bar is light | P0 |
| 3 | Verify status bar overlay | Web view overlays status bar | P0 |

**Platforms:** All iOS, All Android  
**Status:** ⬜ Not Tested

#### Test Case 6: Back Button (Android)

| Step | Action | Expected Result | Priority |
|------|--------|-----------------|----------|
| 1 | Navigate to detail page | Page displays | P0 |
| 2 | Press hardware back button | Returns to previous page | P0 |
| 3 | Press back at root | Exits app | P0 |

**Platforms:** All Android  
**Status:** ⬜ Not Tested

#### Test Case 7: Keyboard (Native)

| Step | Action | Expected Result | Priority |
|------|--------|-----------------|----------|
| 1 | Focus text input | Keyboard appears | P0 |
| 2 | Enter text | Text is entered | P0 |
| 3 | Dismiss keyboard | Keyboard hides | P0 |
| 4 | Verify keyboard avoidance | Input visible above keyboard | P0 |

**Platforms:** All iOS, All Android  
**Status:** ⬜ Not Tested

#### Test Case 8: Haptics

| Step | Action | Expected Result | Priority |
|------|--------|-----------------|----------|
| 1 | Perform haptic-triggering action | Device vibrates/haptic feedback | P1 |
| 2 | Verify rate limiting | Rapid actions don't cause excessive haptics | P1 |

**Platforms:** All iOS, All Android (native only)  
**Status:** ⬜ Not Tested

### PWA Features

#### Test Case 9: Install Prompt

| Step | Action | Expected Result | Priority |
|------|--------|-----------------|----------|
| 1 | Open app in Chrome | PWA install prompt may appear | P1 |
| 2 | Accept install prompt | App installs to home screen | P1 |
| 3 | Launch from home screen | App opens as PWA | P0 |
| 4 | Verify standalone mode | No browser chrome | P0 |

**Platforms:** Chrome (Android, desktop), Edge, Safari  
**Status:** ⬜ Not Tested

#### Test Case 10: Offline Mode

| Step | Action | Expected Result | Priority |
|------|--------|-----------------|----------|
| 1 | Load app with network | App loads normally | P0 |
| 2 | Go offline | App continues to work | P0 |
| 3 | Navigate app offline | Cached content displays | P1 |
| 4 | Reconnect to network | App syncs data | P1 |

**Platforms:** All platforms  
**Status:** ⬜ Not Tested

### Accessibility

#### Test Case 11: Screen Reader

| Step | Action | Expected Result | Priority |
|------|--------|-----------------|----------|
| 1 | Enable VoiceOver/TalkBack | Screen reader activated | P0 |
| 2 | Navigate app | All elements are announced | P0 |
| 3 | Interact with elements | Actions are announced | P0 |
| 4 | Verify alt text | Images have descriptive text | P0 |

**Platforms:** iOS (VoiceOver), Android (TalkBack)  
**Status:** ⬜ Not Tested

#### Test Case 12: Reduced Motion

| Step | Action | Expected Result | Priority |
|------|--------|-----------------|----------|
| 1 | Enable reduced motion | System preference set | P0 |
| 2 | Launch app | Gestures are disabled | P0 |
| 3 | Pull to refresh | Gesture not available | P0 |
| 4 | Swipe gestures | Gestures not available | P0 |

**Platforms:** All iOS, All Android, All Desktop  
**Status:** ⬜ Not Tested

#### Test Case 13: Color Contrast

| Step | Action | Expected Result | Priority |
|------|--------|-----------------|----------|
| 1 | View all screens | Text is readable | P0 |
| 2 | Enable high contrast mode | Text remains readable | P1 |
| 3 | Verify WCAG AA | All text meets contrast requirements | P1 |

**Platforms:** All platforms  
**Status:** ⬜ Not Tested

### Safe Area

#### Test Case 14: Notched Devices

| Step | Action | Expected Result | Priority |
|------|--------|-----------------|----------|
| 1 | View app on iPhone with notch | Content not obscured | P0 |
| 2 | View app on Android with notch | Content not obscured | P0 |
| 3 | View app on iPad with notch | Content not obscured | P0 |
| 4 | Verify bottom safe area | Tab bar not obscured by home indicator | P0 |
| 5 | Verify top safe area | Top bar not obscured by notch | P0 |

**Platforms:** All iOS with notch, All Android with notch  
**Status:** ⬜ Not Tested

### Performance

#### Test Case 15: Load Performance

| Step | Action | Expected Result | Priority |
|------|--------|-----------------|----------|
| 1 | Cold start app | < 2 seconds to interactive | P0 |
| 2 | Warm start app | < 1 second to interactive | P0 |
| 3 | Navigate between pages | < 500ms | P1 |
| 4 | Scroll feed | 60 FPS | P1 |

**Platforms:** All devices  
**Status:** ⬜ Not Tested

#### Test Case 16: Memory Usage

| Step | Action | Expected Result | Priority |
|------|--------|-----------------|----------|
| 1 | Launch app | Memory < 200MB | P1 |
| 2 | Use app for 10 minutes | Memory < 300MB | P1 |
| 3 | Navigate many pages | No memory leaks | P1 |

**Platforms:** All devices  
**Status:** ⬜ Not Tested

#### Test Case 17: Battery Impact

| Step | Action | Expected Result | Priority |
|------|--------|-----------------|----------|
| 1 | Use app for 1 hour | Battery drain < 10% | P2 |
| 2 | Background app | Minimal battery drain | P2 |

**Platforms:** Mobile devices only  
**Status:** ⬜ Not Tested

---

## Test Environment Setup

### Prerequisites

1. **Development Environment**
   - Node.js 22.x
   - npm/yarn/pnpm
   - Git
   - Android Studio (for Android builds)
   - Xcode (for iOS builds)

2. **Devices**
   - Physical devices for primary testing
   - Simulators/emulators for secondary testing
   - Various OS versions

3. **Tools**
   - Chrome DevTools
   - Safari Web Inspector
   - Android Studio Profiler
   - Xcode Instruments
   - Lighthouse
   - WebPageTest

### Setup Commands

```bash
# Install dependencies
npm install

# Build app for testing
npm run build

# Sync to Android
npx cap sync android
npx cap open android

# Sync to iOS
npx cap sync ios
npx cap open ios

# Start dev server for web testing
npm run dev
```

---

## Test Reporting

### Test Run Template

```markdown
## Device Validation Report

**Test Date:** YYYY-MM-DD  
**Tester:** [Name]  
**Device:** [Device Name, OS Version]  

### Results Summary

| Test Case | Result | Notes | Bug # |
|-----------|--------|-------|-------|
| App Launch | ✅ Pass | | |
| Authentication Flow | ✅ Pass | | |
| Tab Navigation | ✅ Pass | | |
| ... | | | |

### Issues Found

1. **[Issue Title]**
   - **Severity:** [Critical/High/Medium/Low]
   - **Steps to Reproduce:** [Steps]
   - **Expected:** [Expected behavior]
   - **Actual:** [Actual behavior]
   - **Device:** [Device info]
   - **Screenshot:** [Link]

### Notes

[Any additional notes, observations, or recommendations]
```

### Severity Levels

| Severity | Description | Example |
|----------|-------------|---------|
| **Critical** | App crash, data loss, security issue | App crashes on launch |
| **High** | Major feature broken, severe UX issue | Cannot sign in |
| **Medium** | Minor feature broken, UX issue | Button doesn't work |
| **Low** | Cosmetic issue, minor improvement | Misaligned text |

---

## Test Schedule

### Pre-Release Testing (Recommended)

#### Week 1: Primary Devices
- iPhone 15, 14, SE
- Google Pixel 8, 7
- Samsung Galaxy S24, S23
- Chrome, Safari, Firefox (desktop)

#### Week 2: Secondary Devices
- iPhone 13, 12, 11
- OnePlus 12, Xiaomi 14
- iPad Pro, iPad Air
- Edge (desktop)

#### Week 3: Edge Cases & Accessibility
- iOS Simulator (various versions)
- Android Emulator (various versions)
- VoiceOver/TalkBack testing
- Reduced motion testing
- Various network conditions

### Regression Testing

Run before each release:
1. All critical test cases (P0)
2. All high priority test cases (P1)
3. Sample of medium priority test cases (P2)

---

## Automation Opportunities

### Test Automation Candidates

| Test Case | Automation Difficulty | Priority | Notes |
|-----------|----------------------|----------|-------|
| App Launch | Low | High | Can automate with Playwright |
| Authentication Flow | Medium | High | Can automate with Playwright |
| Tab Navigation | Low | High | Can automate with Playwright |
| Deep Linking | Medium | Medium | Requires device setup |
| Status Bar | High | Low | Native-only |
| Back Button | Medium | Medium | Android-only |
| Keyboard | Medium | Medium | Native-only |
| Haptics | High | Low | Native-only, hard to verify |
| Install Prompt | High | Medium | PWA-specific |
| Offline Mode | Medium | High | Can test with service worker |
| Screen Reader | High | Low | Accessibility testing |
| Reduced Motion | Low | High | Can test with CSS media queries |
| Color Contrast | Medium | Medium | Visual testing |
| Notched Devices | Medium | Medium | Visual testing |
| Load Performance | Low | High | Can use Lighthouse |
| Memory Usage | Medium | Medium | Requires profiling tools |
| Battery Impact | High | Low | Requires hardware |

### Recommended Automation Setup

```bash
# Install Playwright
npm install --save-dev @playwright/test

# Initialize Playwright
npx playwright init

# Run tests
npx playwright test

# Run specific test file
npx playwright test src/__tests__/e2e/smoke.spec.ts

# Generate HTML report
npx playwright test --reporter=html
```

---

## Success Criteria

### Release Readiness Checklist

- [ ] All P0 test cases pass on primary devices
- [ ] All P1 test cases pass on primary devices
- [ ] No critical issues open
- [ ] No high severity issues open (or documented as known issues)
- [ ] PWA install works on Chrome and Safari
- [ ] Native builds work on iOS and Android
- [ ] Accessibility tests pass
- [ ] Performance meets targets

### Quality Gates

| Metric | Target | Current |
|--------|--------|---------|
| P0 Test Pass Rate | 100% | TBD |
| P1 Test Pass Rate | 95%+ | TBD |
| P2 Test Pass Rate | 80%+ | TBD |
| Critical Issues | 0 | TBD |
| High Issues | 0 | TBD |
| Crash-Free Rate | 99.9% | TBD |

---

## Summary

**Overall Device Validation Status:** ⚠️ **NOT STARTED**

This matrix defines the comprehensive device testing requirements for the memory app. Currently, no manual device validation has been performed.

**Priority Breakdown:**
- **P0 (Critical):** 5 test cases - Must pass on all primary devices
- **P1 (High):** 10+ test cases - Should pass on all primary devices
- **P2 (Medium):** 15+ test cases - Nice to have on primary devices

**Primary Device Count:**
- iOS: 6 devices
- Android: 6 devices
- Desktop: 5 browsers

**Estimated Testing Effort:**
- Per device: 2-4 hours (depending on test cases run)
- Full matrix: 40-80 hours
- Per release: 10-20 hours (regression testing)

**Recommendation:**
1. Start with P0 test cases on primary devices
2. Expand to P1 test cases
3. Automate what can be automated (Playwright)
4. Create known issues list for any failures
5. Track pass/fail rates over time

---

**Next Steps:**
1. Begin testing with primary devices
2. Create test run reports
3. Fix any critical issues found
4. Document known issues
5. Set up automated testing (Playwright)
6. Proceed to Final Documentation Updates (Step 19)
