import Moleculer from 'moleculer';
import { signinBody } from '../src/types';
import { Value } from '@sinclair/typebox/value';

export default {
  name: 'memoryapi',

  actions: {
    signin: {
      rest: 'POST /signin',

      handler(ctx: Moleculer.Context<any, any, Moleculer.GenericObject>) {
        try {
          Value.Assert(signinBody, ctx.params);
        } catch (e) {
          console.log(e);
          ctx.meta.$statusCode = 400;
          return `error with ${e.error.path}: ${e.message}`;
        }
        return 'Hello API Gateway!';
      }
    }
  }
};
