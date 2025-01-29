import { podProviderEndpoint, ViablePodProvider, type SelectUsers } from '../types'

export default class User {
  userId: number = 0
  userName: string = ''
  token: string = ''
  provider: string = ''
  endpoint: string = ''

  constructor(dbUser?: SelectUsers, token?: string) {
    if (dbUser) {
      this.userId = dbUser.id
      this.userName = dbUser.name
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
    this.userName = newUser.userName
    this.token = newUser.token
    this.provider = newUser.provider
    this.computeValues()
  }

  private computeValues() {
    this.endpoint = podProviderEndpoint[this.provider as ViablePodProvider]
  }

  getWebId() {
    return `${this.endpoint}/${this.userName}`
  }

  toString() {
    return JSON.stringify({
      userId: this.userId,
      userName: this.userName,
      token: this.token,
      provider: this.provider
    })
  }
}
