/* 
This service is intended for use creating/updating/deleting posts tagged as public
on a local elasticsearch instance.
 */

/*
TODO:
  - opensearch security plugin integration
  - authentication for each step of the process (e.g. authenticate user before updating post in database)
    as well as on create/update/delete of a post
*/

const path = require('path');
//const { PodActivitiesWatcher } = require('@activitypods/app');
const { PodResourcesHandlerMixin } = require('@activitypods/app');
const { apods, notify, interop, oidc } = require('@semapps/ontologies');
const { Client } = require('@opensearch-project/opensearch');
const { Kafka } = require('kafkajs');
const { OBJECT_TYPES } = require('@semapps/activitypub');
//const fs = require('fs')
const CONFIG = require('../config/config');
//const { getAccount, isSensitive, getSpoiler, getMentions, getEmojis, getStatusURLFromURI } = require('../utils');


// OpenSearch configuration
const opensearchAddress = "http://localhost:9200";
const indexName = "public-posts";

// RedPanda configuration
const rpClientId = 'Memory';
const kafkaBrokers = CONFIG.REDPANDA_BROKERS;
const rpPubTopic = CONFIG.REDPANDA_PUBLIC_TOPIC;


// Allow swapping between OpenSearch only or Redpanda + OpenSearch by having two versions of the service
const useRedPanda = true;
const publicPostsService = useRedPanda ?

  // using RedPanda
  {
    name: 'public-posts',
    mixins: [PodResourcesHandlerMixin],
    settings: {
      type: OBJECT_TYPES.NOTE
    },
    started() {
      this.kafka = new Kafka({
        clientId: rpClientId,
        brokers: kafkaBrokers
      });
      this.rpProducer = this.kafka.producer();
    },
    methods: {
      // Automatically create post in opensearch on activity creation
      async onCreate(ctx, resource, actorUri) {
        try {
          //const date = new Date();
          const activityUri = encodeURIComponent(resource.id || resource['@id']);

          console.log(resource);

          // Format the post for uploading
          const date = new Date();
          const post = {
            "@context": "https://www.w3.org/ns/activitystreams",
            type: "Note",
            id: activityUri,
            actor: encodeURIComponent(actorUri),
            content: resource.content,
            tag: resource.tag,
            published: date.toISOString(),
            updateTime: Date.now()
          };
            /*
            "inReplyTo": "actorUri of other actor",
            "replies": {
              "type": "Collection",
              "totalItems": 1,
              "items": [
                {
                  "type": "Note",
                  "content": "Example text",
                  "inReplyTo": "actorUri example"
                }
              ]
            },
            "contentMap": {
              "en": "English text",
              "es": "Espanol texto"
            },
            "mediaType": "text/markdown",
            "name": "A note",
          };*/


          // Initialize connection with RedPanda
          this.rpProducer.connect();

          console.log("Posting...");

          const response = await this.rpProducer.send({
            topic: rpPubTopic,
            data: [{
              value: JSON.stringify({
                post,
                action: "index"
              })
            }]
          });

          await this.rpProducer.disconnect();

          return response;
        }
        catch (error) {
          console.error("Error creating database reference to post in `public-posts.service`:\n\t", error);
          return error;
        }
      },

      // Automatically update post in opensearch on activity update
      async onUpdate(ctx, resource, actorUri) {
        try {
          // Handle post-update actions
          if ( encodeURIComponent(actorUri) === this.client.get(encodeURIComponent(resource.id || resource['@id'])).body.actorUri ) {   // check if same parent
            //const date = new Date();
            const activityUri = encodeURIComponent(resource.id || resource['@id']);

            console.log(resource);

            // Format the post for uploading
            const date = new Date();
            const post = {
              "@context": "https://www.w3.org/ns/activitystreams",
              type: "Note",
              id: activityUri,
              actor: encodeURIComponent(actorUri),
              content: resource.content,
              tag: resource.tag,
              published: date.toISOString(),
              updateTime: Date.now()
              /*
              "inReplyTo": "actorUri of other actor",
              "replies": {
                "type": "Collection",
                "totalItems": 1,
                "items": [
                  {
                    "type": "Note",
                    "content": "Example text",
                    "inReplyTo": "actorUri example"
                  }
                ]
              },
              "contentMap": {
                "en": "English text",
                "es": "Espanol texto"
              },
              "mediaType": "text/markdown",
              "name": "A note",
              */
            };


            // Initialize connection with RedPanda
            this.rpProducer.connect();

            console.log("Updating post...");

            const response = await this.rpProducer.send({
              topic: rpPubTopic,
              data: [{
                value: JSON.stringify({
                  post,
                  action: "update"
                })
              }]
            });


            await this.rpProducer.disconnect();

            return response;
          }
          else {
            return "Invalid actor.";
          }
        } 
        catch (error) {
          console.error("Error updating activity in `public-posts.service`:\n\t", error);
          return error;
        }
      },
      // Automatically delete post in opensearch on activity deletion
      async onDelete(ctx, resource, actorUri) {
        try {
          // Handle post-delete actions
          if ( encodeURIComponent(actorUri) === this.client.get(encodeURIComponent(resource.id || resource['@id'])).body.actorUri ) {   // check if same parent
            //const date = new Date();
            const activityUri = encodeURIComponent(resource.id || resource['@id']);

            console.log(resource);

            // Format the post for uploading
            const date = new Date();
            const post = {
              "@context": "https://www.w3.org/ns/activitystreams",
              type: "Note",
              id: activityUri,
              actor: encodeURIComponent(actorUri),
              content: resource.content,
              tag: resource.tag,
              published: date.toISOString(),
              updateTime: Date.now()
              /*
              "inReplyTo": "actorUri of other actor",
              "replies": {
                "type": "Collection",
                "totalItems": 1,
                "items": [
                  {
                    "type": "Note",
                    "content": "Example text",
                    "inReplyTo": "actorUri example"
                  }
                ]
              },
              "contentMap": {
                "en": "English text",
                "es": "Espanol texto"
              },
              "mediaType": "text/markdown",
              "name": "A note",
              */
            };


            // Initialize connection with RedPanda
            this.rpProducer.connect();

            console.log("Deleting post...");

            const response = await this.rpProducer.send({
              topic: rpPubTopic,
              data: [{
                value: JSON.stringify({
                  post,
                  action: "delete"
                })
              }]
            });


            await this.rpProducer.disconnect();

            return response;
          }
          else {
            return "Invalid actor.";
          }
        }
        catch (error) {
          console.error("Error deleting activity in `public-posts.service`:\n\t", error);
          return error;
        }
      }
    },/*
    actions: {
      // Fetch public timeline, optionally filtered by tag
      get: {
        params: [{
            initTime: { type: 'integer', optional: false },   // unix time of page load in ms since Jan 1 1970
            nextPage: { type: 'integer', optional: false },   // used to get next page; first page should be equal to initTime
            tag: { type: 'string', optional: true },
            isFedTimeline: { type: 'bool', optional: true },
        }],
        async handler(ctx) {
          const { initTime, nextPage, tag, isFedTimeline } = ctx.params;

          // Put together query based on tags and initial time of request
          const query = {
            size: 10,
            query: {
              // Only get posts older than the given time of the query
              range: {
                updateTime: {
                  lte: initTime,
                }
              },
              // When given a tag, search for all which include at least one instance of the given tag
              terms_set: {
                tag: {
                  terms: [ tag ],
                  minimum_should_match_script: {
                    source: "1"
                  }
                }
              }
            },
            search_after: [ nextPage ],
            sort: [
              {
                updateTime: "desc",
              }
            ]
          };

          // Handle federated timeline (not implemented yet)
          //if (isFedTimeline) {

          //}

          // Handle local timeline (default)
          //else {
          return await this.client.search({
            index: indexName,
            body: query
          });
        }
      },
      post: {

      },
      delete: {

      }
      patch,
      put,

    }*/
  }






  // Not using RedPanda
  : 
  {
    name: 'public-posts',
    mixins: [PodResourcesHandlerMixin],
    settings: {
      type: OBJECT_TYPES.NOTE
    },
    started() {

      this.client = new Client({
        node: opensearchAddress,
        /*
        // for use with the security plugin
        ssl: {
          ca: fs.readFileSync(ca_certs_path),
        },*/
      });
    },
    methods: {
      // Automatically create post in opensearch on activity creation
      async onCreate(ctx, resource, actorUri) {
        try {
          //const date = new Date();
          const activityUri = encodeURIComponent(resource.id || resource['@id']);

          // Check content for incoming params
          /*const {
            inReplyToId,
            inReplyToAccountId,
            reblog,
            poll,
            language,
            content,            // post-processed content (e.g. after hashtag extraction)

          }*/

          console.log("Posting to OpenSearch...");
          return await this.client.index({
            index: indexName,
            id: activityUri,
            body: {
              activityUri: activityUri,
              actorUri: encodeURIComponent(actorUri),
              content: resource.content,
              tag: resource.tag,
              updateTime: Date.now()
              /*id: Date.now(), // in the future, use Snowflake IDs
              uri: activityUri,
              created_at: date.toISOString(),
              account: getAccount(),
              content: resource.content,
              visibility: "public",       // IMPORTANT: remember to add check if post is public
              sensitive: isSensitive(resource.content),
              spoiler_text: getSpoiler(resource.content),
              media_attachments: [{}],
              mentions: getMentions(resource.content),
              tags: resource.tag,
              emojis: getEmojis(resource.content),
              reblogs_count: 0,           // initialize to 0
              favourites_count: 0,        // initialize to 0
              replies_count: 0,           // initialize to 0
              url: getStatusURLFromURI(activityUri),
              in_reply_to_id: */
            },
            refresh: true,
          });
        }
        catch (error) {
          console.error("Error creating activity in `public-posts.service`:\n\t", error);
          return error;
        }
      },
      // Automatically update post in opensearch on activity update
      async onUpdate(ctx, resource, actorUri) {
        try {
          // Handle post-update actions
          if ( encodeURIComponent(actorUri) === this.client.get(encodeURIComponent(resource.id || resource['@id'])).body.actorUri ) {   // check if same parent context
            return await this.client.update({
              index: indexName,
              id: encodeURIComponent(resource.id || resource['@id']),
              body: {
                doc: {
                  actorUri: encodeURIComponent(actorUri),
                  content: resource.content,
                  tag: resource.tag,
                  updateTime: Date.now()
                }
              }
            });
          }
          else {
            return "Invalid actor.";
          }
        } 
        catch (error) {
          console.error("Error updating activity in `public-posts.service`:\n\t", error);
          return error;
        }
      },
      // Automatically delete post in opensearch on activity deletion
      async onDelete(ctx, resource, actorUri) {
        try {
          // Handle post-delete actions
          if ( encodeURIComponent(actorUri) === this.client.get(encodeURIComponent(resource.id || resource['@id'])).body.actorUri ) {   // check if same parent context
            return await this.client.delete({
              index: indexName,
              id: encodeURIComponent(resource.id || resource['@id']),
            });
          }
          else {
            return "Invalid actor.";
          }
        }
        catch (error) {
          console.error("Error deleting activity in `public-posts.service`:\n\t", error);
          return error;
        }
      }
    },/*
    actions: {
      // Fetch public timeline, optionally filtered by tag
      get: {
        params: [{
            initTime: { type: 'integer', optional: false },   // unix time of page load in ms since Jan 1 1970
            nextPage: { type: 'integer', optional: false },   // used to get next page; first page should be equal to initTime
            tag: { type: 'string', optional: true },
            isFedTimeline: { type: 'bool', optional: true },
        }],
        async handler(ctx) {
          const { initTime, nextPage, tag, isFedTimeline } = ctx.params;

          // Put together query based on tags and initial time of request
          const query = {
            size: 10,
            query: {
              // Only get posts older than the given time of the query
              range: {
                updateTime: {
                  lte: initTime,
                }
              },
              // When given a tag, search for all which include at least one instance of the given tag
              terms_set: {
                tag: {
                  terms: [ tag ],
                  minimum_should_match_script: {
                    source: "1"
                  }
                }
              }
            },
            search_after: [ nextPage ],
            sort: [
              {
                updateTime: "desc",
              }
            ]
          };

          // Handle federated timeline (not implemented yet)
          //if (isFedTimeline) {

          //}

          // Handle local timeline (default)
          //else {
          return await this.client.search({
            index: indexName,
            body: query
          });
        }
      },
      post: {

      },
      delete: {

      }
      patch,
      put,

    }*/
  };

// Export the service
module.exports = publicPostsService;
