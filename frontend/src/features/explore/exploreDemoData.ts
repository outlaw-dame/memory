/**
 * Explore Demo Data
 * 
 * This file contains mock/demo data for the Explore feature.
 * These are placeholders and should be replaced with real API data when available.
 * 
 * NOTE: This is clearly isolated demo data, not production data.
 */

import type { EmbeddedPost } from '@/components/PostEmbedCard.vue'

// Tag data structure
export interface TagItem {
  tag: string
  count: string
}

// Person data structure
export interface PersonItem {
  id: string
  name: string
  handle: string
  initials: string
  color: string
}

// Post data structure for demo embed
export interface DemoPost {
  authorName: string
  avatarInitials: string
  avatarColor: string
  federationDomain: string
  timeAgo: string
  content: string
  embed?: EmbeddedPost
}

// Demo tag data
export const trendingTags: TagItem[] = [
  { tag: 'memory', count: '1.4M posts' },
  { tag: 'cats', count: '2.5M posts' },
  { tag: 'tesla', count: '347k posts' },
  { tag: 'apple', count: '890k posts' },
]

export const recommendedTags: TagItem[] = [
  { tag: 'activitypub', count: '128k posts' },
  { tag: 'federated', count: '94k posts' },
  { tag: 'atproto', count: '215k posts' },
  { tag: 'opensource', count: '1.1M posts' },
]

// Demo person data
export const people: PersonItem[] = [
  { id: 'at://davidnoeee', name: 'David Noé', handle: '@davidnoeee', initials: 'DN', color: '#2d2d2d' },
  { id: 'at://andrew', name: 'Andrew', handle: '@andrew.design', initials: 'AN', color: '#4a4a4a' },
  { id: 'at://user1949', name: 'New User', handle: '@user1949', initials: 'NU', color: '#888' },
  { id: 'at://sugus', name: 'Sugus', handle: '@sugus', initials: 'SG', color: '#5a7a5a' },
]

// Demo post for embed in results
export const demoPost: DemoPost = {
  authorName: 'David Noé',
  avatarInitials: 'DN',
  avatarColor: '#2d2d2d',
  federationDomain: 'fosstodon.org',
  timeAgo: '7 mins ago',
  content: 'Heya! This is the first post on this new platform called Memory! :)',
  embed: {
    id: 43,
    authorName: 'David Noé',
    avatarInitials: 'DN',
    avatarColor: '#2d2d2d',
    federationDomain: 'fosstodon.org',
    timeAgo: '7 mins ago',
    content: 'This is an embed post! You will only see the first embed item of this post, the rest is available at pop-up/fullscreen view.',
    media: [
      { type: 'image' as const, url: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=400&h=400&fit=crop', alt: 'shadow' },
    ],
  },
}

// Default search history items
export const defaultSearchHistory: string[] = [
  'David Noé',
  'Apple News',
  '#dog',
  'Sugus',
  'dame.outlaw',
  '#tesla',
]
