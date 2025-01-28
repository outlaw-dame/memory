import type { SignInBody, SignInResponse, SignUpBody } from '#api/types'
import { useAuthStore, type useAuthStore as AuthStore } from '@/stores/authStore'
import { ApiErrorsGeneral, ProviderSignInErrors, ProviderSignUpErrors, type ApiErrors } from '@/types'
import ky, { HTTPError } from 'ky'

export interface ApiResponse<T> {
  data: T
  status: number
}

/**
 * ApiClient is a class that handles all requests to the api and handles non 200 responses
 */
export class ApiClient {
  baseUrl: string
  authStore = useAuthStore()

  /**
   * Constructor
   * Sets the baseUrl to the import.meta.env.VITE_API_URL
   */
  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL
  }

  /**
   * Sign up a new user
   * @param {SignUpBody} body - body that is sent to the api
   * @returns ApiResponse<SignInResponse | ApiErrors>
   */
  async signup(body: SignUpBody): Promise<ApiResponse<SignInResponse | string | ApiErrors>> {
    try {
      const response = await ky.post(`${this.baseUrl}/signup`, { json: body })
      return {
        data: 'Successfully signed up',
        status: response.status
      }
    } catch (e) {
      return await this.handleError(e)
    }
  }

  /**
   * Sign in a user
   * @param {SignInBody} body - body that is sent to the api
   * @returns ApiResponse<SignInResponse | ApiErrors>
   */
  async signin(body: SignInBody): Promise<ApiResponse<SignInResponse | ApiErrors>> {
    try {
      const response = await ky.post<SignInResponse>(`${this.baseUrl}/signin`, { json: body })
      return {
        data: await response.json(),
        status: response.status
      }
    } catch (e) {
      return await this.handleError(e)
    }
  }

  /**
   * Handles errors that are thrown by ky (all responses that are not 200 are handled here)
   * @param {unknown} e - error that is thrown
   * @returns ApiResponse<ApiErrors>
   */
  async handleError(e: unknown): Promise<ApiResponse<ApiErrors>> {
    if (e instanceof HTTPError) {
      const errorMessage = await e.response.text()
      if (e.response.status === 500) {
        if (ProviderSignUpErrors[errorMessage as keyof typeof ProviderSignUpErrors]) {
          return {
            data: ProviderSignUpErrors[errorMessage as keyof typeof ProviderSignUpErrors],
            status: 500
          }
        }
        return {
          data: ProviderSignUpErrors.providerSignUpDefault,
          status: 500
        }
      } else if (e.response.status === 401) {
        this.authStore.logout()
        return {
          data: ApiErrorsGeneral.unauthorized,
          status: 401
        }
      } else if (e.response.status === 400) {
        if (ProviderSignInErrors[errorMessage as keyof typeof ProviderSignInErrors]) {
          return {
            data: ProviderSignInErrors[errorMessage as keyof typeof ProviderSignInErrors],
            status: 400
          }
        }
      }
      console.log('error when requesting api: ', e)
      console.log(await e.response.text())
      return {
        data: ApiErrorsGeneral.default,
        status: e.response.status
      }
    }
    return {
      data: ApiErrorsGeneral.default,
      status: 0
    }
  }
}
