import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { useAuthStore } from '@/stores/authStore'

const dashboardUiEnabled = false

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // Provider dashboard routes are intentionally disabled in Memory.
    {
      path: '/dashboard/:pathMatch(.*)*',
      redirect: { name: 'settings' },
    },

    // ── Standard app routes ───────────────────────────────────────────────────
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { titleKey: 'app.title.home' }
    },
    {
      path: '/signin',
      name: 'signin',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/SignInView.vue'),
      meta: { titleKey: 'app.title.signin' }
    },
    {
      path: '/signup',
      name: 'signup',
      component: () => import('../views/SignupView.vue'),
      meta: { titleKey: 'app.title.signup' }
    },
    {
      path: '/welcome',
      name: 'welcome',
      component: () => import('../views/WelcomeView.vue'),
      meta: { titleKey: 'app.title.welcome' }
    },
    {
      path: '/auth/callback',
      name: 'auth-callback',
      component: () => import('../views/AuthCallbackView.vue'),
      meta: { titleKey: 'app.title.authCallback' }
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue'),
      meta: { titleKey: 'app.title.settings' }
    },
    {
      path: '/settings/feed-controls',
      name: 'feed-controls',
      component: () => import('../views/FeedControlsView.vue'),
      meta: { titleKey: 'app.title.feedControls' }
    },
    {
      path: '/settings/moderation',
      name: 'settings-moderation',
      component: () => import('../views/ModerationSettingsView.vue'),
      meta: { titleKey: 'app.title.moderation' }
    },
    {
      path: '/settings/profile',
      name: 'settings-profile',
      component: () => import('../views/SettingsProfileView.vue'),
      meta: { titleKey: 'app.title.profileSettings' }
    },
    {
      path: '/thread/:id',
      name: 'thread',
      component: () => import('../views/ThreadView.vue'),
      meta: { titleKey: 'app.title.thread' }
    },
    {
      path: '/explore',
      name: 'explore',
      component: () => import('../views/ExploreView.vue'),
      meta: { titleKey: 'app.title.explore' }
    },
    {
      path: '/messages',
      name: 'messages',
      component: () => import('../views/MessagesView.vue'),
      meta: { titleKey: 'app.title.messages' }
    },
    {
      path: '/notifications',
      name: 'notifications',
      component: () => import('../views/NotificationsView.vue'),
      meta: { titleKey: 'app.title.notifications' }
    },
    {
      path: '/experience',
      name: 'experience',
      component: () => import('../views/ExperienceView.vue'),
      meta: { titleKey: 'app.title.experience' }
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/ProfileView.vue'),
      meta: { titleKey: 'app.title.profile' }
    },
    {
      path: '/u/:webId',
      name: 'user-profile',
      component: () => import('../views/UserProfileView.vue'),
      meta: { titleKey: 'app.title.profile' }
    }
  ]
})

const PUBLIC_ROUTES = new Set(['signin', 'signup', 'welcome', 'auth-callback', 'user-profile'])

router.beforeEach((to, _, next) => {
  const authStore = useAuthStore()

  if (!dashboardUiEnabled && to.path.startsWith('/dashboard')) {
    return next({ name: 'settings' })
  }

  // Fail closed: when secure logout cleanup failed, keep user on sign-in
  // until local cache wipe succeeds via retry.
  if (authStore.logoutBlocked && to.name !== 'signin') {
    return next({ name: 'signin' })
  }

  if (!PUBLIC_ROUTES.has(String(to.name))) {
    if (!authStore.isLoggedIn) {
      return next({ name: 'welcome' })
    }
  }
  return next()
})

export default router
