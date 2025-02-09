import { AuthAccountService } from '@semapps/auth';
import { TripleStoreAdapter } from '@semapps/triplestore';
import CONFIG from '../../config/config';

// We import only this sub-service as we need it for the bot
// The WebFinger service currently relies on this service to identify unique users
export default {
  mixins: [AuthAccountService],
  adapter: new TripleStoreAdapter({
    type: 'AuthAccount',
    dataset: CONFIG.AUTH_ACCOUNTS_DATASET_NAME,
    baseUri: `urn:WebhookChannelListener:`
  })
};
