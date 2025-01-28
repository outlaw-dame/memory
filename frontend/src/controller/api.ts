import type { SelectPost, SelectQueryObject, SignInBody, SignInResponse, SignUpBody } from '#api/types'
import { useAuthStore, type useAuthStore as AuthStore } from '@/stores/authStore'
import { ApiErrorsGeneral, ProviderSignInErrors, ProviderSignUpErrors, type ApiErrors } from '@/types'
import ky, { HTTPError } from 'ky'

export enum ResponseStatus {
  OK = 200,
  UNAUTHORIZED = 401,
  BAD_REQUEST = 400,
  SERVER_ERROR = 500
}

export type ResponseErrors = ResponseStatus.UNAUTHORIZED | ResponseStatus.BAD_REQUEST | ResponseStatus.SERVER_ERROR

export type ResponseSuccess = ResponseStatus.OK

export interface ApiResponse<T, S extends ResponseStatus = ResponseStatus> {
  data: T
  status: S
}

export type DetailedApiResponse<T> = ApiResponse<ApiErrors, ResponseErrors> | ApiResponse<T, ResponseSuccess>

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

  // Auth functions
  /**
   * Sign up a new user
   * @param {SignUpBody} body - body that is sent to the api
   * @returns {DetailedApiResponse<SignInResponse>}
   */
  async signup(body: SignUpBody): Promise<DetailedApiResponse<SignInResponse>> {
    try {
      const response = await ky.post<SignInResponse>(`${this.baseUrl}/signup`, { json: body })
      return {
        data: await response.json(),
        status: response.status
      }
    } catch (e) {
      return await this.handleError(e)
    }
  }

  /**
   * Sign in a user
   * @param {SignInBody} body - body that is sent to the api
   * @returns {DetailedApiResponse<SignInResponse>}
   */
  async signin(body: SignInBody): Promise<DetailedApiResponse<SignInResponse>> {
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

  // Posts functions
  /**
   * Fetches posts from the API
   * @param {SelectQueryObject} query - query parameters
   * @returns {ApiResponse<SelectPost[]>}
   */
  async fetchPosts(query: SelectQueryObject): Promise<DetailedApiResponse<SelectPost[]>> {
    try {
      const response = await ky.get<SelectPost[]>(`${this.baseUrl}/posts`, { searchParams: query })
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
  async handleError(e: unknown): Promise<ApiResponse<ApiErrors, ResponseErrors>> {
    if (e instanceof HTTPError) {
      const errorMessage = await e.response.text()
      if (e.response.status === 500) {
        if (ProviderSignUpErrors[errorMessage as keyof typeof ProviderSignUpErrors]) {
          return {
            data: ProviderSignUpErrors[errorMessage as keyof typeof ProviderSignUpErrors],
            status: ResponseStatus.BAD_REQUEST
          }
        }
        return {
          data: ProviderSignUpErrors.providerSignUpDefault,
          status: ResponseStatus.BAD_REQUEST
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
      status: ResponseStatus.SERVER_ERROR
    }
  }
}
