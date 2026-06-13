/**
 * Design Components Index
 * 
 * Exports design system components that are not part of the semantic layer.
 * Semantic components should be imported from '@/design/semantic'
 */

// Form components - these have been moved to semantic layer
// Import from '@/design/semantic' instead:
// - AppComposer
// - AppSearchBar
// - AppTextArea
// - AppTextField
// - AppSheet
// - AppActionsSheet
// - AppPullToRefresh

// Navigation components - these have been moved to semantic layer
// Import from '@/design/semantic' instead:
// - AppNavbar (formerly AppTopBar)
// - AppToolbar (formerly AppTabBar)

// Segmented control (still in components)
export { default as AppSegmentedControl } from './AppSegmentedControl.vue'

// Badge components
export { default as PostVisibilityIcon } from './PostVisibilityIcon.vue'
export { default as ProtocolBadge } from './ProtocolBadge.vue'
export { default as FederationSourceBadge } from './FederationSourceBadge.vue'
export { default as TrustBadge } from './TrustBadge.vue'
export { default as VerifiedBadge } from './VerifiedBadge.vue'
export { default as GifBadge } from './GifBadge.vue'

// Pull to refresh - moved to semantic layer
// Import from '@/design/semantic' instead

// Logo components
export { default as ProtocolLogo } from './../logos/ProtocolLogo.vue'
