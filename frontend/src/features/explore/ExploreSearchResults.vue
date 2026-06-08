<script setup lang="ts">
/**
 * ExploreSearchResults - Search results display for Explore view
 * 
 * Handles different result types:
 * - No results
 * - User-only results
 * - General results with users, tags, and posts
 */

import { computed } from 'vue'
import ExplorePersonRow from './ExplorePersonRow.vue'
import ExploreTagRow from './ExploreTagRow.vue'
import PostEmbedCard from '@/components/PostEmbedCard.vue'
import { useFollow } from '@/composables/useFollow'
import { demoPost, people, trendingTags } from './exploreDemoData'
import type { SearchType } from './useExploreSearch'

interface Props {
  searchType: SearchType
  searchTerm: string
  hasResults: boolean
  followedTags: Set<string>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'toggle-tag', tag: string): void
  (e: 'follow', id: string): void
}>()

const { follow, isFollowing } = useFollow()

function handleToggleTag(tag: string): void {
  emit('toggle-tag', tag)
}

function handleFollow(id: string): void {
  emit('follow', id)
}
</script>

<template>
  <div class="flex-1 overflow-y-auto px-4 pb-28 pt-2 flex flex-col gap-4">

    <!-- Subtitle -->
    <p class="text-sm text-dark text-center leading-snug px-6">
      {{ searchType === 'user' ? 'User results for' : 'Results for' }}
      <strong>"{{ searchTerm }}"</strong>
    </p>

    <!-- NO RESULTS -->
    <div v-if="!hasResults" class="flex-1 flex flex-col items-center justify-center gap-2 py-28">
      <p class="text-base font-bold text-dark">No results found...</p>
      <p class="text-sm text-dark-40">Maybe a typo?</p>
    </div>

    <!-- USER-ONLY RESULTS -->
    <template v-else-if="searchType === 'user'">
      <div class="rounded-2xl bg-white overflow-hidden">
        <ExplorePersonRow
          v-for="(person, i) in people"
          :key="person.id"
          :id="person.id"
          :name="person.name"
          :handle="person.handle"
          :initials="person.initials"
          :color="person.color"
          :is-following="isFollowing(person.id)"
          :show-border="true"
          :is-last="i === people.length - 1"
          @follow="handleFollow"
        />
      </div>
    </template>

    <!-- GENERAL RESULTS -->
    <template v-else>

      <!-- AI Story card (dark) - Placeholder/demo -->
      <div class="rounded-2xl flex items-center gap-3 px-4 py-4" style="background: #2c2c2e;">
        <p class="flex-1 text-sm font-medium text-white leading-snug">
          Experience an AI-generated story based on your search input! (Demo)
        </p>
        <button
          type="button"
          class="shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold text-white"
          style="background: var(--color-accent);"
          aria-label="Launch AI story"
        >
          Launch!
        </button>
      </div>

      <!-- Users section -->
      <div>
        <p class="text-base font-bold text-dark mb-2 px-1">Users</p>
        <div class="rounded-2xl bg-white overflow-hidden">
          <ExplorePersonRow
            v-for="(person, i) in people"
            :key="person.id"
            :id="person.id"
            :name="person.name"
            :handle="person.handle"
            :initials="person.initials"
            :color="person.color"
            :is-following="isFollowing(person.id)"
            :show-border="true"
            :is-last="i === people.length - 1"
            @follow="handleFollow"
          />
        </div>
        <div class="flex justify-end mt-1.5 pr-1">
          <button type="button" class="text-xs font-semibold" style="color: color-mix(in srgb, var(--color-accent) 55%, transparent);" aria-label="View more users">View more...</button>
        </div>
      </div>

      <!-- Tags section -->
      <div>
        <p class="text-base font-bold text-dark mb-2 px-1">Tags</p>
        <div class="rounded-2xl bg-white overflow-hidden">
          <ExploreTagRow
            v-for="(t, i) in trendingTags"
            :key="t.tag"
            :tag="t.tag"
            :count="t.count"
            :is-followed="followedTags.has(t.tag)"
            :show-border="true"
            :is-last="i === trendingTags.length - 1"
            @toggle="() => handleToggleTag(t.tag)"
          />
        </div>
        <div class="flex justify-end mt-1.5 pr-1">
          <button type="button" class="text-xs font-semibold" style="color: color-mix(in srgb, var(--color-accent) 55%, transparent);" aria-label="View more tags">View more...</button>
        </div>
      </div>

      <!-- Posts section -->
      <div>
        <p class="text-base font-bold text-dark mb-2 px-1">Posts</p>
        <div class="rounded-2xl bg-white p-4 flex flex-col gap-3">
          <div class="flex items-start gap-3">
            <div class="h-11 w-11 shrink-0 flex items-center justify-center rounded-full text-white text-sm font-bold" :style="{ background: demoPost.avatarColor }">
              {{ demoPost.avatarInitials }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="text-sm font-bold text-dark">{{ demoPost.authorName }}</span>
                <span class="flex items-center justify-center w-4 h-4 rounded-full shrink-0" style="background:#1d9bf0;">
                  <svg class="w-2.5 h-2.5 text-white" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                </span>
              </div>
              <div class="flex items-center gap-1 mt-0.5">
                <span class="text-xs text-dark-50">{{ demoPost.timeAgo }}</span>
                <span class="text-xs font-semibold" style="color:#22c55e;">· {{ demoPost.federationDomain }}</span>
              </div>
            </div>
            <button type="button" class="rounded-xl px-4 py-1.5 text-xs font-bold text-white shrink-0" style="background:var(--color-accent);" aria-label="Follow author">Follow</button>
          </div>
          <p class="text-sm text-dark leading-snug">{{ demoPost.content }}</p>
          <PostEmbedCard v-if="demoPost.embed" :post="demoPost.embed" />
        </div>
      </div>

    </template>
  </div>
</template>
