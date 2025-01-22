import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { useUserStore } from '@/stores/authStore'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/login',
      name: 'login',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/LoginView.vue')
    },
    {
      path: '/signup',
      name: 'signup',
      component: () => import('../views/SignupView.vue')
    }
  ]
})

router.beforeEach((to, from, next) => {
  console.log('beforeEach: ', to, from)
  // if the user is not logged in, redirect to login page
  if (to.name !== 'login' && to.name !== 'signup') {
    const authStore = useUserStore()
    if (!authStore.isLoggedIn) {
      next({ name: 'login' })
    }
  }
  next()
})

export default router
