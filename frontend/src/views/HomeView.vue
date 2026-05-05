<script setup lang="ts">
import CreatePostForm from '@/components/CreatePostForm.vue'
import UnifiedFeedList from '@/components/UnifiedFeedList.vue'
import { ref } from 'vue'
import { useI18n } from '@/i18n'

type Tab = 'for-you' | 'home' | 'following'
const activeTab = ref<Tab>('for-you')
const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex justify-end">
      <RouterLink to="/settings" class="rounded bg-pastel-light px-3 py-2 text-sm font-medium hover:bg-blue-100">
        {{ t('home.settings') }}
      </RouterLink>
    </div>

    <!-- Tab switcher -->
    <div class="flex gap-2 border-b border-gray-200 pb-2">
      <button
        class="rounded-t px-4 py-2 text-sm font-semibold transition-colors"
        :class="activeTab === 'for-you'
          ? 'border-b-2 border-blue-600 text-blue-600'
          : 'text-gray-500 hover:text-gray-700'"
        @click="activeTab = 'for-you'"
      >
        {{ t('home.tabs.forYou') }}
      </button>
      <button
        class="rounded-t px-4 py-2 text-sm font-semibold transition-colors"
        :class="activeTab === 'home'
          ? 'border-b-2 border-blue-600 text-blue-600'
          : 'text-gray-500 hover:text-gray-700'"
        @click="activeTab = 'home'"
      >
        {{ t('home.tabs.home') }}
      </button>
      <button
        class="rounded-t px-4 py-2 text-sm font-semibold transition-colors"
        :class="activeTab === 'following'
          ? 'border-b-2 border-blue-600 text-blue-600'
          : 'text-gray-500 hover:text-gray-700'"
        @click="activeTab = 'following'"
      >
        {{ t('home.tabs.following') }}
      </button>
    </div>

    <!-- For You: algorithmic/balanced feed across all protocols -->
    <div v-if="activeTab === 'for-you'">
      <UnifiedFeedList mode="balanced" />
    </div>

    <!-- Home: chronological timeline with compose -->
    <div v-if="activeTab === 'home'" class="flex flex-col gap-4">
      <CreatePostForm />
      <UnifiedFeedList mode="chronological" />
    </div>

    <!-- Following: posts from people you follow only -->
    <div v-if="activeTab === 'following'">
      <UnifiedFeedList mode="following" />
    </div>
  </div>
</template>
