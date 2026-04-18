import type { SignInBody, SignUpBody, SignInResponse } from '#api/types'
import { ApiClient } from '@/controller/api'
import { buildApiHeaders, getApiBaseUrl } from '@/controller/http'
import { beginOidcSignIn, finishOidcSignIn, DEFAULT_PROVIDER_ENDPOINT } from '@/controller/oidc'
import { ApiErrorsGeneral, type ApiErrors, type App, type ProviderEndpoints, type User } from '@/types'
import { treaty } from '@elysiajs/eden'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { getSessionPolicyConfig } from '@/utils/sessionPolicy'
import { t } from '@/i18n'

const SESSION_STARTED_AT_KEY = 'memory.session.startedAt'
const sessionPolicyConfig = getSessionPolicyConfig()

export const useAuthStore = defineStore('auth', () => {
  // Default state
  const user = ref<User>()
  const isLoggedIn = ref<boolean>(false)
  const token = ref<string>('')
  const authError = ref<string>('')
  // API
  const client = treaty<App>(getApiBaseUrl(), {
    onRequest() {
      return {
        headers: buildApiHeaders({ authToken: token.value || undefined })
      }
    }
  })
  const apiClient = new ApiClient()
  // Vue Hooks
  const router = useRouter()

  function clearSessionStorage() {
    localStorage.removeItem(SESSION_STARTED_AT_KEY)
  }

  function markSessionStartedNow() {
    localStorage.setItem(SESSION_STARTED_AT_KEY, String(Date.now()))
  }

  function getSessionStartedAt(): number | null {
    const raw = localStorage.getItem(SESSION_STARTED_AT_KEY)
    if (!raw) return null
    const parsed = Number(raw)
    if (!Number.isFinite(parsed) || parsed <= 0) return null
    return parsed
  }

  function hasFreshBrowserSession() {
    if (!isLoggedIn.value || !token.value) return false
    const startedAt = getSessionStartedAt()
    if (!startedAt) return false
    return Date.now() - startedAt <= sessionPolicyConfig.sessionMaxAgeMs
  }

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

  function setAuthError(newValue: string) {
    authError.value = newValue
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

    // Fail closed when session age is missing/stale so users are only kept signed
    // in for a bounded period unless they re-authenticate.
    if (isLoggedIn.value && !hasFreshBrowserSession()) {
      setLoggedIn(false)
      setToken('')
      setUser(undefined)
      clearSessionStorage()
    }
  }
  /**
   * Trys to signIn the user with the given username and password and endpoint
   * @param username - username
   * @param password - password
   * @param providerEndpoint - endpoint
   */
  async function signin(username: string, password: string, providerEndpoint: ProviderEndpoints) {
    try {
      setAuthError('')
      const body: SignInBody = { username, password, providerEndpoint }
      const { data: response, status } = await client.signin.post(body)
      if (status === 200) {
        const signInResponse = response as SignInResponse

        setLoggedIn(true)
        setToken(signInResponse.token)
        setUser(signInResponse.user)
        markSessionStartedNow()
        router.push({ name: 'home' })
      }
    } catch (error) {
      console.log('error when trying to signIn: ', error)
      setAuthError(t('errors.unableToSignIn'))
    }
  }

  async function signinWithOidc(providerEndpoint: ProviderEndpoints = DEFAULT_PROVIDER_ENDPOINT as ProviderEndpoints) {
    setAuthError('')
    await beginOidcSignIn(providerEndpoint)
  }

  async function completeOidcSignin(search: string) {
    setAuthError('')

    try {
      const signInResponse = await finishOidcSignIn(search)
      setLoggedIn(true)
      setToken(signInResponse.token)
      setUser(signInResponse.user)
      markSessionStartedNow()
      await router.replace({ name: 'home' })
    } catch (error) {
      const message = error instanceof Error ? error.message : t('errors.unableToFinishSignIn')
      setAuthError(message)
      await router.replace({ name: 'signin' })
      throw error
    }
  }
  /**
   * Signup a new user
   * @param email - email
   * @param username - username
   * @param password - password
   * @param providerEndpoint - provider
   */
  async function signup(
    email: string,
    username: string,
    password: string,
    providerEndpoint: ProviderEndpoints
  ): Promise<void | ApiErrors> {
    const body: SignUpBody = { username, password, email, providerEndpoint }
    const { data: response, status } = await apiClient.signup(body)
    if (status === 200) {
      const signupResponse = response as SignInResponse
      setLoggedIn(true)
      setToken(signupResponse.token)
      setUser(signupResponse.user)
      markSessionStartedNow()
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
    setAuthError('')
    clearSessionStorage()
    router.push({ name: 'signin' })
  }

  initStore()
  return {
    user,
    isLoggedIn,
    token,
    authError,
    // functions
    signin,
    signinWithOidc,
    completeOidcSignin,
    signup,
    logout,
    authenticateUser,
    hasFreshBrowserSession,
    setAuthError
  }
})
