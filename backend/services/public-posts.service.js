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
const { OBJECT_TYPES } = require('@semapps/activitypub');
//const fs = require('fs')
const CONFIG = require('../config/config');

const opensearchAddress = "http://localhost:9200";
const indexName = "public-posts"


module.exports = {
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
        console.log("Posting to OpenSearch...")
        return await this.client.index({
          index: indexName,
          id: encodeURIComponent(resource.id || resource['@id']),
          body: {  
            activityUri: encodeURIComponent(resource.id || resource['@id']),
            actorUri: encodeURIComponent(actorUri),
            content: resource.content,
            tag: resource.tag,
            updateTime: Date.now().toString()
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
          return "Invalid actor."
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
          return "Invalid actor."
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
