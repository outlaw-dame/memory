import { Link } from "react-admin";

export const formatUsername = (uri) => {
  const url = new URL(uri);
  const username = url.pathname.split("/").slice(-1);
  return `@${username}@${url.host}`;
};

export const arrayOf = (value) => {
  // If the field is null-ish, we suppose there are no values.
  if (value === null || value === undefined) {
    return [];
  }
  // Return as is.
  if (Array.isArray(value)) {
    return value;
  }
  // Single value is made an array.
  return [value];
};

const hashtagRegex = /\B#[a-zA-Z0-9_]+\b/g;

// Extract hashtags from input text
export const extractHashtags = (text) => {
  return [...new Set((text?.match(hashtagRegex) || []).map(tag => tag?.toLowerCase()))];
};

// Convert hashtags to ActivityStreams Tag objects
export const convertHashtags = (hashtags) => {
  return hashtags.map(tag => ({
    type: "Hashtag",
    name: tag.substring(1),
  }));
};

// Replace hashtags in content with link to tag
export const replaceHashtags = (content) => {
  return content?.replaceAll(hashtagRegex, (hashtag) => {
    return `<a href="/tags/${hashtag.substring(1)}" class="hashtag-link">${hashtag}</a>`;
  }, [content]);
};
