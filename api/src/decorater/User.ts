import type { SelectUsers } from "../types"

export default class User {
  userId: number
  userName: string
  token: string
  endpoint: string
  webId: string
  /** ATProto DID (e.g. "did:plc:abc123"), or null if not yet linked. */
  atprotoDid: string | null
  /** ATProto handle (e.g. "alice.pod.example"), or null if not yet resolved. */
  atprotoHandle: string | null

  constructor(dbUser?: SelectUsers, token?: string) {
    this.userId = 0
    this.userName = ''
    this.token = ''
    this.endpoint = ''
    this.webId = ''
    this.atprotoDid = null
    this.atprotoHandle = null

    if (dbUser) {
      this.userId = dbUser.id
      this.userName = dbUser.name
      this.endpoint = dbUser.providerEndpoint
      this.webId = dbUser.webId
      this.atprotoDid = dbUser.atprotoDid ?? null
      this.atprotoHandle = dbUser.atprotoHandle ?? null
    }
    if (token) {
      this.token = token
    }
  }

  loadUser(oldUser: Partial<User>) {
    this.userId = oldUser.userId ?? 0
    this.userName = oldUser.userName ?? ''
    this.token = oldUser.token ?? ''
    this.endpoint = oldUser.endpoint ?? ''
    this.webId = oldUser.webId ?? ''
    this.atprotoDid = oldUser.atprotoDid ?? null
    this.atprotoHandle = oldUser.atprotoHandle ?? null
  }

  getWebId() {
    if (this.webId) return this.webId
    return `${this.endpoint}/${this.userName}`
  }

  setUser(userId: number, userName: string, token: string, endpoint: string, webId?: string) {
    this.userId = userId
    this.userName = userName
    this.token = token
    this.endpoint = endpoint
    this.webId = webId ?? ''
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
