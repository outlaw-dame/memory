-- Durable media attachment lifecycle for pod-first uploads.
-- Source binaries remain in the user's ActivityPods pod; this table stores
-- Memory-local upload state, ActivityPub attachment metadata, and processed
-- media references when they become available.

CREATE EXTENSION IF NOT EXISTS pgcrypto;--> statement-breakpoint

ALTER TABLE "posts"
  ADD COLUMN IF NOT EXISTS "client_post_key" varchar(128),
  ADD COLUMN IF NOT EXISTS "client_post_request_hash" varchar(64);--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "posts_author_client_key_unique_idx"
  ON "posts" ("author_id", "client_post_key")
  WHERE "client_post_key" IS NOT NULL;--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "media_attachments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" integer NOT NULL,
  "post_id" integer,
  "state" text DEFAULT 'uploading' NOT NULL,
  "kind" text NOT NULL,
  "source_url" text,
  "source_media_type" varchar(120) NOT NULL,
  "source_size" integer NOT NULL,
  "original_filename" text,
  "alt_text" text,
  "focus_x" integer,
  "focus_y" integer,
  "blurhash" varchar(128),
  "width" integer,
  "height" integer,
  "duration_ms" integer,
  "preview_url" text,
  "thumbnail_url" text,
  "canonical_url" text,
  "gateway_url" text,
  "filebase_cid" varchar(256),
  "digest_multibase" varchar(256),
  "error_code" varchar(64),
  "error_message" text,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "media_attachments_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "media_attachments_post_id_posts_id_fk"
    FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action,
  CONSTRAINT "media_attachments_state_check"
    CHECK ("state" IN ('uploading', 'uploaded', 'processing', 'ready', 'failed', 'expired', 'deleted')),
  CONSTRAINT "media_attachments_kind_check"
    CHECK ("kind" IN ('image', 'gif', 'video', 'audio', 'unknown')),
  CONSTRAINT "media_attachments_size_check"
    CHECK ("source_size" > 0),
  CONSTRAINT "media_attachments_focus_x_check"
    CHECK ("focus_x" IS NULL OR ("focus_x" >= -1000000 AND "focus_x" <= 1000000)),
  CONSTRAINT "media_attachments_focus_y_check"
    CHECK ("focus_y" IS NULL OR ("focus_y" >= -1000000 AND "focus_y" <= 1000000))
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "media_attachments_user_state_idx"
  ON "media_attachments" ("user_id", "state");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "media_attachments_user_post_idx"
  ON "media_attachments" ("user_id", "post_id");--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "media_attachments_expires_at_idx"
  ON "media_attachments" ("expires_at");