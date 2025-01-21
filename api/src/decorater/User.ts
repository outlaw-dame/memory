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
    this.userId = userId
    this.endpoint = userId.split('/')[-1]
  }
  setToken(token: string) {
    this.token = token
  }
}
