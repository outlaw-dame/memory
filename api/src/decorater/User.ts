import type { SelectUsers } from "../types"

export default class User {
  userId: number
  userName: string
  token: string
  endpoint: string

  constructor(dbUser?: SelectUsers, token?: string) {
    this.userId = 0
    this.userName = ''
    this.token = ''
    this.endpoint = ''

    if (dbUser) {
      this.userId = dbUser.id
      this.userName = dbUser.name
      this.endpoint = dbUser.providerEndpoint
    }
    if (token) {
      this.token = token
    }
  }

  loadUser(oldUser: User) {
    this.userId = oldUser.userId
    this.userName = oldUser.userName
    this.token = oldUser.token
    this.endpoint = oldUser.endpoint
  }

  getWebId() {
    return `${this.endpoint}/${this.userName}`
  }

  setUser(userId: number, userName: string, token: string, endpoint: string) {
    this.userId = userId
    this.userName = userName
    this.token = token
    this.endpoint = endpoint
  }

  setUsername(userName: string) {
    const userIdSplit = userName.split('/')
    this.userName = userName
    this.endpoint = userIdSplit[userIdSplit.length - 2]
  }

  setToken(token: string) {
    this.token = token
  }
}
