<script setup lang="ts">
/**
 * ExploreRecommendedPeople - Recommended people section for Explore view
 * 
 * Displays a list of recommended people with follow functionality
 */

import ExplorePersonRow from './ExplorePersonRow.vue'
import { useFollow } from '@/composables/useFollow'
import type { PersonItem } from './exploreDemoData'

interface Props {
  people: PersonItem[]
}

const props = defineProps<Props>()

const { follow, isFollowing } = useFollow()

function handleFollow(id: string): void {
  follow(id)
}
</script>

<template>
  <div>
    <p class="text-base font-bold text-dark mb-2 px-1">Recommended People</p>
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
  </div>
</template>
