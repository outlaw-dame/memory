-- Chat Pod/PDS commit projection hardening.
--
-- chat_messages is a local projection, not the authoritative message store.
-- Store the canonical Pod/PDS object URI returned by the commit path so local
-- retries and webhook redeliveries are idempotent.

ALTER TABLE "chat_messages"
  ADD COLUMN IF NOT EXISTS "object_uri" text;--> statement-breakpoint

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "chat_messages_object_uri_unique_idx"
  ON "chat_messages" ("object_uri")
  WHERE "object_uri" IS NOT NULL;
