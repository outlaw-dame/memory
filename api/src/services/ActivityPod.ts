import ky from 'ky'
import type { NoteCreateRequest, PodProviderLoginResponse } from '../types'
import type User from '../decorater/User'

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
    return response
  }

  static async createPost(user: User, post: NoteCreateRequest) {
    const response = await ky
      .post(`${user.userId}/outbox`, {
        headers: {
          Authorization: `Bearer ${user.token}`
        },
        json: post
      })
      .json()
    return response
  }
}
