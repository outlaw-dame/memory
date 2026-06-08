/**
 * Feed Feature Components Index
 * 
 * Exports all feed feature components for consistent use across the app.
 */

// Feed card and layout components
export { default as FeedCard, type FeedCardProps } from './FeedCard.vue'
export { default as FeedAuthorHeader, type FeedAuthorHeaderProps } from './FeedAuthorHeader.vue'
export { default as FeedRepostBanner, type FeedRepostBannerProps } from './FeedRepostBanner.vue'
export { default as FeedArticlePreview, type FeedArticlePreviewProps } from './FeedArticlePreview.vue'
export { default as FeedActionBar, type FeedActionBarProps } from './FeedActionBar.vue'

// Feed state components
export { default as FeedLoadingState, type FeedLoadingStateProps } from './FeedLoadingState.vue'
export { default as FeedErrorState, type FeedErrorStateProps } from './FeedErrorState.vue'
export { default as FeedEmptyState, type FeedEmptyStateProps } from './FeedEmptyState.vue'
export { default as FeedPopularCarousel, type FeedPopularCarouselProps } from './FeedPopularCarousel.vue'

// Utility components
export { default as PostMetadataRow, type PostMetadataRowProps } from './PostMetadataRow.vue'
export { default as ClientAppBadge, type ClientAppBadgeProps } from './ClientAppBadge.vue'
export { resolvePostSourceMetadata, type PostSourceMetadata, type ClientApp } from './postSourceMetadata'

// Composable
export { useFeedInteractions, type FeedInteractionsState, type FeedInteractionsHandlers, type FeedInteractionsConfig } from './useFeedInteractions'
