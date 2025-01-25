import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { useAuthStore } from '@/stores/authStore'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/signin',
      name: 'signin',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/SingInView.vue')
    },
    {
      path: '/signup',
      name: 'signup',
      component: () => import('../views/SignupView.vue')
    },
    {
      path: '/welcome',
      name: 'welcome',
      component: () => import('../views/WelcomeView.vue')
    }
  ]
})

router.beforeEach((to, _, next) => {
  // if the user is not logged in, redirect to signin page
  if (to.name !== 'signin' && to.name !== 'signup' && to.name !== 'welcome') {
    const authStore = useAuthStore()
    if (!authStore.isLoggedIn) {
      next({ name: 'welcome' })
    }
  }
  next()
})

export default router
