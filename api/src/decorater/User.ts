import { encodeWebId } from '@/util/user'
import { podProviderEndpoint, ViablePodProvider, type SelectUsers } from '../types'

export default class User {
  userId: number = 0
  username: string = ''
  token: string = ''
  provider: string = ''
  endpoint: string = ''
  webId: string = ''
  providerWebId: string = ''

  constructor(dbUser?: SelectUsers, token?: string) {
    if (dbUser) {
      this.userId = dbUser.id
      this.username = dbUser.name
      this.provider = dbUser.providerName
      this.computeValues()
    }
    if (token) {
      this.token = token
    }
  }

  loadUser(oldUser: string) {
    const newUser = JSON.parse(oldUser)
    this.userId = newUser.userId
    this.username = newUser.username
    this.token = newUser.token
    this.provider = newUser.provider
    this.computeValues()
  }

  private computeValues() {
    this.endpoint = podProviderEndpoint[this.provider as ViablePodProvider]
    this.webId = encodeWebId(this)
    this.providerWebId = this.endpoint + '/' + this.username
  }

  getWebId() {
    return encodeWebId(this)
  }

  toString() {
    return JSON.stringify({
      userId: this.userId,
      username: this.username,
      token: this.token,
      provider: this.provider
    })
  }
}
