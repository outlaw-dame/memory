export type ApiErrors = ProviderSignUpErrors | ApiErrorsGeneral

export enum ApiErrorsGeneral {
  default = 'Something went wrong'
}

export enum ProviderSignUpErrors {
  providerSignUpDefault = 'Error while signing up the user',
  'username.invalid' = 'Username is invalid',
  'username.already.exists' = 'Username is already taken',
  'email.invalid' = 'Email is invalid',
  'email.already.exists' = 'Email is already taken'
}
