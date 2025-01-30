export enum FollowErrors {
  NotOnMemory = 'The user to follow is not on the memory.',
  NotFollowing = 'User is not following the user.',
  NotValidProvider = 'The provider of the user to follow is not a viable pod provider.',
  AlreadyFollowing = 'User already follows the user.',
  IsSelf = 'Cannot follow yourself.'
}
