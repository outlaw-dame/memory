import type { ApiErrors } from './enums'

export enum ResponseStatus {
  OK = 200,
  UNAUTHORIZED = 401,
  BAD_REQUEST = 400,
  SERVER_ERROR = 500
}

export type ResponseErrors = ResponseStatus.UNAUTHORIZED | ResponseStatus.BAD_REQUEST | ResponseStatus.SERVER_ERROR

export type ResponseSuccess = ResponseStatus.OK

export interface ApiResponse<T, S extends ResponseStatus = ResponseStatus> {
  data: T
  status: S
}

export type DetailedApiResponse<T> = ApiResponse<ApiErrors, ResponseErrors> | ApiResponse<T, ResponseSuccess>
