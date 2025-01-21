export default class User {
  userId: string
  token: string
  endpoint: string

  constructor() {
    this.userId = ''
    this.token = ''
    this.endpoint = ''
  }

  setUserId(userId: string) {
    const userIdSplit = userId.split('/')
    this.userId = userId
    this.endpoint = userIdSplit[userIdSplit.length - 2]
  }
  setToken(token: string) {
    this.token = token
  }
}
