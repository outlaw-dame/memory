import { inject, onBeforeUnmount, onMounted, nextTick, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// Module-level map survives component remounts for the lifetime of the SPA.
const positions = new Map<string, number>()

/**
 * Saves and restores the shared scroll container position keyed by route path.
 * Call once per view that should have its position remembered (e.g. HomeView).
 */
export function useScrollRestore(): void {
  const scrollEl = inject<Ref<HTMLElement | null>>('scrollEl')
  const route = useRoute()
  const router = useRouter()

  // beforeEach fires before App.vue's afterEach resets scrollTop, so we
  // capture the outgoing position in time.
  const removeGuard = router.beforeEach(() => {
    const el = scrollEl?.value
    if (el) positions.set(route.path, el.scrollTop)
  })

  onMounted(async () => {
    await nextTick()
    const el = scrollEl?.value
    const saved = positions.get(route.path)
    if (el && saved !== undefined) {
      el.scrollTop = saved
    }
  })

  onBeforeUnmount(() => {
    // Fallback save in case beforeEach didn't fire (e.g. programmatic unmount).
    const el = scrollEl?.value
    if (el) positions.set(route.path, el.scrollTop)
    removeGuard()
  })
}
