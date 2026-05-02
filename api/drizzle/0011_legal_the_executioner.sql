CREATE TABLE "ap_actor_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_uri" varchar(2048) NOT NULL,
	"preferred_username" varchar(512),
	"display_name" varchar(640),
	"avatar_url" varchar(3072),
	"banner_url" varchar(3072),
	"summary" text,
	"domain" varchar(253),
	"cached_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ap_actor_cache_actor_uri_unique" UNIQUE("actor_uri")
);
--> statement-breakpoint
DROP VIEW "public"."unified_feed_view";--> statement-breakpoint
ALTER TABLE "at_identities" ADD COLUMN "display_name" varchar(640);--> statement-breakpoint
ALTER TABLE "at_identities" ADD COLUMN "avatar_url" varchar(3072);--> statement-breakpoint
ALTER TABLE "at_identities" ADD COLUMN "banner_url" varchar(3072);--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "mentions" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "hashtags" text[] DEFAULT ARRAY[]::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "attachments" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "in_reply_to_message_id" varchar(36);--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "quote_message_id" varchar(36);--> statement-breakpoint
CREATE INDEX "chat_messages_in_reply_to_idx" ON "chat_messages" USING btree ("convo_id","in_reply_to_message_id");--> statement-breakpoint
CREATE INDEX "chat_messages_quote_idx" ON "chat_messages" USING btree ("convo_id","quote_message_id");--> statement-breakpoint
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
    NULL::varchar as author_avatar,
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
    at_identities.avatar_url as author_avatar,
    'atproto' as source,
    at_posts.at_uri,
    NULL::text as object_uri,
    at_posts.reply_parent_uri,
    at_posts.reply_root_uri
  FROM at_posts
  LEFT JOIN at_identities ON at_posts.author_did = at_identities.did
  WHERE at_posts.is_public = true

  UNION ALL

  SELECT
    ap_remote_posts.id,
    ap_remote_posts.content,
    COALESCE(ap_remote_posts.hashtags, ARRAY[]::text[]) as hashtags,
    ap_remote_posts.post_type,
    ap_remote_posts.title,
    ap_remote_posts.summary,
    COALESCE(ap_remote_posts.canonical_url, ap_remote_posts.object_uri) as canonical_url,
    ap_remote_posts.created_at,
    ap_remote_posts.is_public,
    NULL::integer as author_id,
    ap_remote_posts.author_name as author_name,
    ap_remote_posts.author_web_id as author_web_id,
    COALESCE(ap_remote_posts.author_domain, '') as author_provider_endpoint,
    ap_actor_cache.avatar_url as author_avatar,
    'activitypods' as source,
    NULL::varchar as at_uri,
    ap_remote_posts.object_uri,
    ap_remote_posts.reply_parent_uri,
    ap_remote_posts.reply_root_uri
  FROM ap_remote_posts
  LEFT JOIN ap_actor_cache ON ap_remote_posts.author_web_id = ap_actor_cache.actor_uri
  WHERE ap_remote_posts.is_public = true
);