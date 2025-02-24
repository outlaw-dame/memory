import Moleculer from 'moleculer';
import {
  SignInBody,
  signinBody,
  signUpBody,
  SignUpBody,
  SignInResponse,
  AuthAccountVerifyResponse,
  AuthAccountCreateBody,
  AuthAccountVerifyBody
} from '../src/types';
import { AssertError, Value } from '@sinclair/typebox/value';
import { v4 as uuidv4 } from 'uuid';
import CONFIG from '../config/config.js';
import { getErrorMessage } from '../src/utility';

export default {
  name: 'memoryapi',

  actions: {
    signup: {
      rest: 'POST /signup',

      async handler(ctx: Moleculer.Context<SignUpBody, any, Moleculer.GenericObject>) {
        try {
          // Validate requestbody
          Value.Assert(signUpBody, ctx.params);

          const uuid = uuidv4();
          const webId = `@${ctx.params.username}@${CONFIG.APP_NAME}`;

          // Check if username exists
          // TODO: Create type for AuthAccountCreateResponse
          const callRet = await ctx.call<any, AuthAccountCreateBody>('auth.account.create', {
            uuid,
            webId,
            username: ctx.params.username,
            password: ctx.params.password
          });
          console.info('callRet: ', callRet);
          return 'Successfully created account';
        } catch (e) {
          const error = getErrorMessage(e);
          ctx.meta.$statusCode = error.status;

          return error.message;
        }
      }
    },
    signin: {
      rest: 'POST /signin',

      async handler(ctx: Moleculer.Context<SignInBody, any, Moleculer.GenericObject>) {
        try {
          // Validate requestbody
          Value.Assert(signinBody, ctx.params);

          // Verify that an account with given params exists
          const callRet = await ctx.call<AuthAccountVerifyResponse, AuthAccountVerifyBody>(
            'auth.account.verify',
            ctx.params
          );

          const response: SignInResponse = {
            token: '',
            user: {
              username: callRet.username,
              uuid: callRet.uuid,
              webId: callRet.webId
            }
          };
          return response;
        } catch (e) {
          const error = getErrorMessage(e);
          ctx.meta.$statusCode = error.status;

          return error.message;
        }
      }
    }
  }
};
