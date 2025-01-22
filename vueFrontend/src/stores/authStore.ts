import type { App, LoginResponse, ProviderEndpoints, User } from '@/types'
import { treaty } from '@elysiajs/eden'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

export const useAuthStore = defineStore('auth', () => {
  // Default state
  const user = ref<User>()
  const isLoggedIn = ref<boolean>(false)
  const token = ref<string>('')
  // API
  const client = treaty<App>(import.meta.env.VITE_API_URL)
  // Vue Hooks
  const router = useRouter()

  // Setters
  function setUser(newValue: User | undefined) {
    user.value = newValue
    localStorage.setItem('user', JSON.stringify(newValue))
  }

  function setLoggedIn(newValue: boolean) {
    isLoggedIn.value = newValue
    localStorage.setItem('loggedIn', newValue.toString())
  }

  function setToken(newValue: string) {
    token.value = newValue
    localStorage.setItem('token', newValue)
  }

  // Util Functions
  /**
   * Trys to login the user with the given username and password and endpoint
   * @param username - username
   * @param password - password
   * @param endpoint - endpoint
   */
  async function login(username: string, password: string, endpoint: ProviderEndpoints) {
    try {
      const { data: response, status } = await client.login.post({ username, password, endpoint })
      if (status === 200) {
        const loginResponse = response as LoginResponse

        setLoggedIn(true)
        setToken(loginResponse.token)
        setUser(loginResponse.user)
      }
    } catch (error) {
      console.log('error when trying to login: ', error)
    }
  }

  /**
   * Checks if user is Currently logged in
   */
  function authenticateUser() {
    return isLoggedIn.value
  }

  /**
   * Logout
   */
  function logout() {
    setLoggedIn(false)
    setToken('')
    setUser(undefined)
    router.push({ name: 'login' })
  }

  return {
    user,
    isLoggedIn,
    token,
    // functions
    login,
    logout,
    authenticateUser
  }
})
