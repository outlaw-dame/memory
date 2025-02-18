export enum PodRequestTypes {
  Follow = 'Follow',
  Undo = 'Undo',
  Note = 'Note'
}

interface BasePodRequest<T> {
  '@context': 'https://www.w3.org/ns/activitystreams'
  type: PodRequestTypes
  to: T
}

interface PodRequest<O, T = string> extends BasePodRequest<T> {
  actor: string
  object: O
}

export type FollowRequest = PodRequest<string>
export type UnfollowRequest = PodRequest<Omit<FollowRequest, '@context' | 'to'>>
export interface NoteCreateRequest extends BasePodRequest<string[]> {
  attributedTo: string
  content: string
}

export interface PodProviderSignInResponse {
  token: string
  webId: string
  newUser: boolean
}
