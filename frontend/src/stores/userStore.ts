import type { FollowersFollowedResponse } from '#api/types'
import { ApiClient } from '@/controller/api'
import { ResponseStatus } from '@/types'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from './authStore'
import { VsNotification } from 'vuesax-alpha'

/**
 * Store handeling all things user related
 */
export const useUserStore = defineStore('user', () => {
  const client = new ApiClient()
  const authStore = useAuthStore()

  // store vars
  const following = ref<FollowersFollowedResponse[]>([])
  const followers = ref<FollowersFollowedResponse[]>([])

  /**
   * Follows a user
   * @param userWebId - webId of the user to follow
   */
  async function followUser(userWebId: string) {
    const response = await client.followUser(userWebId)
    if (response.status === ResponseStatus.OK) {
      following.value.push(response.data)
      VsNotification({
        title: `You are now following ${response.data.name}`,
        content: '',
        color: 'success'
      })
    } else {
      console.error('Error when following user: ', response.data)
      VsNotification({
        title: 'Error while following user',
        content: response.data,
        color: 'danger'
      })
    }
  }

  async function unfollowUser(userWebId: string) {
    await client.unfollowUser(userWebId)
  }

  /**
   * Get all the users that the current user is following
   * @returns {Promise<void>}
   */
  async function getFollowing(): Promise<void> {
    const response = await client.fetchFollowing()

    if (response.status === ResponseStatus.OK) {
      following.value = response.data
    } else {
      console.error('Error when fetching following: ', response.data)
    }
  }

  /**
   * Get all the users that follow the current user
   */
  async function getFollowers(): Promise<void> {
    const response = await client.fetchFollowers()

    if (response.status === ResponseStatus.OK) {
      followers.value = response.data
    } else {
      console.error('Error when fetching followers: ', response.data)
    }
  }

  /**
   * Check if the current user can follow the user
   * @param {string} userWebId - webId of the user to check
   * @returns {boolean} - true if the user can follow the user, false if not
   */
  function canFollow(userWebId: string): boolean {
    // check if the user is the current user
    if (userWebId === authStore.user?.webId) return false
    // check if the user is already following the user
    return following.value.find(user => user.webId === userWebId) === undefined
  }

  // Init
  getFollowing()
  getFollowers()

  return {
    following,
    followers,
    getFollowing,
    getFollowers,
    followUser,
    canFollow,
    unfollowUser
  }
})
