<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import CreatePostForm from '@/components/CreatePostForm.vue'
import StoryComposer from '@/components/StoryComposer.vue'
import StoryRail from '@/components/StoryRail.vue'
import StoryViewer from '@/components/StoryViewer.vue'
import UnifiedFeedList from '@/components/UnifiedFeedList.vue'
import AppSegmentedControl from '@/design/components/AppSegmentedControl.vue'
import type { SegmentItem } from '@/design/components/AppSegmentedControl.vue'
import { useI18n } from '@/i18n'
import { useLargeTitleSentinel } from '@/composables/useLargeTitle'
import { useAtBridgeStore } from '@/stores/atBridgeStore'

type Tab = 'for-you' | 'home' | 'following'
const activeTab = ref<Tab>('for-you')
const { t } = useI18n()
const atBridgeStore = useAtBridgeStore()
const showStoryComposer = ref(false)
const storyViewerGroupIndex = ref<number | null>(null)

const tabs = computed<SegmentItem<Tab>[]>(() => [
  { value: 'for-you',   label: t('home.tabs.forYou')   },
  { value: 'home',      label: t('home.tabs.home')      },
  { value: 'following', label: t('home.tabs.following') },
])

// Large-title sentinel — placed at the bottom edge of the title block.
// When it scrolls out of view the AppTopBar fades in its inline title.
const sentinel = ref<HTMLElement | null>(null)
onMounted(() => {
  useLargeTitleSentinel(() => sentinel.value)
  void atBridgeStore.fetchStories()
})
</script>

<template>
  <div class="flex flex-col gap-4 pt-2">
    <!-- Large title block (iOS pattern) -->
    <div class="pt-2 pb-1">
      <h1 class="text-[2rem] font-black tracking-tight text-label leading-none">memory.</h1>
      <!-- Sentinel sits at the very bottom of the title; observer fires when it exits view -->
      <div ref="sentinel" class="h-px" aria-hidden="true" />
    </div>

    <AppSegmentedControl v-model="activeTab" :items="tabs" />

    <StoryRail
      :groups="atBridgeStore.storyGroups"
      :loading="atBridgeStore.isStoriesLoading"
      :error="atBridgeStore.storiesError"
      @compose="showStoryComposer = true"
      @open="storyViewerGroupIndex = $event"
    />

    <div v-if="activeTab === 'for-you'">
      <UnifiedFeedList mode="balanced" />
    </div>

    <div v-if="activeTab === 'home'" class="flex flex-col gap-4">
      <CreatePostForm />
      <UnifiedFeedList mode="chronological" />
    </div>

    <div v-if="activeTab === 'following'">
      <UnifiedFeedList mode="following" />
    </div>

    <StoryComposer
      v-if="showStoryComposer"
      @close="showStoryComposer = false"
      @created="atBridgeStore.fetchStories()"
    />

    <StoryViewer
      v-if="storyViewerGroupIndex !== null"
      :groups="atBridgeStore.storyGroups"
      :initial-group-index="storyViewerGroupIndex"
      @close="storyViewerGroupIndex = null"
      @deleted="atBridgeStore.fetchStories()"
    />
  </div>
</template>
