import Moleculer from 'moleculer';
import molecularWeb from 'moleculer-web';
import {
  SignInBody,
  signinBody,
  signUpBody,
  SignUpBody,
  SignInResponse,
  AuthAccountVerifyResponse,
  AuthAccountCreateBody,
  AuthAccountVerifyBody,
  User
} from '../../src/types';
import { Value } from '@sinclair/typebox/value';
import { v4 as uuidv4 } from 'uuid';
import CONFIG from '../../config/config.js';
import { generateJWT, getErrorMessage, verifyJWT } from '../../src/utility';

export default {
  /**
   * Authorize the request throws an unauthorized error if no token or wrong token is provided
   * @returns {User} the user object
   */
  async authorize(ctx: Moleculer.Context<any, any, Moleculer.GenericObject>) {
    const { req, res } = ctx.params;

    if (!req.headers.authorization) {
      throw new molecularWeb.Errors.UnAuthorizedError('No token provided', {});
    }
    const user = verifyJWT(req.headers.authorization);
    return user;
  },
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
        const user: User = {
          username: callRet.username,
          uuid: callRet.uuid,
          webId: callRet.webId
        };

        const response: SignInResponse = {
          token: generateJWT(user),
          user
        };
        return response;
      } catch (e) {
        const error = getErrorMessage(e);
        ctx.meta.$statusCode = error.status;

        return error.message;
      }
    }
  }
};
