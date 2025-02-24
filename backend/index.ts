import WebAcl from '@semapps/webacl';
import CONFIG from './config/config.js';
import { ServiceBroker } from 'moleculer';
import ApiGateway from './moleculer-web-uws/src/index.js';
import { loadTsServices } from './src/utility';
import Moleculer from 'moleculer';

// Error.stackTraceLimit = Infinity;

// Use the cacher only if Redis is configured
const cacherConfig = CONFIG.REDIS_CACHE_URL
  ? {
      type: 'Redis',
      options: {
        prefix: 'action',
        ttl: 2592000, // Keep in cache for one month
        redis: CONFIG.REDIS_CACHE_URL
      }
    }
  : undefined;
let broker = new ServiceBroker({
  middlewares: [
    // @ts-expect-error
    WebAcl.WebAclMiddleware({ baseUrl: CONFIG.HOME_URL as string }), // Set the cacher before the WebAcl middleware
    WebAcl.CacherMiddleware(cacherConfig)
  ],
  logger: {
    type: 'Console',
    options: {
      formatter: 'short',
      level: 'info'
    }
  }
});

// Load all services from the services folder

broker.loadServices('./services');
loadTsServices(broker, './services');

broker.createService({
  name: 'apigateway',
  mixins: [ApiGateway as any],
  settings: {
    port: 4000
  }
});

broker.start().then(() => {
  // Switch to REPL mode
});
