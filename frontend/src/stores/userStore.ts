import type { FollowersFollowedResponse } from '#api/types'
import { ApiClient } from '@/controller/api'
import { ResponseStatus } from '@/types'
import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * Store handeling all things user related
 */
export const useUserStore = defineStore('user', async () => {
  const client = new ApiClient()

  // store vars
  const following = ref<FollowersFollowedResponse[]>([])
  const followers = ref<FollowersFollowedResponse[]>([])

  /**
   * Follows a user
   * @param userWebId - webId of the user to follow
   */
  async function followUser(userWebId: string) {
    await client.followUser(userWebId)
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

  // Init
  await getFollowing()
  await getFollowers()

  return {
    following,
    followers,
    getFollowing,
    getFollowers,
    followUser,
    unfollowUser
  }
})
