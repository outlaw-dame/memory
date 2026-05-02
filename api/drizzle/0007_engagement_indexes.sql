-- Engagement metric indexes — speeds up like_counts and quote_counts CTEs
-- used by queryFeedCandidates in the unified feed pipeline.
--
-- like_counts CTE filters: is_active=true AND collection='app.bsky.feed.like'
-- then extracts record #>> '{subject,uri}'.  A partial index over the active
-- like rows lets Postgres satisfy both the filter and the expression scan in a
-- single index-only step, keeping aggregation O(log n) as likes grow.
--
-- quote_counts CTE similarly filters is_active=true on at_posts.  An index on
-- the four embed paths used for quote detection avoids full-table expression
-- evaluations.
--
-- ap_remote_posts — partial index on quoted_post_uri (added in migration 0008)
-- for the AP arm of the quote_counts UNION.

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_at_records_likes_subject_uri"
  ON "at_records" (((record #>> '{subject,uri}')))
  WHERE is_active = true AND collection = 'app.bsky.feed.like';--> statement-breakpoint

-- Composite index supports the at_posts arm of quote_counts:
-- WHERE is_public=true AND embed paths are not null.
-- Covers the most common embed shape first (record.uri) for partial selectivity.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_at_posts_quote_embed_record_uri"
  ON "at_posts" (((embeds #>> '{record,uri}')))
  WHERE is_public = true AND (embeds #>> '{record,uri}') IS NOT NULL;--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_at_posts_quote_embed_record_record_uri"
  ON "at_posts" (((embeds #>> '{record,record,uri}')))
  WHERE is_public = true AND (embeds #>> '{record,record,uri}') IS NOT NULL;--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_at_posts_quote_embed_embed_record_uri"
  ON "at_posts" (((embeds #>> '{embed,record,uri}')))
  WHERE is_public = true AND (embeds #>> '{embed,record,uri}') IS NOT NULL;--> statement-breakpoint

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_at_posts_quote_embed_embed_record_record_uri"
  ON "at_posts" (((embeds #>> '{embed,record,record,uri}')))
  WHERE is_public = true AND (embeds #>> '{embed,record,record,uri}') IS NOT NULL;
