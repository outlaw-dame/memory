import { ref, onUnmounted } from 'vue'

// Module-level singleton — one source of truth for the entire app shell.
const largeTitleVisible = ref(true)

let observer: IntersectionObserver | null = null

/**
 * Called by views that own a large title (e.g. HomeView).
 * Pass the sentinel element ref; the composable manages the observer lifecycle.
 *
 * The sentinel should be placed at the BOTTOM edge of the large-title block so
 * that as soon as it scrolls out of view the navbar title fades in.
 */
export function useLargeTitleSentinel(getSentinel: () => Element | null) {
  // Disconnect any previous observer before registering a new one.
  observer?.disconnect()
  largeTitleVisible.value = true

  observer = new IntersectionObserver(
    ([entry]) => { largeTitleVisible.value = entry.isIntersecting },
    { threshold: 0 },
  )

  const el = getSentinel()
  if (el) observer.observe(el)

  onUnmounted(() => {
    observer?.disconnect()
    observer = null
    largeTitleVisible.value = true
  })
}

/** Consumed by AppTopBar to decide whether to suppress its inline title. */
export function useLargeTitle() {
  return { largeTitleVisible }
}
