<script setup lang="ts">
/**
 * ExploreLatestPosts - Latest posts section for Explore view
 * 
 * Displays a feed of latest posts
 */

import UnifiedFeedList from '@/components/UnifiedFeedList.vue'
</script>

<template>
  <div>
    <p class="text-base font-bold text-dark mb-2 px-1">Latest Posts</p>
    <UnifiedFeedList mode="balanced" />
  </div>
</template>
