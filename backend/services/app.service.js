const urlJoin = require('url-join');
const { AppService } = require('@activitypods/app');
const CONFIG = require('../config/config');

// For documentation, see: https://docs.activitypods.org/app-framework/backend/application-registration/
module.exports = {
  mixins: [AppService],
  settings: {
    app: {
      name: CONFIG.APP_NAME,
      description: {
        en: 'A Mastodon-compatible app that saves all data in a Pod',
        fr: 'Une appli compatible avec Mastodon qui enregistre tout dans votre Pod'
      },
      thumbnail: urlJoin(CONFIG.FRONT_URL, 'logo192.png'),
      frontUrl: CONFIG.FRONT_URL,
      supportedLocales: ['en', 'fr']
    },
    oidc: {
      clientUri: CONFIG.FRONT_URL,
      redirectUris: urlJoin(CONFIG.FRONT_URL, 'auth-callback'),
      postLogoutRedirectUris: urlJoin(CONFIG.FRONT_URL, 'login?logout=true'),
      tosUri: null
    },
    accessNeeds: {
      required: [
        {
          registeredClass: 'as:Note',
          accessMode: ['acl:Read', 'acl:Write']
        },
        {
          registeredClass: 'vcard:Individual',
          accessMode: 'acl:Read'
        },
        'apods:ReadInbox',
        'apods:ReadOutbox',
        'apods:PostOutbox',
        'apods:QuerySparqlEndpoint'
      ],
      optional: []
    },
    classDescriptions: {
      'as:Note': {
        label: {
          en: 'Messages',
          fr: 'Messages'
        },
        openEndpoint: urlJoin(CONFIG.FRONT_URL, '/r')
      }
    },
    queueServiceUrl: CONFIG.QUEUE_SERVICE_URL
  }
  /*actions: {
    async fetchPostsByHashtag(ctx) {
      const { tag } = ctx.params;
      const query = `
        SELECT ?activity WHERE {
          ?activity as:tag <${CONFIG.HOME_URL}/tags/${tag}> ;
                    as:published ?published .
          FILTER NOT EXISTS {
            ?activity as:actor ?blockedActor .
            ?blockedActor <acl:denied> ?requestingUser .
          }
          FILTER NOT EXISTS {
            ?activity <app:blockedServer> ?blockedServer .
            ?blockedServer <acl:denied> ?requestingServer .
          }
        }
        ORDER BY DESC(?published)
      `;
      const results = await ctx.call("triplestore.query", { query });
      return results.map(row => row.activity);
    },
  },
  actions: {
    async fetchPostsByHashtag(ctx) {

      const tagUris = await Promise.all(
        hashtags.map(async (name) => {
          //const tagUri = `${triplestore.baseUrl}/tags/${name}`;
          const tagUri = `${process.env.SEMAPPS_HOME_URL}/tags/${name}`;
          await triplestore.insertOrUpdate(tagUri, {
            "@context": "http://www.w3.org/ns/activitystreams#tag",
            type: "Hashtag",
            name,
          });
          return tagUri;
        })
      );

      return tagUris;
    },
  },
  api: {
    routes: [
      {
        path: "/tag/:tag/posts",
        aliases: {
          "GET /": "core.fetchPostsByHashtag",
        },
      },
    ],
  },*/
};
