/**
 * Stories Feature Components
 * 
 * Semantic, reusable components for story-related UI.
 * These components preserve existing story data contracts and API behavior.
 */

export { default as StoryAvatarRail } from './StoryAvatarRail.vue'
export { default as StoryAvatarItem } from './StoryAvatarItem.vue'
export { default as StoryProgressBar } from './StoryProgressBar.vue'
export { default as StoryViewerOverlay } from './StoryViewerOverlay.vue'
export { default as StoryViewerHeader } from './StoryViewerHeader.vue'
export { default as StoryViewerFooter } from './StoryViewerFooter.vue'

export { useStoryGestures } from './useStoryGestures'
export { useStoryPlayback } from './useStoryPlayback'

export type { StoryAvatarRailProps } from './StoryAvatarRail.vue'
export type { StoryAvatarItemProps } from './StoryAvatarItem.vue'
export type { StoryProgressBarProps } from './StoryProgressBar.vue'
export type { StoryViewerOverlayProps } from './StoryViewerOverlay.vue'
export type { StoryViewerHeaderProps } from './StoryViewerHeader.vue'
export type { StoryViewerFooterProps } from './StoryViewerFooter.vue'
