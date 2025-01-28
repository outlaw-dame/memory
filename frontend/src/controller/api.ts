import type { SignInBody, SignInResponse, SignUpBody } from '#api/types'
import { useAuthStore, type useAuthStore as AuthStore } from '@/stores/authStore'
import { ApiErrorsGeneral, ProviderSignInErrors, ProviderSignUpErrors, type ApiErrors } from '@/types'
import ky, { HTTPError } from 'ky'

export interface ApiResponse<T> {
  data: T
  status: number
}

export class ApiClient {
  baseUrl: string
  authStore = useAuthStore()

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL
  }

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
   * @param body - SignInBody
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
