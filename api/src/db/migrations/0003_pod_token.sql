-- Add pod_token column to users table.
-- Stores the ActivityPods-native RS256 JWT (from /auth/login) which is the
-- only token accepted by the pod's ActivityPub outbox for write operations.
-- This is separate from the OIDC access_token which the pod rejects for writes.
ALTER TABLE users ADD COLUMN IF NOT EXISTS pod_token TEXT;
