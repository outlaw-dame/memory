CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"is_public" boolean NOT NULL,
	"author_id" integer NOT NULL,
	"object_uri" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"web_id" text NOT NULL,
	"email" text NOT NULL,
	"provider_endpoint" text NOT NULL,
	CONSTRAINT "users_web_id_unique" UNIQUE("web_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "at_firehose_cursors" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_id" varchar(512) NOT NULL,
	"source_type" varchar(16) DEFAULT 'relay' NOT NULL,
	"committed_seq" integer,
	"hot_seq" integer,
	"is_connected" boolean DEFAULT false NOT NULL,
	"last_event_at" timestamp with time zone,
	"last_commit_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "at_firehose_cursors_source_id_unique" UNIQUE("source_id")
);
--> statement-breakpoint
CREATE TABLE "at_identities" (
	"id" serial PRIMARY KEY NOT NULL,
	"did" varchar(2048) NOT NULL,
	"handle" varchar(512),
	"did_document" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"resolved_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"local_user_id" integer,
	CONSTRAINT "at_identities_did_unique" UNIQUE("did")
);
--> statement-breakpoint
CREATE TABLE "at_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"author_did" varchar(2048) NOT NULL,
	"rkey" varchar(512) NOT NULL,
	"at_uri" varchar(3072) NOT NULL,
	"cid" varchar(512),
	"content" text NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"facets" jsonb,
	"embeds" jsonb,
	"reply_parent_uri" varchar(3072),
	"reply_root_uri" varchar(3072),
	"created_at" timestamp with time zone,
	"ingested_at" timestamp with time zone DEFAULT now(),
	"source_relay" varchar(512),
	"firehose_seq" integer,
	CONSTRAINT "at_posts_at_uri_unique" UNIQUE("at_uri")
);
--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "at_identities" ADD CONSTRAINT "at_identities_local_user_id_users_id_fk" FOREIGN KEY ("local_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE VIEW "public"."posts_view" AS (SELECT
    posts.*,
    users.name as author_name,
    users.web_id as author_web_id,
    users.provider_endpoint as author_provider_endpoint
  FROM posts
  INNER JOIN users on posts.author_id = users.id
  WHERE posts.is_public = true);--> statement-breakpoint
CREATE VIEW "public"."unified_feed_view" AS (
  SELECT
    posts.id,
    posts.content,
    posts.created_at,
    posts.is_public,
    posts.author_id,
    users.name as author_name,
    users.web_id as author_web_id,
    users.provider_endpoint as author_provider_endpoint,
    'activitypods' as source,
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
    '' as author_provider_endpoint,
    'atproto' as source,
    at_posts.at_uri,
    NULL::text as object_uri
  FROM at_posts
  LEFT JOIN at_identities ON at_posts.author_did = at_identities.did
  WHERE at_posts.is_public = true
);