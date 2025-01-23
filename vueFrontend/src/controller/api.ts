import type { SignUpBody } from '#api/types'
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

  async signup(body: SignUpBody): Promise<ApiResponse<string>> {
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

  async handleError(e: unknown): Promise<ApiResponse<string>> {
    if (e instanceof HTTPError) {
      if (e.response.status === 500) {
        const errorMessage = (await e.response.text()).replaceAll('.', ' ')
        return {
          data: errorMessage,
          status: 500
        }
      }
      console.log('error when requesting api: ', e)
      console.log(await e.response.text())
      return {
        data: 'something went wrong',
        status: e.response.status
      }
    }
    return {
      data: 'something went wrong',
      status: 0
    }
  }
}
