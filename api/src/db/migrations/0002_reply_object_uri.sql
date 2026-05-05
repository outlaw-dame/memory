ALTER TABLE posts ADD COLUMN IF NOT EXISTS object_uri TEXT;

CREATE OR REPLACE VIEW posts_view AS
  SELECT
    posts.*,
    users.name as author_name,
    users.web_id as author_web_id,
    users.provider_endpoint as author_provider_endpoint
  FROM posts
  INNER JOIN users on posts.author_id = users.id
  WHERE posts.is_public = true;

CREATE OR REPLACE VIEW unified_feed_view AS
  SELECT
    posts.id,
    posts.content,
    posts.created_at,
    posts.is_public,
    posts.author_id,
    users.name as author_name,
    users.web_id as author_web_id,
    users.provider_endpoint as author_provider_endpoint,
    'activitypods'::varchar as source,
    NULL::varchar as at_uri,
    posts.object_uri
  FROM posts
  INNER JOIN users ON posts.author_id = users.id
  WHERE posts.is_public = true

  UNION ALL

  SELECT
    at_posts.id,
    at_posts.content,
    at_posts.created_at,
    at_posts.is_public,
    NULL::integer as author_id,
    COALESCE(at_identities.handle, at_posts.author_did) as author_name,
    at_posts.author_did as author_web_id,
    ''::text as author_provider_endpoint,
    'atproto'::varchar as source,
    at_posts.at_uri,
    NULL::text as object_uri
  FROM at_posts
  LEFT JOIN at_identities ON at_posts.author_did = at_identities.did
  WHERE at_posts.is_public = true;
