import type { SignUpBody, SignInResponse, ViablePodProvider, SelectUsers } from '#api/types'
import { ApiClient } from '@/controller/api'
import type { ApiErrors } from '@/types'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useRouter } from 'vue-router'

export const useAuthStore = defineStore('auth', () => {
  // Default state
  const user = ref<SelectUsers>()
  const isLoggedIn = ref<boolean>(false)
  const token = ref<string>('')
  // API
  const client = new ApiClient()
  // Vue Hooks
  const router = useRouter()

  // Setters
  function setUser(newValue: SelectUsers | undefined) {
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
   * Check if there is a user in the local storage
   */
  function initStore() {
    const localUser = localStorage.getItem('user')
    if (localUser && localUser !== 'undefined') {
      user.value = JSON.parse(localUser)
    }

    const localLoggedIn = localStorage.getItem('loggedIn')
    if (localLoggedIn) {
      isLoggedIn.value = JSON.parse(localLoggedIn)
    }

    const localToken = localStorage.getItem('token')
    if (localToken && localToken !== '') {
      token.value = localToken
    }
  }
  /**
   * Trys to signIn the user with the given username and password and endpoint
   * @param {string} username - username
   * @param {string} password - password
   * @param {ViablePodProvider} providerName - endpoint
   * @returns {void | ApiErrors} - when successful it redirects to home, returns ApiErrors if error
   */
  async function signin(
    username: string,
    password: string,
    providerName: ViablePodProvider
  ): Promise<void | ApiErrors> {
    try {
      const { data: response, status } = await client.signin({ username, password, providerName })
      if (status === 200) {
        const signInResponse = response as SignInResponse

        setLoggedIn(true)
        setToken(signInResponse.token)
        setUser(signInResponse.user)
        router.push({ name: 'home' })
      } else if (status === 401) {
        return response as ApiErrors
      }
    } catch (error) {
      console.log('error when trying to signIn: ', error)
    }
  }
  /**
   * Signup a new user
   * @param {string} email - email
   * @param {string} username - username
   * @param {string} password - password
   * @param {ViablePodProvider} providerName - provider
   */
  async function signup(
    email: string,
    username: string,
    password: string,
    providerName: ViablePodProvider
  ): Promise<void | ApiErrors> {
    const body: SignUpBody = { username, password, email, providerName }
    const { data: response, status } = await client.signup(body)
    if (status === 200) {
      const signupResponse = response as SignInResponse
      setLoggedIn(true)
      setToken(signupResponse.token)
      setUser(signupResponse.user)
      router.push({ name: 'home' })
    } else if (status === 500) {
      return response as ApiErrors
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
    router.push({ name: 'welcome' })
  }

  initStore()
  return {
    user,
    isLoggedIn,
    token,
    // functions
    signin,
    signup,
    logout,
    authenticateUser
  }
})
