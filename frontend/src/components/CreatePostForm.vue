<script setup lang="ts">
import { usePostsStore } from '@/stores/postsStore'
import MemoryButton from '@/components/MemoryButton.vue'
import { ref } from 'vue'

const postsStore = usePostsStore()

const content = ref('Test')

function createPost() {
  postsStore.createPost(content.value)
  content.value = ''
}
</script>

<template>
  <form @submit.prevent="createPost">
    <div class="bg-pastel-light rounded-default flex flex-col gap-[var(--gap-default)] p-[var(--padding-main)]">
      <textarea
        class="bg-pastel-light text-h3 w-full resize-none appearance-none border-none"
        type="text"
        id="content"
        v-model="content"
        placeholder="Whats on your mind today?"
      />
      <div class="grid w-full grid-cols-[auto_auto_auto_50%]">
        <MemoryButton class="col-[4]">
          Post <box-icon class="pl-[var(--gap-small)] text-white" type="solid" name="send"></box-icon>
        </MemoryButton>
      </div>
    </div>
  </form>
</template>
