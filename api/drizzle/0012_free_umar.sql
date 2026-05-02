CREATE TABLE "bookmarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"at_uri" varchar(3072),
	"object_uri" text,
	"source" varchar(32) NOT NULL,
	"bookmarked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "viewer_relationship_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"viewer_user_id" integer NOT NULL,
	"subject_uri" varchar(2048) NOT NULL,
	"subject_protocol" varchar(16) DEFAULT 'activitypods' NOT NULL,
	"is_following" boolean DEFAULT false NOT NULL,
	"is_followed_by" boolean DEFAULT false NOT NULL,
	"is_muted" boolean DEFAULT false NOT NULL,
	"is_blocked" boolean DEFAULT false NOT NULL,
	"is_blocked_by" boolean DEFAULT false NOT NULL,
	"refreshed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "is_read" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "read_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "ap_actor_cache" ADD COLUMN "followers_count" integer;--> statement-breakpoint
ALTER TABLE "ap_actor_cache" ADD COLUMN "following_count" integer;--> statement-breakpoint
ALTER TABLE "ap_actor_cache" ADD COLUMN "posts_count" integer;--> statement-breakpoint
ALTER TABLE "at_identities" ADD COLUMN "followers_count" integer;--> statement-breakpoint
ALTER TABLE "at_identities" ADD COLUMN "follows_count" integer;--> statement-breakpoint
ALTER TABLE "at_identities" ADD COLUMN "posts_count" integer;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "viewer_relationship_cache" ADD CONSTRAINT "viewer_relationship_cache_viewer_user_id_users_id_fk" FOREIGN KEY ("viewer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookmarks_user_at_uri_idx" ON "bookmarks" USING btree ("user_id","at_uri");--> statement-breakpoint
CREATE INDEX "bookmarks_user_object_uri_idx" ON "bookmarks" USING btree ("user_id","object_uri");--> statement-breakpoint
CREATE INDEX "viewer_rel_cache_viewer_subject_idx" ON "viewer_relationship_cache" USING btree ("viewer_user_id","subject_uri");