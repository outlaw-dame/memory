-- AP Remote Posts — relay-delivered ActivityPub content from fedify-sidecar.
CREATE TABLE IF NOT EXISTS "ap_remote_posts" (
  "id" serial PRIMARY KEY,
  "object_uri" varchar(3072) NOT NULL UNIQUE,
  "author_web_id" varchar(2048) NOT NULL,
  "author_name" varchar(512) NOT NULL,
  "author_domain" varchar(253),
  "content" text NOT NULL,
  "post_type" varchar(16) NOT NULL DEFAULT 'note',
  "title" text,
  "summary" text,
  "canonical_url" varchar(3072),
  "is_public" boolean NOT NULL DEFAULT true,
  "reply_parent_uri" varchar(3072),
  "reply_root_uri" varchar(3072),
  "hashtags" text[] DEFAULT ARRAY[]::text[],
  "created_at" timestamptz NOT NULL,
  "ingested_at" timestamptz DEFAULT now(),
  "source_relay" varchar(512)
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ap_remote_posts_created_at" ON "ap_remote_posts" ("created_at" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ap_remote_posts_author_web_id" ON "ap_remote_posts" ("author_web_id");
