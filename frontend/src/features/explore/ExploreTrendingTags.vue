<script setup lang="ts">
/**
 * ExploreTrendingTags - Trending tags section for Explore view
 * 
 * Displays a list of trending tags with follow functionality
 */

import ExploreTagRow from './ExploreTagRow.vue'
import type { TagItem } from './exploreDemoData'

interface Props {
  tags: TagItem[]
  followedTags: Set<string>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'toggle-tag', tag: string): void
}>()

function handleToggle(tag: string): void {
  emit('toggle-tag', tag)
}
</script>

<template>
  <div>
    <p class="text-base font-bold text-dark mb-2 px-1">Trending Tags</p>
    <div class="rounded-2xl bg-white overflow-hidden">
      <ExploreTagRow
        v-for="(tagItem, i) in tags"
        :key="tagItem.tag"
        :tag="tagItem.tag"
        :count="tagItem.count"
        :is-followed="followedTags.has(tagItem.tag)"
        :show-border="true"
        :is-last="i === tags.length - 1"
        @toggle="() => handleToggle(tagItem.tag)"
      />
    </div>
  </div>
</template>
