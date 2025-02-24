import { AssertError } from '@sinclair/typebox/value';
import { ErrorMessages } from '../types';
import Moleculer from 'moleculer';

export function getErrorMessage(e: any): {
  status: number;
  message: string;
} {
  console.error('error: ', e);
  // deal with wrong params / request bodys
  if (e instanceof AssertError) {
    return {
      status: 400,
      message: `error with ${e.error.path}: ${e.message}`
    };
  }
  // deal with Moleculer Errors
  else if (e instanceof Moleculer.Errors.ServiceNotAvailableError) {
    return {
      status: 500,
      message: 'somthing whent wrong'
    };
  }
  // Deal with service specific errors
  else {
    switch (e) {
      // "auth.account" errors
      case ErrorMessages.accountNotFound:
        return {
          status: 404,
          message: 'The Account was not found'
        };
      case ErrorMessages.usernameContainsProfanity:
        return {
          status: 400,
          message: 'Username contains Forbidden word'
        };
      // default
      default:
        return { status: 500, message: 'There was an error' };
    }
  }
}
