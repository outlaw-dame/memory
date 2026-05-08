<script setup lang="ts">
import { usePostsStore } from '@/stores/postsStore'
import { DateTime } from 'luxon'
import MemoryButton from './MemoryButton.vue'
import HashtagText from './HashtagText.vue'
import { useFollow } from '@/composables/useFollow'
import AppIcon from '@/components/AppIcon.vue'

const postsStore = usePostsStore()
const { follow, isFollowing } = useFollow()

function onHashtagClick(hashtag: string): void {
  postsStore.setHashtagFilter(hashtag)
}
</script>

<template>
  <div class="Posts flex flex-col gap-[var(--gap-default)] py-[var(--gap-default)]">
    <div
      class="rounded-default bg-pastel-light p-[var(--padding-main)]"
      v-for="post in postsStore.posts"
      :key="post.id"
    >
      <div class="user flex flex-row gap-[var(--gap-default)]">
        <AppIcon name="user-circle" :size="27" color="rgba(55,55,55,0.4)" />
        <div class="w-full">
          <p class="text-footnote font-bold">{{ post.author.name }}</p>
          <p class="text-caption">{{ post.author.webId }} • {{ DateTime.fromISO(post.createdAt).toRelative() }}</p>
        </div>
        <MemoryButton
            :disabled="isFollowing(post.author.webId)"
            @click="follow(post.author.webId)"
          >{{ isFollowing(post.author.webId) ? 'Following' : 'Follow' }}</MemoryButton>
      </div>
      <HashtagText :text="post.content" @hashtag-click="onHashtagClick" />
    </div>
  </div>
</template>
