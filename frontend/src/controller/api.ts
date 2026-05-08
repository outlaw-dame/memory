import type { SignInResponse, SignUpBody } from '#api/types'
import { buildApiHeaders, getApiBaseUrl } from '@/controller/http'
import { ApiErrorsGeneral, ProviderSignUpErrors, type ApiErrors } from '@/types'
import ky, { HTTPError } from 'ky'

export interface OidcExchangeBody {
  accessToken: string
  webId: string
  providerEndpoint: string
  name?: string
  email?: string
}

export interface ApiResponse<T> {
  data: T
  status: number
}

export class ApiClient {
  baseUrl: string
  constructor() {
    this.baseUrl = getApiBaseUrl()
  }

  async signup(body: SignUpBody): Promise<ApiResponse<SignInResponse | string | ApiErrors>> {
    try {
      const response = await ky
        .post(`${this.baseUrl}/signup`, {
          headers: buildApiHeaders({ includeJsonContentType: true }),
          json: body
        })
        .json<SignInResponse>()

      return {
        data: response,
        status: 200
      }
    } catch (e) {
      return await this.handleError(e)
    }
  }

  async exchangeOidc(body: OidcExchangeBody): Promise<ApiResponse<SignInResponse | ApiErrors>> {
    try {
      const data = await ky
        .post(`${this.baseUrl}/auth/oidc/exchange`, {
          headers: buildApiHeaders({ includeJsonContentType: true }),
          json: body
        })
        .json<SignInResponse>()

      return {
        data,
        status: 200
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
