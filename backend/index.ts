import WebAcl from '@semapps/webacl';
import CONFIG from './config/config.js';
import { ServiceBroker } from 'moleculer';
import ApiGateway from './moleculer-web-uws/index.js';
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
    WebAcl.WebAclMiddleware({ baseUrl: CONFIG.HOME_URL }), // Set the cacher before the WebAcl middleware
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
/* broker.loadServices('./services'); */

// Load only the backend services for development
broker.loadService('./services/memory-api.service.ts');

// @ts-ignore
broker.createService(ApiGateway);

broker.start();
broker.repl();
