// TODO:
//  - Set up proper authentication and authorization for getPublicPosts()

import CONFIG from 'config/config';
import Client from '@opensearch-project/opensearch';
import { convertHashtags } from '../frontend/src/utils';


// Return an account object formatted as per the Mastodon API,
// given an account URI as input
export const getAccount = (accountUri) => {
    return {

    }
};

// Return whether or not the given content is to be marked as "sensitive".
// Consider taking (additional) input in the form of a user-checked box so that
//  users may mark their own content as sensitive.
export const isSensitive = (content) => {

};

// Identify and handle mentions of other users in content
export const getMentions = (content) => {
    
};

// Get emojis from content
export const getEmojis = (content) => {

};

// Get status from activity URI
export const getStatusUrlFromUri = (activityUri) => {

};

// Get post from OpenSearch (directly connect to opensearch, no redpanda)
//  This should be able to be run from either the frontend or backend.
//  This has been put here so as to serve as a reference for querying the OpenSearch index/database
// Parameters:
//  initTime: string
//      Time of newest post to request, in milliseconds since January 1st, 1970
//  tag: string
//      Tag to be fetched
//
// Further info on how things are structured: https://opensearch.org/docs/latest/search-plugins/searching-data/paginate/#the-search_after-parameter
//
export async function getPublicPosts(initTime, tag) {

    // Create a client to connect to OpenSearch
    const client = new Client({
        node: CONFIG.OPENSEARCH_HTTP_API_BASE_URL,
        /*
        // for use with the security plugin
        ssl: {
          ca: fs.readFileSync(ca_certs_path),
        },*/
    });


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
                    terms: convertHashtags( [ tag ] ),
                    minimum_should_match_script: {
                        source: "1"
                    }
                }
            }
        },
        search_after: [ initTime ],
        sort: [
            {
                updateTime: "desc",
            }
        ]
    };

    return await client.search({
        index: CONFIG.OPENSEARCH_PUBLIC_INDEX,
        body: query
    });
};

// Used to simplify formatResponseForFrontend function
const sourceToPost = (source) => {
    return source._source;
};

// Format the response from getPublicPosts to be in the form of an array of posts and the time of next post
export const formatResponseForFrontend = (rsp) => {
    const response = JSON.parse(JSON.stringify(rsp));

    // Put together a list of only posts
    const posts = response.hits.hits.map(sourceToPost);
    // Get the next time for use getting the next set of results
    const nextTime = response.hits.hits[response.hits.hits.length - 1]["sort"][0];

    return [posts, nextTime];
};
