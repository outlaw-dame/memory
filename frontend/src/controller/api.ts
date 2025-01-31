import type {
  CreatePost,
  FollowersFollowedResponse,
  SelectPost,
  SelectQueryObject,
  SignInBody,
  SignInResponse,
  SignUpBody
} from '#api/types'
import { FollowErrors, ProviderSignInErrors, ProviderSignUpErrors } from '#api/types'
import { useAuthStore } from '@/stores/authStore'
import {
  ApiErrorsGeneral,
  ResponseStatus,
  type ApiErrors,
  type ApiResponse,
  type DetailedApiResponse,
  type ResponseErrors
} from '@/types'
import ky, { HTTPError } from 'ky'

/**
 * ApiClient is a class that handles all requests to the api and handles non 200 responses
 */
export class ApiClient {
  baseUrl: string
  authStore = useAuthStore()
  authRequest = ky.extend({ hooks: { beforeRequest: [req => req.headers.set('auth', this.getAuth())] } })

  /**
   * Constructor
   * Sets the baseUrl to the import.meta.env.VITE_API_URL
   */
  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL
  }

  // Util functions
  /**
   * Get auth
   * @returns {string} the auth token
   */
  getAuth(): string {
    return this.authStore.token || ''
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
        // SignUp Errors
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
        // SignIn Errors
        if (ProviderSignInErrors[errorMessage as keyof typeof ProviderSignInErrors]) {
          return {
            data: ProviderSignInErrors[errorMessage as keyof typeof ProviderSignInErrors],
            status: 400
          }
        }
        // Follow/UnfollowErrors
        else if (FollowErrors[errorMessage as keyof typeof FollowErrors]) {
          return {
            data: FollowErrors[errorMessage as keyof typeof FollowErrors],
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
      const response = await this.authRequest.get<SelectPost[]>(`${this.baseUrl}/posts`, { searchParams: query })
      return {
        data: await response.json(),
        status: response.status
      }
    } catch (e) {
      return await this.handleError(e)
    }
  }

  /**
   * Creates a new post
   * @param {CreatePost} body - body that is sent to the api
   * @returns {DetailedApiResponse<SelectPost>}
   */
  async createPost(body: CreatePost): Promise<DetailedApiResponse<SelectPost>> {
    try {
      const response = await this.authRequest.post<SelectPost>(`${this.baseUrl}/posts`, { json: body })
      return {
        data: await response.json(),
        status: response.status
      }
    } catch (e) {
      return await this.handleError(e)
    }
  }

  // User functions
  /**
   * Follows a user
   * @param {string} userId - id of the user to follow
   * @returns {Promise<ApiResponse>} - response of the request
   */
  async followUser(userId: string): Promise<DetailedApiResponse<FollowersFollowedResponse>> {
    try {
      const response = await this.authRequest.post<FollowersFollowedResponse>(`${this.baseUrl}/user/${userId}/follow`)
      return {
        data: await response.json(),
        status: response.status
      }
    } catch (e) {
      return await this.handleError(e)
    }
  }

  /**
   * Unfollow a user
   * @param {string} userId - id of the user to unfollow
   * @returns {Promise<DetailedApiResponse<string>>}
   */
  async unfollowUser(userId: string): Promise<DetailedApiResponse<FollowersFollowedResponse>> {
    try {
      const response = await this.authRequest.post<FollowersFollowedResponse>(`${this.baseUrl}/user/${userId}/unfollow`)
      return {
        data: await response.json(),
        status: response.status
      }
    } catch (e) {
      return await this.handleError(e)
    }
  }

  /**
   * Fetches the users that the user is following
   * @returns {Promise<DetailedApiResponse<FollowersFollowedResponse[]>>}
   */
  async fetchFollowing(): Promise<DetailedApiResponse<FollowersFollowedResponse[]>> {
    try {
      const response = await this.authRequest.get<FollowersFollowedResponse[]>(`${this.baseUrl}/user/following`)
      return {
        data: await response.json(),
        status: response.status
      }
    } catch (e) {
      return await this.handleError(e)
    }
  }

  /**
   * Fetches the users that the user is following
   * @returns {Promise<DetailedApiResponse<FollowersFollowedResponse[]>>}
   */
  async fetchFollowers(): Promise<DetailedApiResponse<FollowersFollowedResponse[]>> {
    try {
      const response = await this.authRequest.get<FollowersFollowedResponse[]>(`${this.baseUrl}/user/followers`)
      return {
        data: await response.json(),
        status: response.status
      }
    } catch (e) {
      return await this.handleError(e)
    }
  }
}
