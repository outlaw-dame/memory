ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS summary TEXT;

ALTER TABLE at_posts
  ADD COLUMN IF NOT EXISTS post_type VARCHAR(16) NOT NULL DEFAULT 'note',
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS canonical_url VARCHAR(3072);

DROP VIEW IF EXISTS posts_view;
CREATE VIEW posts_view AS
SELECT
  posts.*,
  users.name as author_name,
  users.web_id as author_web_id,
  users.provider_endpoint as author_provider_endpoint
FROM posts
INNER JOIN users on posts.author_id = users.id
WHERE posts.is_public = true;

DROP VIEW IF EXISTS unified_feed_view;
CREATE VIEW unified_feed_view AS
  SELECT
    posts.id,
    posts.content,
    posts.post_type,
    posts.name as title,
    posts.summary,
    posts.object_uri as canonical_url,
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
    at_posts.post_type,
    at_posts.title,
    at_posts.summary,
    at_posts.canonical_url,
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
