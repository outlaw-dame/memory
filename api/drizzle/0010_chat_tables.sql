CREATE TABLE "ap_remote_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"object_uri" varchar(3072) NOT NULL,
	"author_web_id" varchar(2048) NOT NULL,
	"author_name" varchar(512) NOT NULL,
	"author_domain" varchar(253),
	"content" text NOT NULL,
	"post_type" varchar(16) DEFAULT 'note' NOT NULL,
	"title" text,
	"summary" text,
	"canonical_url" varchar(3072),
	"is_public" boolean DEFAULT true NOT NULL,
	"reply_parent_uri" varchar(3072),
	"reply_root_uri" varchar(3072),
	"hashtags" text[] DEFAULT ARRAY[]::text[],
	"created_at" timestamp with time zone NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now(),
	"source_relay" varchar(512),
	"quoted_post_uri" varchar(3072),
	CONSTRAINT "ap_remote_posts_object_uri_unique" UNIQUE("object_uri")
);
--> statement-breakpoint
CREATE TABLE "thread_edges" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_source" varchar(32) NOT NULL,
	"item_local_post_id" integer,
	"item_at_post_id" integer,
	"item_uri" varchar(3072) NOT NULL,
	"reply_author_id" varchar(2048) NOT NULL,
	"parent_uri" varchar(3072),
	"parent_author_id" varchar(2048),
	"root_uri" varchar(3072),
	"root_author_id" varchar(2048),
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "thread_edges_item_uri_unique" UNIQUE("item_uri")
);
--> statement-breakpoint
CREATE TABLE "thread_participants" (
	"root_uri" varchar(3072) NOT NULL,
	"participant_actor_id" varchar(2048) NOT NULL,
	"reply_count" integer DEFAULT 0 NOT NULL,
	"first_reply_at" timestamp with time zone,
	"last_reply_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "thread_stats" (
	"root_uri" varchar(3072) PRIMARY KEY NOT NULL,
	"reply_count" integer DEFAULT 0 NOT NULL,
	"participant_count" integer DEFAULT 0 NOT NULL,
	"last_activity_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_convos" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"convo_type" varchar(16) DEFAULT 'direct' NOT NULL,
	"name" varchar(512),
	"rev" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_members" (
	"convo_id" varchar(40) NOT NULL,
	"user_did" varchar(2048) NOT NULL,
	"role" varchar(16) DEFAULT 'member' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_read_rev" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "chat_members_convo_id_user_did_pk" PRIMARY KEY("convo_id","user_did")
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"convo_id" varchar(40) NOT NULL,
	"sender_did" varchar(2048) NOT NULL,
	"text" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"rev" integer DEFAULT 0 NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
DROP VIEW "public"."unified_feed_view";--> statement-breakpoint
ALTER TABLE "at_posts" ADD COLUMN "hashtags" text[] DEFAULT ARRAY[]::text[];--> statement-breakpoint
CREATE INDEX "chat_members_did_idx" ON "chat_members" USING btree ("user_did");--> statement-breakpoint
CREATE INDEX "chat_messages_convo_sent_idx" ON "chat_messages" USING btree ("convo_id","sent_at");--> statement-breakpoint
CREATE INDEX "chat_messages_convo_id_idx" ON "chat_messages" USING btree ("convo_id","id");--> statement-breakpoint
CREATE VIEW "public"."unified_feed_candidates_view" AS (
  SELECT
    ufv.*,
    COALESCE(ufv.at_uri, ufv.object_uri) AS candidate_uri,
    te.parent_author_id AS thread_parent_author_id,
    te.root_author_id AS thread_root_author_id,
    ts.reply_count AS thread_reply_count,
    ts.participant_count AS thread_participant_count,
    ts.last_activity_at AS thread_last_activity_at
  FROM unified_feed_view ufv
  LEFT JOIN thread_edges te ON te.item_uri = COALESCE(ufv.at_uri, ufv.object_uri)
  LEFT JOIN thread_stats ts ON ts.root_uri = COALESCE(te.root_uri, COALESCE(ufv.at_uri, ufv.object_uri))
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
    'activitypods' as source,
    NULL::varchar as at_uri,
    ap_remote_posts.object_uri,
    ap_remote_posts.reply_parent_uri,
    ap_remote_posts.reply_root_uri
  FROM ap_remote_posts
  WHERE ap_remote_posts.is_public = true
);