-- AP Remote Posts — add quoted_post_uri for AP-native quote detection.
--
-- ActivityPub quote posts are signalled via several vendor-specific fields:
--   - quoteUrl      (Misskey / Calckey compat)
--   - _misskey_quote (legacy Misskey)
--   - quoteUri      (some implementations)
--   - quote         (FEP-e232 draft standard)
--
-- We extract whichever is present at ingestion time and store the canonical
-- URI here so the quote_counts CTE can join without any runtime JSON parsing.

ALTER TABLE "ap_remote_posts"
  ADD COLUMN IF NOT EXISTS "quoted_post_uri" varchar(3072);--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_ap_remote_posts_quoted_post_uri"
  ON "ap_remote_posts" ("quoted_post_uri")
  WHERE "quoted_post_uri" IS NOT NULL;
