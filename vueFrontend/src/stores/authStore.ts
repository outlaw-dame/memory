import type { App, ProviderEndpoints } from '@/types'
import { treaty } from '@elysiajs/eden'
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', () => {
  // Default state
  const user = localStorage.getItem('user')
  const isLoggedIn = localStorage.getItem('loggedIn') || 'false'
  const client = treaty<App>(import.meta.env.VITE_API_URL)

  /**
   * Trys to login the user with the given username and password and endpoint
   * @param username - username
   * @param password - password
   * @param endpoint - endpoint
   */
  async function login(username: string, password: string, endpoint: ProviderEndpoints) {
    try {
      const { data: loginResponse } = await client.login.post({ username, password, endpoint })
      console.log('loginResponse: ', loginResponse)
      console.log('user: ', user)
      localStorage.setItem('loggedIn', 'true')
    } catch (error) {
      console.log('error when trying to login: ', error)
    }
  }

  return {
    user,
    isLoggedIn: isLoggedIn === 'true',
    // functions
    login
  }
})
