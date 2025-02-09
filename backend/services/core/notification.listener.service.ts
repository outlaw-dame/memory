import { TripleStoreAdapter } from '@semapps/triplestore';
import { NotificationsListenerService } from '@semapps/solid';
import CONFIG from '../../config/config';

export default {
  mixins: [NotificationsListenerService],
  adapter: new TripleStoreAdapter({
    type: 'WebhookChannelListener',
    dataset: CONFIG.AUTH_ACCOUNTS_DATASET_NAME,
    baseUri: `urn:WebhookChannelListener:`
  }),
  settings: {
    baseUrl: CONFIG.HOME_URL
  }
};
