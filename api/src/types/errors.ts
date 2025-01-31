export enum FollowErrors {
  NotOnMemory = 'The user to follow is not on the memory.',
  NotFollowing = 'User is not following the user.',
  NotValidProvider = 'The provider of the user to follow is not a viable pod provider.',
  AlreadyFollowing = 'User already follows the user.',
  IsSelf = 'Cannot follow yourself.'
}

// Errors that are thrown by the pod provider
export enum ProviderSignUpErrors {
  providerSignUpDefault = 'Error while signing up the user',
  'username.invalid' = 'Username is invalid',
  'username.already.exists' = 'Username is already taken',
  'email.invalid' = 'Email is invalid',
  'email.already.exists' = 'Email is already taken'
}

export enum ProviderSignInErrors {
  "Endpoint didn't respond with a 200 status code" = 'Wrong credentials'
}
