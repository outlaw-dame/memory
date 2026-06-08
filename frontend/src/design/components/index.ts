/**
 * Design Components Index
 * 
 * Exports all design system components for consistent use across the app.
 */

// Form components
export { default as AppComposer, type AppComposerProps } from './AppComposer.vue'
export { default as AppSearchBar, type AppSearchBarProps } from './AppSearchBar.vue'
export { default as AppTextArea, type AppTextAreaProps } from './AppTextArea.vue'
export { default as AppTextField, type AppTextFieldProps } from './AppTextField.vue'
export { default as AppSheet, type AppSheetProps } from './AppSheet.vue'
export { default as AppActionsSheet, type ActionItem } from './AppActionsSheet.vue'
export { default as AppSegmentedControl } from './AppSegmentedControl.vue'
export { default as AppTopBar } from './AppTopBar.vue'
export { default as AppTabBar } from './AppTabBar.vue'

// Badge components
export { default as PostVisibilityIcon } from './PostVisibilityIcon.vue'
export { default as ProtocolBadge } from './ProtocolBadge.vue'
export { default as FederationSourceBadge } from './FederationSourceBadge.vue'
export { default as TrustBadge } from './TrustBadge.vue'
export { default as VerifiedBadge } from './VerifiedBadge.vue'
export { default as GifBadge } from './GifBadge.vue'

// Pull to refresh
export { default as AppPullToRefresh, type AppPullToRefreshProps } from './AppPullToRefresh.vue'

// Logo components
export { default as ProtocolLogo } from './../logos/ProtocolLogo.vue'
