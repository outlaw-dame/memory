export enum PodRequestTypes {
  Follow = 'Follow',
  Undo = 'Undo'
}

interface PodRequest<O, T = string> {
  '@context': 'https://www.w3.org/ns/activitystreams'
  type: PodRequestTypes
  actor: string
  object: O
  to: T
}

export type FollowRequest = PodRequest<string>
export type UnfollowRequest = PodRequest<Omit<FollowRequest, '@context' | 'to'>>
export type NoteCreateRequest = PodRequest<string, string[]>

export interface PodProviderSignInResponse {
  token: string
  webId: string
  newUser: boolean
}
