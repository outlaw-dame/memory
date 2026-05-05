-- Migration 0009: Index for AP remote reply root reconciliation
-- Used by the periodic reconciliation sweep to efficiently find posts
-- whose reply_root_uri has not yet been resolved.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_ap_remote_posts_reply_parent_uri"
  ON "ap_remote_posts" ("reply_parent_uri")
  WHERE "reply_parent_uri" IS NOT NULL;
