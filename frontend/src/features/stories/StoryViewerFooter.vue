/**
 * StoryViewerFooter - Footer for story viewer with text and links
 *
 * Responsibilities:
 * - Display story text content
 * - Show link cards
 * - Respect safe area at bottom
 * - Scrollable for long content
 */

<script setup lang="ts">
import { computed } from 'vue'
import type { StoryItem } from '@/stores/atBridgeStore'

export interface StoryViewerFooterProps {
  item: StoryItem
}

const props = defineProps<StoryViewerFooterProps>()

function linkLabel(link: { uri: string; title?: string }): string {
  if (link.title) return link.title
  try {
    return new URL(link.uri).hostname
  } catch {
    return link.uri
  }
}

const hasContent = computed(() => {
  return props.item.text || props.item.links.length > 0
})
</script>

<template>
  <footer
    v-if="hasContent"
    class="story-viewer-footer absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent px-4 pb-6 pt-24"
    role="contentinfo"
  >
    <!-- Text content -->
    <p
      v-if="item.text"
      class="story-viewer-footer__text text-base font-semibold leading-snug text-white"
    >
      {{ item.text }}
    </p>

    <!-- Links -->
    <div
      v-if="item.links.length"
      class="story-viewer-footer__links mt-3 flex flex-wrap gap-2"
      role="list"
    >
      <a
        v-for="link in item.links"
        :key="link.uri"
        :href="link.uri"
        target="_blank"
        rel="noopener noreferrer"
        class="story-viewer-footer__link rounded-full bg-white px-3 py-2 text-sm font-bold text-black"
        role="listitem"
      >
        {{ linkLabel(link) }}
      </a>
    </div>
  </footer>
</template>

<style scoped>
.story-viewer-footer {
  /* Safe area insets for notched devices */
  padding-bottom: calc(6px + env(safe-area-inset-bottom));
}

.story-viewer-footer__text {
  /* Improve readability on dark background */
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  /* Allow scrolling for long text */
  max-height: 60vh;
  overflow-y: auto;
}

.story-viewer-footer__links {
  /* Scrollable if many links */
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.story-viewer-footer__links::-webkit-scrollbar {
  display: none;
}

.story-viewer-footer__link {
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease;
  /* Prevent double-tap zoom */
  touch-action: manipulation;
  /* Ensure text doesn't wrap */
  white-space: nowrap;
}

.story-viewer-footer__link:hover {
  transform: translateY(-2px);
  opacity: 0.9;
}

.story-viewer-footer__link:active {
  transform: translateY(0);
  opacity: 0.8;
}
</style>
