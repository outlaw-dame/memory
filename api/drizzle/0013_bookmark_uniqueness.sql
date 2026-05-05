-- Bookmark uniqueness hardening.
--
-- Memory treats bookmarks as private, per-user app state. A user should have
-- at most one bookmark row for a given AT URI or ActivityPub object URI.
-- Clean up any historical duplicates before adding partial unique indexes.

DELETE FROM "bookmarks" duplicate
USING "bookmarks" keep
WHERE duplicate."id" > keep."id"
  AND duplicate."user_id" = keep."user_id"
  AND duplicate."at_uri" IS NOT NULL
  AND duplicate."at_uri" = keep."at_uri";--> statement-breakpoint

DELETE FROM "bookmarks" duplicate
USING "bookmarks" keep
WHERE duplicate."id" > keep."id"
  AND duplicate."user_id" = keep."user_id"
  AND duplicate."object_uri" IS NOT NULL
  AND duplicate."object_uri" = keep."object_uri";--> statement-breakpoint

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "bookmarks_user_at_uri_unique_idx"
  ON "bookmarks" ("user_id", "at_uri")
  WHERE "at_uri" IS NOT NULL;--> statement-breakpoint

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "bookmarks_user_object_uri_unique_idx"
  ON "bookmarks" ("user_id", "object_uri")
  WHERE "object_uri" IS NOT NULL;
