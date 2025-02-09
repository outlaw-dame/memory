import path from 'path';
import { CoreService } from '@semapps/core';
import { apods, notify, interop, oidc } from '@semapps/ontologies';
import CONFIG from '../../config/config';

export default {
  mixins: [CoreService],
  settings: {
    baseUrl: CONFIG.HOME_URL,
    baseDir: path.resolve(__dirname, '../..'),
    triplestore: {
      url: CONFIG.SPARQL_ENDPOINT,
      user: CONFIG.JENA_USER,
      password: CONFIG.JENA_PASSWORD,
      mainDataset: CONFIG.MAIN_DATASET
    },
    ontologies: [apods, notify, interop, oidc],
    activitypub: {
      queueServiceUrl: CONFIG.QUEUE_SERVICE_URL
    },
    api: {
      port: CONFIG.PORT
    },
    ldp: {
      resourcesWithContainerPath: false
    },
    void: false,
    webid: false
  }
};
