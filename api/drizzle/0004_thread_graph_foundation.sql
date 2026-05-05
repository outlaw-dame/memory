CREATE TABLE IF NOT EXISTS "thread_edges" (
  "id" serial PRIMARY KEY,
  "item_source" varchar(32) NOT NULL,
  "item_local_post_id" integer,
  "item_at_post_id" integer,
  "item_uri" varchar(3072) NOT NULL,
  "reply_author_id" varchar(2048) NOT NULL,
  "parent_uri" varchar(3072),
  "parent_author_id" varchar(2048),
  "root_uri" varchar(3072),
  "root_author_id" varchar(2048),
  "created_at" timestamptz,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "thread_edges_item_uri_unique" UNIQUE("item_uri")
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "thread_participants" (
  "root_uri" varchar(3072) NOT NULL,
  "participant_actor_id" varchar(2048) NOT NULL,
  "reply_count" integer NOT NULL DEFAULT 0,
  "first_reply_at" timestamptz,
  "last_reply_at" timestamptz,
  CONSTRAINT "thread_participants_pk" PRIMARY KEY("root_uri", "participant_actor_id")
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "thread_stats" (
  "root_uri" varchar(3072) PRIMARY KEY,
  "reply_count" integer NOT NULL DEFAULT 0,
  "participant_count" integer NOT NULL DEFAULT 0,
  "last_activity_at" timestamptz,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "thread_edges_root_uri_idx" ON "thread_edges" ("root_uri");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "thread_edges_parent_uri_idx" ON "thread_edges" ("parent_uri");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "thread_edges_reply_author_idx" ON "thread_edges" ("reply_author_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "thread_edges_root_created_idx" ON "thread_edges" ("root_uri", "created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "thread_participants_last_reply_idx" ON "thread_participants" ("root_uri", "last_reply_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "thread_stats_last_activity_idx" ON "thread_stats" ("last_activity_at" DESC);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Backfill reply relationships from local ActivityPods posts
-- ---------------------------------------------------------------------------
INSERT INTO "thread_edges" (
  "item_source",
  "item_local_post_id",
  "item_uri",
  "reply_author_id",
  "parent_uri",
  "parent_author_id",
  "root_uri",
  "root_author_id",
  "created_at",
  "updated_at"
)
SELECT
  'activitypods' AS item_source,
  p.id AS item_local_post_id,
  p.object_uri AS item_uri,
  u.web_id AS reply_author_id,
  p.reply_parent_uri AS parent_uri,
  COALESCE(parent_user.web_id, parent_post_user.web_id) AS parent_author_id,
  p.reply_root_uri AS root_uri,
  COALESCE(root_user.web_id, root_post_user.web_id) AS root_author_id,
  p.created_at AS created_at,
  now() AS updated_at
FROM posts p
INNER JOIN users u ON u.id = p.author_id
LEFT JOIN posts parent_post ON parent_post.object_uri = p.reply_parent_uri
LEFT JOIN users parent_post_user ON parent_post_user.id = parent_post.author_id
LEFT JOIN posts root_post ON root_post.object_uri = p.reply_root_uri
LEFT JOIN users root_post_user ON root_post_user.id = root_post.author_id
LEFT JOIN users parent_user ON parent_user.web_id = p.reply_parent_uri
LEFT JOIN users root_user ON root_user.web_id = p.reply_root_uri
WHERE p.object_uri IS NOT NULL
ON CONFLICT ("item_uri") DO UPDATE SET
  "item_source" = EXCLUDED."item_source",
  "item_local_post_id" = EXCLUDED."item_local_post_id",
  "reply_author_id" = EXCLUDED."reply_author_id",
  "parent_uri" = EXCLUDED."parent_uri",
  "parent_author_id" = EXCLUDED."parent_author_id",
  "root_uri" = EXCLUDED."root_uri",
  "root_author_id" = EXCLUDED."root_author_id",
  "created_at" = EXCLUDED."created_at",
  "updated_at" = now();
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Backfill reply relationships from ATProto posts
-- ---------------------------------------------------------------------------
INSERT INTO "thread_edges" (
  "item_source",
  "item_at_post_id",
  "item_uri",
  "reply_author_id",
  "parent_uri",
  "parent_author_id",
  "root_uri",
  "root_author_id",
  "created_at",
  "updated_at"
)
SELECT
  'atproto' AS item_source,
  ap.id AS item_at_post_id,
  ap.at_uri AS item_uri,
  ap.author_did AS reply_author_id,
  ap.reply_parent_uri AS parent_uri,
  parent_post.author_did AS parent_author_id,
  ap.reply_root_uri AS root_uri,
  root_post.author_did AS root_author_id,
  ap.created_at AS created_at,
  now() AS updated_at
FROM at_posts ap
LEFT JOIN at_posts parent_post ON parent_post.at_uri = ap.reply_parent_uri
LEFT JOIN at_posts root_post ON root_post.at_uri = ap.reply_root_uri
WHERE ap.at_uri IS NOT NULL
ON CONFLICT ("item_uri") DO UPDATE SET
  "item_source" = EXCLUDED."item_source",
  "item_at_post_id" = EXCLUDED."item_at_post_id",
  "reply_author_id" = EXCLUDED."reply_author_id",
  "parent_uri" = EXCLUDED."parent_uri",
  "parent_author_id" = EXCLUDED."parent_author_id",
  "root_uri" = EXCLUDED."root_uri",
  "root_author_id" = EXCLUDED."root_author_id",
  "created_at" = EXCLUDED."created_at",
  "updated_at" = now();
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Refresh derived aggregates
-- ---------------------------------------------------------------------------
DELETE FROM "thread_participants";
--> statement-breakpoint
INSERT INTO "thread_participants" (
  "root_uri",
  "participant_actor_id",
  "reply_count",
  "first_reply_at",
  "last_reply_at"
)
SELECT
  te.root_uri,
  te.reply_author_id,
  COUNT(*)::int AS reply_count,
  MIN(te.created_at) AS first_reply_at,
  MAX(te.created_at) AS last_reply_at
FROM thread_edges te
WHERE te.root_uri IS NOT NULL
GROUP BY te.root_uri, te.reply_author_id;
--> statement-breakpoint

DELETE FROM "thread_stats";
--> statement-breakpoint
INSERT INTO "thread_stats" (
  "root_uri",
  "reply_count",
  "participant_count",
  "last_activity_at",
  "updated_at"
)
SELECT
  te.root_uri,
  COUNT(*)::int AS reply_count,
  COUNT(DISTINCT te.reply_author_id)::int AS participant_count,
  MAX(te.created_at) AS last_activity_at,
  now() AS updated_at
FROM thread_edges te
WHERE te.root_uri IS NOT NULL
GROUP BY te.root_uri;
--> statement-breakpoint

DROP VIEW IF EXISTS "public"."unified_feed_candidates_view";
--> statement-breakpoint
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
);
