import { AuthAccountService } from '@semapps/auth';
import { TripleStoreAdapter } from '@semapps/triplestore';
import CONFIG from '../../config/config.js';
import { checkProfanity } from '../../src/util/user.js';

// We import only this sub-service as we need it for the bot
// The WebFinger service currently relies on this service to identify unique users
module.exports = {
  mixins: [AuthAccountService],
  adapter: new TripleStoreAdapter({ type: 'AuthAccount', dataset: CONFIG.AUTH_ACCOUNTS_DATASET_NAME }),
  methods: {
    async isValidUsername(ctx, username) {
      // Ensure the username has no space or special characters
      if (!/^[a-z0-9\-+_.]+$/.exec(username)) {
        throw new Error('username.invalid');
      }

      // Ensure we don't use reservedUsernames
      if (this.settings.reservedUsernames.includes(username)) {
        throw new Error('username.already.exists');
      }

      // Ensure username doesn't already exist
      const usernameExists = await ctx.call('auth.account.usernameExists', { username });
      if (usernameExists) {
        throw new Error('username.already.exists');
      }

      // check for swearwords in Username
      if (checkProfanity(username)) {
        throw new Error('username.contains.profanity');
      }

      return true;
    }
  }
};
