ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "reply_parent_uri" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "reply_root_uri" text;--> statement-breakpoint
DROP VIEW IF EXISTS "public"."unified_feed_view";--> statement-breakpoint
DROP VIEW IF EXISTS "public"."posts_view";--> statement-breakpoint
CREATE VIEW "public"."posts_view" AS (
  SELECT
    posts.*,
    users.name as author_name,
    users.web_id as author_web_id,
    users.provider_endpoint as author_provider_endpoint
  FROM posts
  INNER JOIN users ON posts.author_id = users.id
  WHERE posts.is_public = true
);--> statement-breakpoint
CREATE VIEW "public"."unified_feed_view" AS (
  SELECT
    posts.id,
    posts.content,
    posts.hashtags,
    posts.post_type,
    posts.name as title,
    posts.summary,
    COALESCE(posts.canonical_url, posts.object_uri) as canonical_url,
    posts.created_at,
    posts.is_public,
    posts.author_id,
    users.name as author_name,
    users.web_id as author_web_id,
    users.provider_endpoint as author_provider_endpoint,
    'activitypods' as source,
    NULL::varchar as at_uri,
    posts.object_uri,
    posts.reply_parent_uri,
    posts.reply_root_uri
  FROM posts
  INNER JOIN users ON posts.author_id = users.id
  WHERE posts.is_public = true

  UNION ALL

  SELECT
    at_posts.id,
    at_posts.content,
    COALESCE(
      ARRAY(
        SELECT DISTINCT '#' || lower(trim(feature->>'tag'))
        FROM jsonb_array_elements(COALESCE(at_posts.facets, '[]'::jsonb)) facet,
             jsonb_array_elements(COALESCE(facet->'features', '[]'::jsonb)) feature
        WHERE feature ? 'tag' AND length(trim(feature->>'tag')) > 0
      ),
      ARRAY[]::text[]
    ) as hashtags,
    at_posts.post_type,
    at_posts.title,
    at_posts.summary,
    at_posts.canonical_url,
    at_posts.created_at,
    at_posts.is_public,
    NULL::integer as author_id,
    COALESCE(at_identities.handle, at_posts.author_did) as author_name,
    at_posts.author_did as author_web_id,
    '' as author_provider_endpoint,
    'atproto' as source,
    at_posts.at_uri,
    NULL::text as object_uri,
    at_posts.reply_parent_uri,
    at_posts.reply_root_uri
  FROM at_posts
  LEFT JOIN at_identities ON at_posts.author_did = at_identities.did
  WHERE at_posts.is_public = true
);