export enum FollowErrors {
  NotOnMemory = 'The user to follow is not on the memory.',
  NotValidProvider = 'The provider of the user to follow is not a viable pod provider.',
  AlreadyFollowing = 'User already follows the user.',
  IsSelf = 'Cannot follow yourself.'
}
