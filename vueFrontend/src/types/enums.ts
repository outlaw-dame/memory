import type { ApiSignUpErrors, FollowErrors, ProviderSignInErrors, ProviderSignUpErrors } from '#api/types'

export type ApiErrors = ProviderSignUpErrors | ApiErrorsGeneral | ProviderSignInErrors | FollowErrors | ApiSignUpErrors

export enum ApiErrorsGeneral {
  default = 'Something went wrong',
  unauthorized = 'You are not authorized to perform this action'
}
