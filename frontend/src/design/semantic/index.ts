/**
 * Semantic Components Index
 * 
 * Exports all semantic components for consistent use across the app.
 * These components wrap Framework7 primitives with Memory's design system.
 */

// Shell and Page components
export { default as AppRoot } from './AppRoot.vue'
export { default as AppShell } from './AppShell.vue'
export { default as AppPage } from './AppPage.vue'
export { default as AppNavbar } from './AppNavbar.vue'
export { default as AppToolbar } from './AppToolbar.vue'

// List components
export { default as AppList } from './AppList.vue'
export { default as AppListItem } from './AppListItem.vue'
export { default as AppGroupedList } from './AppGroupedList.vue'

// Form control components
export { default as AppSwitch } from './AppSwitch.vue'
export { default as AppRadioList, type AppRadioOption } from './AppRadioList.vue'
export { default as AppCheckboxList, type AppCheckboxOption } from './AppCheckboxList.vue'
export { default as AppSlider } from './AppSlider.vue'
export { default as AppDestructiveAction, type DangerLevel } from './AppDestructiveAction.vue'

// Virtual list component
export { default as AppVirtualList, type AppVirtualListItem, type AppVirtualListProps } from './AppVirtualList.vue'

// Sheet and Actions components
export { default as AppSheet } from './AppSheet.vue'
export { default as AppActionsSheet, type ActionItem } from './AppActionsSheet.vue'

// Input and Form components
export { default as AppSearchBar } from './AppSearchBar.vue'
export { default as AppTextField } from './AppTextField.vue'
export { default as AppTextArea } from './AppTextArea.vue'
export { default as AppComposer } from './AppComposer.vue'
export { default as AppPullToRefresh } from './AppPullToRefresh.vue'
export { default as AppSegmentedControl, type SegmentItem } from './AppSegmentedControl.vue'

// Re-export from lists directory (if any)
// export * from './lists'
