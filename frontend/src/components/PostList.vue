<script setup lang="ts">
import { usePostsStore } from '@/stores/postsStore'
import { DateTime } from 'luxon'
import MemoryButton from './MemoryButton.vue'

const postsStore = usePostsStore()
</script>

<template>
  <div class="Posts flex flex-col gap-[var(--gap-default)] py-[var(--gap-default)]">
    <div
      class="rounded-default bg-pastel-light p-[var(--padding-main)]"
      v-for="post in postsStore.posts"
      :key="post.id"
    >
      <div class="user grid grid-cols-7 gap-[var(--gap-default)]">
        <vs-icon class="col-span-1 h-[27px] w-[27px]" iconName="UserSquare" />
        <div class="col-span-4">
          <p class="text-footnote font-bold">{{ post.author.name }}</p>
          <p class="text-caption truncate text-ellipsis">
            <span>{{ post.author.webId }}</span> •
            {{ DateTime.fromISO(post.createdAt).toRelative() }}
          </p>
        </div>
        <MemoryButton class="col-span-2">Follow</MemoryButton>
      </div>
      <p>{{ post.content }}</p>
    </div>
  </div>
</template>
