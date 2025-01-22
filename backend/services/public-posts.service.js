// TODO:
//  - [ ] set up a queue to handle incoming public posts when called here
//  - [ ] set up a thing to constantly check if queue is non-empty
//  - [ ] set up a thing to update RedPanda database w/ new public posts

const path = require('path');
//const { PodActivitiesWatcher } = require('@activitypods/app');
const { PodResourcesHandlerMixin } = require('@activitypods/app');
const { apods, notify, interop, oidc } = require('@semapps/ontologies');
const CONFIG = require('../config/config');
const { Kafka } = require('kafkajs');

const redpanda = new Kafka({
  brokers: [`${CONFIG.REDPANDA_BROKERS}`.split(",")],
});
const producer = redpanda.producer();

module.exports = {
  name: 'activities',
  mixins: [PodResourcesHandlerMixin],
  settings: {
    type: 'as:Activity'
  },
  methods: {
    async onCreate(ctx, resource, actorUri) {
      try {
        // Connect to Redpanda as a producer
        await producer.connect();

        // Upload activity to Redpanda if it's public
        //if (resource.to?.findIndex("https://www.w3.org/ns/activitystreams#Public") !== -1) {
        await producer.send({
          topic: `${CONFIG.REDPANDA_PUBLIC_TOPIC}`,
          data: [{ 
            value: JSON.stringify(
              {
                activityUri: resource.id || resource['@id'],
                actorUri: actorUri,
                tag: resource.tag,
                updated: Date.now(),
                parentCtx: ctx
              }
            )
          }]
        });
        //}

        // Disconnect from Redpanda
        await producer.disconnect();
      } 
      catch (error) {
        console.error("Error creating activity in `public-posts.service`: ", error);
      }      
    },
    async onUpdate(ctx, resource, actorUri) {
      // Handle post-update actions
    },
    async onDelete(ctx, resource, actorUri) {
      // Handle post-delete actions
    }
  }
};
