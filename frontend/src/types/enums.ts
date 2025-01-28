export type ApiErrors = ProviderSignUpErrors | ApiErrorsGeneral | ProviderSignInErrors

export enum ApiErrorsGeneral {
  default = 'Something went wrong',
  unauthorized = 'You are not authorized to perform this action'
}

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
