-- V6.5 ATProto Identity Linking — add ATProto DID and handle to the users table.
--
-- These columns are populated asynchronously at sign-in time by resolving the
-- user's WebID profile and reading the schema:sameAs / alsoKnownAs link that
-- the mastopod federation sidecar writes when an ATProto account is paired.
-- Both columns are nullable: accounts that have not yet been paired will have
-- NULL until the next sign-in after pairing completes.

ALTER TABLE "users" ADD COLUMN "atproto_did" varchar(2048);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "atproto_handle" varchar(512);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_atproto_did" ON "users" ("atproto_did");
