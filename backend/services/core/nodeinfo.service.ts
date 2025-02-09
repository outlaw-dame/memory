import urlJoin from 'url-join';
import { NodeinfoService } from '@semapps/nodeinfo';
import CONFIG from '../../config/config';
import packageJson from '../../package.json';

export default {
  mixins: [NodeinfoService],
  settings: {
    baseUrl: CONFIG.HOME_URL,
    software: {
      name: 'activitypods',
      version: packageJson.version,
      repository: packageJson.repository?.url,
      homepage: packageJson.homepage
    },
    protocols: ['activitypub'],
    metadata: {
      frontend_url: CONFIG.FRONT_URL,
      login_url: CONFIG.FRONT_URL && urlJoin(CONFIG.FRONT_URL, 'login'),
      logout_url: CONFIG.FRONT_URL && urlJoin(CONFIG.FRONT_URL, 'login?logout=true'),
      resource_url: CONFIG.FRONT_URL && urlJoin(CONFIG.FRONT_URL, 'r')
    }
  },
  actions: {
    async getUsersCount(ctx) {
      const appRegistrations = await ctx.call('app-registrations.list');
      return {
        total: appRegistrations['ldp:contains']?.length || 0,
        activeHalfYear: appRegistrations['ldp:contains']?.length || 0,
        activeMonth: appRegistrations['ldp:contains']?.length || 0
      };
    }
  }
};
