<script setup lang="ts">
/**
 * FeedAuthorHeader - Author/avatar/source/follow metadata
 *
 * Responsibilities:
 * - Avatar with initials fallback
 * - Author display name
 * - Verified badge behavior
 * - PostMetadataRow integration
 * - Follow button behavior
 * - ActivityPods-only follow behavior
 */

import { computed } from 'vue'
import { useI18n } from '@/i18n'
import PostMetadataRow from './PostMetadataRow.vue'
import { resolvePostSourceMetadata } from './postSourceMetadata'
import type { UnifiedFeedItem } from '@/stores/atBridgeStore'
import { useFollow } from '@/composables/useFollow'

export interface FeedAuthorHeaderProps {
  // Author data
  item: UnifiedFeedItem
  
  // Display options
  compact?: boolean
  showFollow?: boolean
  
  // Events
  onHashtagClick?: (hashtag: string) => void
  onAuthorClick?: () => void
}

const props = defineProps<FeedAuthorHeaderProps>()
const { t } = useI18n()
const { follow, isFollowing } = useFollow()

// Computed properties
const authorInitials = computed(() => {
  const name = props.item.authorName
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
})

const sourceMetadata = computed(() => resolvePostSourceMetadata(props.item))

const authorAvatar = computed(() => props.item.authorAvatar ?? null)

const isAuthorFollowing = computed(() => isFollowing(props.item.authorWebId))

const showFollowButton = computed(() => {
  return props.showFollow !== false && props.item.source === 'activitypods'
})

// Follow button state
const followButtonLabel = computed(() => {
  return isAuthorFollowing.value ? t('common.actions.following') : t('common.actions.follow')
})

const followButtonDisabled = computed(() => {
  return isAuthorFollowing.value
})

// Avatar styling
const avatarStyle = computed(() => {
  const baseStyle = {
    width: '2.75rem',
    height: '2.75rem',
    'min-width': '2.75rem',
    'min-height': '2.75rem',
    'font-size': '0.875rem',
    'background': '#1a1a2e',
  }
  
  if (authorAvatar.value) {
    return {
      ...baseStyle,
      background: `url('${authorAvatar.value}') center/cover`,
    }
  }
  
  return baseStyle
})

function handleFollowClick(event: MouseEvent) {
  event.stopPropagation()
  if (props.item.authorWebId && props.item.source === 'activitypods') {
    follow(props.item.authorWebId)
  }
}

function handleAuthorClick() {
  if (props.onAuthorClick) {
    props.onAuthorClick()
  }
}
</script>

<template>
  <div class="feed-author-header">
    <!-- Avatar -->
    <div
      class="feed-author-avatar"
      :style="avatarStyle"
      :aria-label="`${props.item.authorName}'s avatar`"
      role="img"
      @click="handleAuthorClick"
    >
      <template v-if="!authorAvatar">
        {{ authorInitials }}
      </template>
    </div>

    <!-- Name + meta -->
    <div class="feed-author-info">
      <div class="feed-author-name-row">
        <p
          class="feed-author-name"
          @click="handleAuthorClick"
        >
          {{ props.item.authorName }}
        </p>
        
        <!-- Verified badge -->
        <span
          v-if="props.item.authorHandle"
          class="feed-verified-badge"
          aria-label="Verified"
          role="img"
        >
          <svg class="feed-verified-icon" viewBox="0 0 20 20" fill="currentColor">
            <path
              fill-rule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clip-rule="evenodd"
            />
          </svg>
        </span>
      </div>

      <div class="feed-author-meta">
        <PostMetadataRow
          :metadata="sourceMetadata"
          :created-at="props.item.createdAt"
          compact
        />
      </div>
    </div>

    <!-- Follow button -->
    <button
      v-if="showFollowButton"
      class="feed-follow-button"
      :class="{
        'following': isAuthorFollowing,
        'disabled': followButtonDisabled,
      }"
      :disabled="followButtonDisabled"
      :aria-label="isAuthorFollowing ? t('common.actions.unfollow') : t('common.actions.follow')"
      @click="handleFollowClick"
    >
      {{ followButtonLabel }}
    </button>
  </div>
</template>

<style scoped>
.feed-author-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  
  padding: 0.5rem 0;
}

.feed-author-avatar {
  flex-shrink: 0;
  
  display: flex;
  align-items: center;
  justify-content: center;
  
  border-radius: 50%;
  
  color: white;
  font-weight: 700;
  font-family: var(--font-family);
  
  cursor: pointer;
  
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  
  transition: transform 0.2s ease;
}

.feed-author-avatar:active {
  transform: scale(0.95);
}

.feed-author-info {
  flex: 1;
  min-width: 0;
}

.feed-author-name-row {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  
  margin-bottom: 0.25rem;
}

.feed-author-name {
  font-family: var(--font-family);
  font-size: var(--text-size-subHeader);
  font-weight: 700;
  color: var(--color-dark, #000);
  
  margin: 0;
  
  cursor: pointer;
  
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.feed-author-name:hover {
  text-decoration: underline;
}

.feed-verified-badge {
  flex-shrink: 0;
  
  display: flex;
  align-items: center;
  justify-content: center;
  
  width: 1rem;
  height: 1rem;
  
  background: var(--color-blue-500, #1d9bf0);
  border-radius: 50%;
}

.feed-verified-icon {
  width: 0.625rem;
  height: 0.625rem;
  
  color: white;
}

.feed-author-meta {
  margin-top: 0.25rem;
}

.feed-follow-button {
  flex-shrink: 0;
  
  padding: 0.375rem 0.75rem;
  
  font-family: var(--font-family);
  font-size: var(--text-size-footnote);
  font-weight: 700;
  color: white;
  
  background: var(--color-accent, #1d9bf0);
  border: none;
  border-radius: 9999px;
  
  cursor: pointer;
  
  transition: opacity 0.2s ease, background-color 0.2s ease;
  
  white-space: nowrap;
}

.feed-follow-button:hover:not(:disabled) {
  opacity: 0.85;
}

.feed-follow-button:active:not(:disabled) {
  opacity: 0.7;
}

.feed-follow-button.following {
  cursor: not-allowed;
  opacity: 0.4;
}

.feed-follow-button:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}
</style>
