# AT Bridge Retention

Memory's AT bridge stores two large local datasets:

- `at_posts`: feed-friendly projected post rows used by the unified feed and thread hydration.
- `at_records`: raw supported lexicon records used for record inspection and some live derivations such as followed-author resolution.

## Retention policy

The cleanup policy is intentionally collection-aware.

- Keep active follow records indefinitely:
  - `app.bsky.graph.follow`
  - `canonical.follow`
- Delete inactive `at_records` after a shorter window.
- Delete active non-follow `at_records` after a bounded window.
- Delete old `at_posts` after a bounded window.

Recommended starting values:

- `AT_BRIDGE_RETENTION_INACTIVE_RECORDS_DAYS=3`
- `AT_BRIDGE_RETENTION_AT_RECORDS_DAYS=14`
- `AT_BRIDGE_RETENTION_AT_POSTS_DAYS=30`
- `AT_BRIDGE_RETENTION_BATCH_SIZE=5000`
- `AT_BRIDGE_RETENTION_MAX_BATCHES_PER_RUN=8`
- `AT_BRIDGE_RETENTION_INTERVAL_MINUTES=60`

## Environment variables

- `AT_BRIDGE_RETENTION_ENABLED`: enable the cleanup service. Default `false`.
- `AT_BRIDGE_RETENTION_INTERVAL_MINUTES`: run interval in minutes. Default `60`.
- `AT_BRIDGE_RETENTION_BATCH_SIZE`: max rows deleted per batch. Default `5000`.
- `AT_BRIDGE_RETENTION_MAX_BATCHES_PER_RUN`: max batches per table per run. Default `8`.
- `AT_BRIDGE_RETENTION_AT_POSTS_DAYS`: retention window for `at_posts`. Default `30`.
- `AT_BRIDGE_RETENTION_AT_RECORDS_DAYS`: retention window for active non-follow `at_records`. Default `14`.
- `AT_BRIDGE_RETENTION_INACTIVE_RECORDS_DAYS`: retention window for inactive `at_records`. Default `3`.
- `AT_BRIDGE_RETENTION_DRY_RUN`: log what would be deleted without deleting. Default `false`.

## Safe recovery SQL

For an already bloated local database, reclaim space in this order.

1. Remove inactive raw records in batches:

```sql
WITH doomed AS (
  SELECT ctid
  FROM at_records
  WHERE is_active = false
    AND ingested_at < now() - interval '3 days'
  LIMIT 5000
)
DELETE FROM at_records
WHERE ctid IN (SELECT ctid FROM doomed);
```

2. Remove old active non-follow raw records in batches:

```sql
WITH doomed AS (
  SELECT ctid
  FROM at_records
  WHERE is_active = true
    AND ingested_at < now() - interval '14 days'
    AND collection NOT IN ('app.bsky.graph.follow', 'canonical.follow')
  LIMIT 5000
)
DELETE FROM at_records
WHERE ctid IN (SELECT ctid FROM doomed);
```

3. Remove old projected AT posts in batches:

```sql
WITH doomed AS (
  SELECT ctid
  FROM at_posts
  WHERE ingested_at < now() - interval '30 days'
  LIMIT 5000
)
DELETE FROM at_posts
WHERE ctid IN (SELECT ctid FROM doomed);
```

4. Refresh planner stats after batched deletes:

```sql
ANALYZE at_records;
ANALYZE at_posts;
```

5. During a maintenance window, reclaim table file space:

```sql
VACUUM (VERBOSE, ANALYZE) at_records;
VACUUM (VERBOSE, ANALYZE) at_posts;
```

6. Only after the database has headroom again, rerun thread graph migrations.

## Notes

- Do not blindly delete old follow records. Memory currently derives followed-author thread bumping from active follow records.
- `VACUUM FULL` is intentionally not the default recommendation because it requires additional free space and stronger locking.