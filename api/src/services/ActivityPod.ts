import ky from 'ky'
import type { FollowRequest, NoteCreateRequest, PodProviderSignInResponse } from '../types'
import type User from '../decorater/User'

export default abstract class ActivityPod {
  /**
   *
   * @param endpoint - the url of the pod provider
   * @param username - the username of the user
   * @param password - the password of the user
   * @returns
   */
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

  /**
   * Singup a user with the provided credentials on the provided pod provider
   * @param endpoint - the url of the pod provider
   * @param username - the username of the user
   * @param password - the password of the user
   * @param email - the email of the user
   * @returns the response of the signup request when ther is an error it will throw an error
   */
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

  /**
   * Create a Post (Note)
   * @param user - the user who is creating the post
   * @param post - the post to create
   * @returns the response of the post request when ther is an error it will throw an error
   */
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

  /**
   * Follows a user
   * @param {User} user - the user who is following
   * @param {FollowRequest} body - the body of the follow request
   * @returns returns the response of the follow request when ther is an error it will throw an error
   */
  static async follow(user: User, body: FollowRequest) {
    const response = await ky
      .post(`${user.endpoint}/${user.username}/outbox`, {
        headers: {
          Authorization: `Bearer ${user.token}`
        },
        json: body
      })
      .json()
    return response
  }
}
