import type { SelectUsers } from "../types"

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

  }

  }
}
