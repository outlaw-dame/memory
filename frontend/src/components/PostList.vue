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
      <div class="user flex flex-row gap-[var(--gap-default)]">
        <vs-icon class="h-[27px] w-[27px]" iconName="UserSquare" />
        <div class="w-full">
          <p class="text-footnote font-bold">{{ post.author.name }}</p>
          <p class="text-caption">{{ post.author.webId }} • {{ DateTime.fromISO(post.createdAt).toRelative() }}</p>
        </div>
        <MemoryButton> Follow </MemoryButton>
      </div>
      <p>{{ post.content }}</p>
    </div>
  </div>
</template>
