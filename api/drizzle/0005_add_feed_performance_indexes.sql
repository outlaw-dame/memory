-- Add missing indexes for unified feed query performance
-- These indexes optimize the joins and sorting in unifiedFeedCandidatesView

-- Index on thread_edges.item_uri for the LEFT JOIN in feed query
CREATE INDEX IF NOT EXISTS "thread_edges_item_uri_idx" ON "thread_edges" ("item_uri");
--> statement-breakpoint

-- Index on at_posts.created_at for efficient ORDER BY DESC
CREATE INDEX IF NOT EXISTS "at_posts_created_at_idx" ON "at_posts" ("created_at" DESC);
--> statement-breakpoint

-- Index on posts.created_at for unified feed view ordering
CREATE INDEX IF NOT EXISTS "posts_created_at_idx" ON "posts" ("created_at" DESC);
--> statement-breakpoint

-- Composite index for common feed filters
CREATE INDEX IF NOT EXISTS "at_posts_is_public_created_idx" ON "at_posts" ("is_public", "created_at" DESC);
--> statement-breakpoint

-- Index on posts for ActivityPods feed filtering
CREATE INDEX IF NOT EXISTS "posts_is_public_created_idx" ON "posts" ("is_public", "created_at" DESC);
--> statement-breakpoint

-- Index on at_records for follow lookups (app.bsky.graph.follow)
CREATE INDEX IF NOT EXISTS "at_records_collection_author_idx" ON "at_records" ("collection", "author_did");
--> statement-breakpoint

-- Index on thread_stats for efficient lookups during aggregation
CREATE INDEX IF NOT EXISTS "thread_stats_root_uri_idx" ON "thread_stats" ("root_uri");
--> statement-breakpoint

-- Index on at_identities for active identity lookups
CREATE INDEX IF NOT EXISTS "at_identities_is_active_idx" ON "at_identities" ("is_active");
