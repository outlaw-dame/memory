ALTER TABLE "media_attachments" ADD COLUMN IF NOT EXISTS "story_uri" text;
ALTER TABLE "media_attachments" ADD COLUMN IF NOT EXISTS "story_expires_at" timestamp with time zone;

CREATE INDEX IF NOT EXISTS "media_attachments_story_uri_idx"
  ON "media_attachments" ("story_uri");

CREATE INDEX IF NOT EXISTS "media_attachments_story_expires_at_idx"
  ON "media_attachments" ("story_expires_at");
