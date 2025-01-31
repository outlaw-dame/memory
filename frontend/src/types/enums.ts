import type { FollowErrors, ProviderSignInErrors, ProviderSignUpErrors } from '#api/types'

export type ApiErrors = ProviderSignUpErrors | ApiErrorsGeneral | ProviderSignInErrors | FollowErrors

export enum ApiErrorsGeneral {
  default = 'Something went wrong',
  unauthorized = 'You are not authorized to perform this action'
}
