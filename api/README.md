# api

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.1.45. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.

## ActivityPods Notification Interop

The API exposes ActivityPods interoperability resources and notification webhook endpoints used by Memory app registration and inbox notification delivery.

### Relevant environment variables

- `API_URL`: public URL of the Memory API (used in app metadata and webhook callback URLs).
- `FRONTEND_URL`: public URL of the Memory frontend (used for authorization callback endpoint metadata).
- `JWT_SECRET`: used to sign local Memory JWTs and, by default, webhook callback signatures.
- `ACTIVITYPODS_WEBHOOK_SECRET` (optional, recommended): dedicated secret for webhook callback signatures.
- `ACTIVITYPODS_ENABLE_REGISTRATION_RESET_FALLBACK` (optional, default `false`): guarded self-healing fallback for persistent app-registration staleness.
- `EXPECTED_FRONTEND_SESSION_MAX_AGE_MS` (optional, default `28800000`): expected frontend trusted-session max age surfaced by notification status.
- `EXPECTED_FRONTEND_POD_REAUTH_DEFER_MS` (optional, default `14400000`): expected frontend reauth-defer window surfaced by notification status.
- `AT_BRIDGE_RETENTION_ENABLED` and related `AT_BRIDGE_RETENTION_*` variables: bounded cleanup for local AT bridge history. See `AT_BRIDGE_RETENTION.md`.

### Default-safe behavior

By default (`ACTIVITYPODS_ENABLE_REGISTRATION_RESET_FALLBACK=false`), Memory will:

- reconcile registration with `register-app` / `upgrade-app` when needed,
- clean stale or duplicate webhook channels,
- never remove an existing registration automatically.

### Optional registration reset fallback

When `ACTIVITYPODS_ENABLE_REGISTRATION_RESET_FALLBACK=true`, Memory may remove and re-register app grants, but only if all of these conditions are met:

1. provider status remains `upgradeNeeded` after normal reconciliation,
2. no valid inbox webhook is active,
3. fallback is explicitly enabled.

This guardrail minimizes user-impacting changes while still allowing recovery from stuck provider state.

### Production rollout recommendation

1. Start with fallback disabled.
2. Observe bootstrap responses (`registrationReconciled`, `cleanedChannels`, `usedRegistrationResetFallback`) in logs/telemetry.
3. Enable fallback only for environments where `upgradeNeeded` persists and blocks webhook activation.
4. Keep `ACTIVITYPODS_WEBHOOK_SECRET` distinct from `JWT_SECRET` in production.

### Frontend session policy defaults

Recommended baseline defaults for Memory frontend:

- `VITE_SESSION_MAX_AGE_MS=28800000` (8 hours): maximum trusted browser session age before requiring sign-in.
- `VITE_POD_REAUTH_DEFER_MS=14400000` (4 hours): maximum window to defer pod re-authorization prompts while webhook delivery remains healthy.

These values keep re-authentication bounded for security while reducing unnecessary prompt churn during temporary provider staleness.

The notifications status response also includes:

- `expectedFrontendPolicy.sessionMaxAgeMs`
- `expectedFrontendPolicy.podReauthDeferMs`

This allows operators to compare API-side expected policy with frontend runtime logs (`[SessionPolicy] Effective frontend policy`) during rollout validation.
