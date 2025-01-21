import ky from 'ky'
import type { PodProviderLoginResponse } from '../types'

export default abstract class ActivityPod {
  static async login(endpoint: string, username: string, password: string) {
    const response: PodProviderLoginResponse = await ky
      .post(`${endpoint}/auth/login`, {
        json: {
          username,
          password
        }
      })
      .json()
    console.log('response: ', response)
    return response
  }

  static async signup(endpoint: string, username: string, password: string, email: string) {
    const response: PodProviderLoginResponse = await ky
      .post(`${endpoint}/auth/signup`, {
        json: {
          username,
          password,
          email
        }
      })
      .json()
    console.log('response: ', response)
    return response
  }
}
