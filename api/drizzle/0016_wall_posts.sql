ALTER TABLE "posts" ADD COLUMN "wall_target_user_id" integer REFERENCES "users"("id");
CREATE INDEX "posts_wall_target_user_id_idx" ON "posts" ("wall_target_user_id");
