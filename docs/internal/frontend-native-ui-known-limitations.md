# Frontend Native UI Known Limitations

**Version:** 1.0.0  
**Last Updated:** 2026-06-11  
**Status:** ACTIVE - Phase 11  

This document transparently lists all known limitations of the Memory application's frontend architecture. These limitations help developers understand constraints, make informed decisions, and avoid rediscovering already-known issues.

---

## Table of Contents

1. [PWA vs True Native Limitations](#1-pwa-vs-true-native-limitations)
2. [Platform-Specific Limitations](#2-platform-specific-limitations)
3. [Framework7 Limitations](#3-framework7-limitations)
4. [Browser/Engine Limitations](#4-browsengine-limitations)
5. [Accessibility Limitations](#5-accessibility-limitations)
6. [Performance Limitations](#6-performance-limitations)
7. [Feature Limitations](#7-feature-limitations)
8. [Planned Future Enhancements](#8-planned-future-enhancements)

---

## 1. PWA vs True Native Limitations

Progressive Web Apps (PWAs) running in browsers have inherent limitations compared to true native apps (Swift/Kotlin). This section documents these differences.

### Installation and Distribution

| Aspect | True Native (Swift/Kotlin) | PWA (Capacitor) | Notes |
|--------|----------------------------|----------------|-------|
| App Store Distribution | ✅ Yes | ✅ Yes (via Capacitor) | Capacitor apps can be published to app stores |
| App Store Review | Required | Required | Same review process |
| Installation Size | Small (native code) | Larger (includes web runtime) | ~10-20MB overhead for runtime |
| Update Mechanism | App Store review required | Code push + App Store | Can push web updates without store review |
| Offline Capability | Full | Partial | Depends on service worker implementation |
| Background Execution | Yes | Limited | iOS restricts background execution |

### Device Integration

| Feature | True Native | PWA (Capacitor) | iOS Notes | Android Notes |
|---------|-------------|----------------|-----------|--------------|
| Push Notifications | ✅ Full | ✅ Full | Uses APNs | Uses FCM |
| Background Sync | ✅ | ❌ | Not allowed | Limited |
| Background Location | ✅ | ❌ | Not allowed | Limited |
| Background Audio | ✅ | ⚠️ | Limited | ✅ |
| Camera Access | ✅ | ✅ | Yes | Yes |
| Photo Library | ✅ | ✅ | Yes | Yes |
| Contacts Access | ✅ | ✅ | Yes (with permissions) | Yes |
| Calendar Access | ✅ | ✅ | Yes | Yes |
| Filesystem Access | ✅ | ⚠️ | Sandboxed | Limited |
| Bluetooth | ✅ | ❌ | No | No |
| NFC | ✅ | ❌ | No | No |
| HealthKit/Google Fit | ✅ | ❌ | No | No |
| Face ID/Touch ID | ✅ | ✅ | Via Capacitor Biometrics | Via Capacitor Biometrics |
| Apple Pay/Google Pay | ✅ | ⚠️ | Limited | Limited |
| Deep Links | ✅ | ✅ | Yes | Yes |
| Universal Links | ✅ | ✅ | Yes | Yes |
| App Clips/Instant Apps | ✅ | ❌ | No | No |
| Widgets | ✅ (iOS) | ❌ | No | No (Android has widgets but limited) |
| Live Activities | ✅ (iOS) | ❌ | No | N/A |
| Dynamic Island | ✅ (iOS) | ❌ | No | N/A |

### Native Feel Limitations

| Aspect | True Native | PWA | Notes |
|--------|-------------|-----|-------|
| Navigation Animations | Native transitions | Framework7 animations | Close but not identical |
| Scroll Physics | Native momentum | CSS/JS momentum | Can be tuned but not identical |
| Pull to Refresh | Native | Framework7 implementation | Good but may differ slightly |
| Swipe Back | Native | Framework7 implementation | Good but may differ slightly |
| Status Bar | Native | Custom | Can be styled but limited |
| Safe Area Handling | Native | Custom (Capacitor) | Good with proper configuration |
| Haptic Feedback | Native | Capacitor Haptics | Limited to supported patterns |
| Keyboard | Native | Browser | Can be optimized but not identical |

### iOS-Specific PWA Limitations

1. **No True Background Execution**
   - iOS suspends PWAs when backgrounded
   - No background sync, push notifications require app to be open or user interaction
   - Workaround: Use Capacitor's background task APIs where available

2. **No Custom URL Schemes for Deep Links**
   - iOS requires HTTPS for PWA deep links
   - Universal Links work but have limitations
   - Workaround: Use HTTPS deep links

3. **Limited File System Access**
   - Cannot access iCloud Drive, Dropbox, etc. directly
   - Workaround: Use Capacitor File System API for sandboxed access

4. **No iCloud Sync**
   - Cannot use iCloud Keychain, iCloud Documents, etc.
   - Workaround: Use alternative cloud sync solutions

5. **No Apple-Specific Features**
   - No Siri integration
   - No Handoff
   - No AirDrop
   - No AirPlay
   - No iMessage integration

6. **WebKit Restrictions**
   - All iOS PWAs use WKWebView
   - Some web APIs have reduced functionality
   - Limited to iOS 12.2+ features in WKWebView

### Android-Specific PWA Limitations

1. **Chrome Required**
   - Best experience on Chrome/Chromium-based browsers
   - Other browsers may have limited PWA support

2. **No True Background Services**
   - Android restricts background execution for PWAs
   - Workaround: Use Foreground Services or WorkManager

3. **Limited Notification Customization**
   - Cannot customize notification icons as fully as native
   - Notification channels limited

4. **No Android-Specific Features**
   - No Android Beam
   - No Android Auto
   - No Wear OS
   - No Google Assistant integration

---

## 2. Platform-Specific Limitations

### iOS Safari Limitations

| Feature | Limitation | Workaround |
|---------|------------|------------|
| Viewport Units | `100vh` behaves inconsistently | Use `-webkit-fill-available` |
| Position Sticky | Buggy with overflow containers | Use alternative approaches |
| CSS Grid | Some features missing in older iOS | Check caniuse |
| Scroll Snap | Buggy in some cases | Test thoroughly |
| Touch Action | `none` breaks scrolling | Use passive event listeners |
| File Input | Styling limitations | Use custom file input |
| Date/Time Input | Inconsistent appearance | Use custom date picker |
| Select Elements | Styling limitations | Use custom select |
| Range Input | Styling limitations | Use custom range (AppSlider) |
| Focus Styles | Inconsistent | Use custom focus indicators |
| WebP Support | Only iOS 14+ | Provide fallbacks |
| AVIF Support | Only iOS 16+ | Provide fallbacks |
| WebRTC | Limited in WKWebView | Use Capacitor plugins |
| Web Bluetooth | Not supported | N/A |
| WebHID | Not supported | N/A |
| WebUSB | Not supported | N/A |
| Device Memory API | Not supported | N/A |
| Battery Status API | Deprecated | N/A |

### Android Chrome Limitations

| Feature | Limitation | Workaround |
|---------|------------|------------|
| Viewport Units | `100vh` includes address bar | Use `dvh` or JavaScript |
| CSS Scroll Snap | Buggy in some cases | Test thoroughly |
| CSS Grid | Some features missing in older Android | Check caniuse |
| Web Components | Custom Elements v0 polyfill needed for old Android | Use polyfill or avoid |
| File System Access | Limited | Use Capacitor File System API |
| WebP Support | Good | Use WebP |
| AVIF Support | Chrome 85+ | Provide fallbacks |
| Service Worker | Limited in some browsers | Feature detect |
| Notification API | Limited customization | Use Capacitor plugins |

### Desktop Browser Limitations

| Feature | Limitation | Notes |
|---------|------------|-------|
| Touch Events | Not available | Use mouse events |
| Device Orientation | Not available | Use resize observer |
| Geolocation | User permission required | Works but needs permission |
| Camera/Microphone | User permission required | Works but needs permission |
| Safe Area Insets | Not applicable | Desktop doesn't have notches |
| Haptic Feedback | Not available | N/A |

---

## 3. Framework7 Limitations

Framework7 is a UI framework that mimics native iOS and Material Design. While it provides excellent native-like behavior, it has some limitations.

### Framework7 Vue Limitations

| Feature | Limitation | Workaround |
|---------|------------|------------|
| Server-Side Rendering | Limited SSR support | Use client-side hydration |
| TypeScript Support | Good but not perfect | Type assertions may be needed |
| Custom Components | Requires understanding of Framework7 internals | Extend carefully |
| Animation Customization | Limited control | Use CSS animations alongside |
| Theming | iOS/MD/Auto themes only | Custom CSS for additional themes |
| Dark Mode | Manual implementation required | Use CSS variables |
| RTL Support | Limited | Manual adjustments needed |
| Accessibility | Some ARIA attributes need manual addition | Audit and enhance |

### Missing Framework7 Components

The following native components are not available in Framework7 and require custom implementation:

| Component | Status | Workaround |
|-----------|--------|------------|
| Navigation Stack | ⚠️ Partial | Use f7Views with custom routing |
| Modal Stack | ⚠️ Partial | Use f7Dialog with custom management |
| Search Controller | ❌ Missing | Custom implementation (AppSearchBar) |
| Media Picker | ❌ Missing | Use Capacitor plugins |
| Document Picker | ❌ Missing | Use Capacitor plugins |
| Contact Picker | ❌ Missing | Use Capacitor plugins |
| Share Sheet | ❌ Missing | Use Capacitor Share plugin |
| Action Sheet | ✅ Available | Use f7Actions |
| Alert Controller | ✅ Available | Use f7Dialog |
| Loading Controller | ❌ Missing | Custom implementation |
| Toast Controller | ❌ Missing | Custom implementation (future) |

### Framework7 Performance Considerations

1. **Virtual List**
   - Framework7's virtual list has limitations with complex items
   - Large lists may cause performance issues
   - Workaround: Use AppVirtualList with custom implementation

2. **Nested Views**
   - Deeply nested views can cause memory issues
   - Keep view hierarchy shallow

3. **Dynamic Pages**
   - Dynamically adding pages can cause transition issues
   - Prefer static page structure

4. **Animation Performance**
   - Complex animations may jank on low-end devices
   - Use `will-change` and hardware acceleration
   - Respect `prefers-reduced-motion`

---

## 4. Browser/Engine Limitations

### WebKit (iOS Safari) Limitations

| API | Limitation | Workaround |
|-----|------------|------------|
| Resize Observer | Not supported in iOS < 13.4 | Feature detect and fallback |
| Intersection Observer | Limited in older iOS | Feature detect and fallback |
| WebAssembly | iOS 11+ | Check support |
| WebRTC | Limited in WKWebView | Use Capacitor plugins |
| Web Audio API | Limited in WKWebView | Use Capacitor plugins |
| WebGL 2 | iOS 13+ | Feature detect |
| IndexedDB | Limited storage | Use Capacitor Storage API |
| LocalStorage | 5MB limit | Use Capacitor Preferences for larger data |
| SessionStorage | Tab-specific | Use alternatives for cross-tab |
| BroadcastChannel | Not in WKWebView | Use alternatives |
| SharedWorker | Not supported | Use Service Worker or alternatives |
| Web Codecs | iOS 16+ | Feature detect |
| Web GPU | iOS 17+ | Feature detect |

### V8/Blink (Chrome/Edge) Limitations

| API | Limitation | Notes |
|-----|------------|-------|
| None significant | Modern features well-supported | Use feature detection |

---

## 5. Accessibility Limitations

### Screen Reader Limitations

| Screen Reader | Limitation | Workaround |
|---------------|------------|------------|
| VoiceOver (iOS) | Some ARIA roles not fully supported | Use standard HTML elements |
| VoiceOver (iOS) | Custom components need explicit roles | Add ARIA attributes |
| VoiceOver (iOS) | Focus management can be tricky | Test thoroughly |
| TalkBack (Android) | Similar to VoiceOver | Same workarounds |
| NVDA (Windows) | Good support | Standard web accessibility |
| JAWS (Windows) | Good support | Standard web accessibility |

### Specific Accessibility Issues

1. **Icon-Only Buttons**
   - Must have `aria-label` for screen readers
   - Framework7 buttons need explicit labels

2. **Modal/Dialog Focus Traps**
   - Framework7 dialogs may not trap focus perfectly
   - Custom focus management may be needed

3. **Skip Links**
   - Not built into Framework7
   - Must be manually implemented

4. **Reduced Motion**
   - Framework7 animations need manual reduced motion handling
   - Use `nativeUiProfile.prefersReducedMotion`

5. **High Contrast Mode**
   - iOS High Contrast mode has limited CSS support
   - Use semantic HTML and system colors

6. **Large Text Mode**
   - iOS Large Text mode can break layouts
   - Use flexible layouts that adapt to text size

---

## 6. Performance Limitations

### Memory Usage

| Concern | Limitation | Workaround |
|---------|------------|------------|
| JavaScript Bundle | Large bundles impact memory | Code splitting, tree shaking |
| DOM Nodes | Many nodes slow down rendering | Virtual scrolling |
| Images | Large images consume memory | Lazy loading, compression |
| Caching | Memory cache limits | Cache eviction strategies |
| Web Workers | Limited on iOS | Use sparingly |

### Rendering Performance

| Concern | Limitation | Workaround |
|---------|------------|------------|
| Layout Thrashing | Forced synchronous layouts | Batch DOM reads/writes |
| Paint Complexity | Complex styles slow painting | Simplify styles, use layers |
| Compositing | Too many layers hurts performance | Limit layer count |
| Animations | 60fps animations require optimization | Use transform/opacity, will-change |
| Scroll Performance | Complex scroll handlers cause jank | Use passive event listeners, debounce |

### Network Performance

| Concern | Limitation | Workaround |
|---------|------------|------------|
| Concurrent Requests | Browser limit (6-10) | Request prioritization, queues |
| Slow Networks | High latency impacts UX | Skeleton screens, placeholders |
| Offline | No connectivity | Service worker caching |
| Bandwidth | Large assets slow loading | Compression, lazy loading |

---

## 7. Feature Limitations

### Current Feature Status

| Feature | Status | Limitation | Notes |
|---------|--------|------------|-------|
| Auth | ✅ Implemented | Standard OAuth flows | Works well |
| Posts | ✅ Implemented | Basic CRUD | Needs enhancements |
| Messages | ✅ Implemented | Basic messaging | Needs real-time |
| Notifications | ✅ Implemented | Basic notifications | Push notifications work |
| Search | ✅ Implemented | Basic search | Needs advanced features |
| Stories | ⚠️ Partial | Basic viewer | Needs media optimizations |
| Threads | ⚠️ Partial | Basic threads | Needs enhancements |
| Media Viewer | ⏳ Planned | Not yet implemented | Will use AppMediaViewer |
| Voice Messages | ❌ Not Planned | Complex implementation | Use text instead |
| Video Calling | ❌ Not Planned | Complex implementation | Use external services |
| Live Streaming | ❌ Not Planned | Very complex | Use external services |
| Screen Sharing | ❌ Not Planned | Complex | Use external services |
| File Sharing | ⚠️ Partial | Basic file sharing | Needs enhancements |
| Reactions | ✅ Implemented | Basic reactions | Works well |
| Comments | ✅ Implemented | Basic comments | Works well |
| Bookmarks | ⚠️ Partial | Basic bookmarks | Needs sync |
| Drafts | ⏳ Planned | Local drafts | Needs implementation |
| Mentions | ⚠️ Partial | Basic mentions | Needs autocomplete |
| Hashtags | ⚠️ Partial | Basic hashtags | Needs search |
| Polls | ❌ Not Planned | Complex | May add later |
| Quizzes | ❌ Not Planned | Complex | May add later |
| Events | ❌ Not Planned | Complex | May add later |
| Payments | ❌ Not Planned | Complex | Use external services |
| Subscriptions | ❌ Not Planned | Complex | Use external services |

### Storage Limitations

| Storage Type | Limitation | Workaround |
|--------------|------------|------------|
| localStorage | 5MB limit | Use IndexedDB for larger data |
| sessionStorage | 5MB limit, tab-specific | Use alternatives |
| IndexedDB | Variable limit, async | Use Capacitor Storage API |
| Capacitor Preferences | 100MB limit (approx) | Good for app data |
| Capacitor Filesystem | App sandbox only | Use for app-specific files |
| iCloud Storage | Not available | Use external services |
| Google Drive | Not available | Use external services |

### Network Limitations

| Concern | Limitation | Workaround |
|---------|------------|------------|
| API Rate Limits | Server-imposed limits | Implement retry with backoff |
| Offline Support | Limited | Service worker caching |
| Background Sync | Not available on iOS | Use foreground sync |
| WebSockets | Limited on iOS WKWebView | Use polling fallback |
| Server-Sent Events | Not on iOS WKWebView | Use polling or WebSockets |

---

## 8. Planned Future Enhancements

### Short Term (Next 3 Months)

1. **Complete Semantic Layer**
   - Migrate remaining design/components to semantic
   - Implement missing semantic components (AppMediaViewer, AppDialog, AppToast, AppPopover)

2. **Enhanced Accessibility**
   - Complete axe-core test coverage
   - Manual accessibility testing for all routes
   - Fix identified accessibility issues

3. **Performance Optimizations**
   - Implement lazy loading for non-critical components
   - Optimize image loading and caching
   - Reduce bundle size

4. **Testing Improvements**
   - Add platform profile tests
   - Add keyboard/input regression tests
   - Add E2E tests for missing routes

### Medium Term (3-6 Months)

1. **Offline Support**
   - Enhanced service worker caching
   - Offline data persistence
   - Background sync (Android only)

2. **Real-Time Features**
   - WebSocket implementation (with fallback)
   - Real-time notifications
   - Real-time messaging

3. **Advanced Media**
   - Video recording/playback
   - Audio recording/playback
   - Media compression before upload

4. **Enhanced Search**
   - Full-text search
   - Advanced filtering
   - Search history and suggestions

### Long Term (6-12 Months)

1. **Cross-Platform Improvements**
   - Enhanced native feel
   - Platform-specific optimizations
   - Better PWA installation experience

2. **Advanced Features**
   - Voice messages
   - Video calling (via external service)
   - Enhanced file sharing

3. **Scalability Improvements**
   - Virtual scrolling for all large lists
   - Memory optimization
   - Performance monitoring

---

## Reporting New Limitations

If you discover a new limitation that should be documented:

1. **Verify the Limitation**
   - Confirm it's not a bug that can be fixed
   - Test on multiple devices/browsers
   - Check if it's already documented

2. **Document the Limitation**
   - Add to the appropriate section above
   - Include:
     - Clear description
     - Impact assessment
     - Workarounds (if any)
     - Affected platforms

3. **Create a Tracking Issue**
   - Create a GitHub issue for tracking
   - Label as `limitation` and `documentation`
   - Link to this document

4. **Prioritize**
   - High: Blocks critical features
   - Medium: Affects user experience significantly
   - Low: Minor inconvenience

---

## How to Work Around Limitations

### General Strategies

1. **Feature Detection**
   - Always check if a feature is available before using it
   - Provide graceful fallbacks

2. **Progressive Enhancement**
   - Start with basic functionality
   - Enhance for capable browsers

3. **Graceful Degradation**
   - Provide alternative experiences when features aren't available
   - Ensure core functionality works without JavaScript

4. **Platform-Specific Code**
   - Use `nativeUiProfile` for platform detection
   - Provide platform-specific implementations when needed

5. **User Communication**
   - Inform users when features aren't available
   - Provide helpful error messages

### Example: Feature Detection Pattern

```ts
// Check if feature is available
const isFeatureAvailable = capabilityDetection.has('feature-name')

// Use feature if available
if (isFeatureAvailable) {
  useFeature()
} else {
  // Provide fallback
  useFallback()
}
```

### Example: Platform-Specific Code

```ts
const nativeUiProfile = useNativeUiProfile()

if (nativeUiProfile.platform === 'ios') {
  // iOS-specific implementation
} else if (nativeUiProfile.platform === 'android') {
  // Android-specific implementation
} else {
  // Desktop/web implementation
}
```

### Example: Reduced Motion Handling

```ts
const nativeUiProfile = useNativeUiProfile()

if (nativeUiProfile.prefersReducedMotion) {
  // Disable or simplify animations
  animationDisabled.value = true
} else {
  // Enable animations
  animationDisabled.value = false
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-11 | Initial release - Phase 11 |
