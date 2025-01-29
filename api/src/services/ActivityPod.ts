import ky from 'ky'
import type { NoteCreateRequest, PodProviderSignInResponse } from '../types'
import type User from '../decorater/User'

export default abstract class ActivityPod {
  static async signIn(endpoint: string, username: string, password: string) {
    const response: PodProviderSignInResponse = await ky
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
    const response: PodProviderSignInResponse = await ky
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
      .post(`${user.endpoint}/${user.username}/outbox`, {
        headers: {
          Authorization: `Bearer ${user.token}`
        },
        json: post
      })
      .json()
    return response
  }
}
