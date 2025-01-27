import type { SignInResponse, SignUpBody } from '#api/types'
import { ApiErrorsGeneral, ProviderSignUpErrors, type ApiErrors } from '@/types'
import ky, { HTTPError } from 'ky'

export interface ApiResponse<T> {
  data: T
  status: number
}

export class ApiClient {
  baseUrl: string
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

  async handleError(e: unknown): Promise<ApiResponse<ApiErrors>> {
    if (e instanceof HTTPError) {
      if (e.response.status === 500) {
        const errorMessage = await e.response.text()
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
