import { describe, expect, it } from 'bun:test'
import { isProtectedActiveRecordCollection, readAtBridgeRetentionConfig } from './AtBridgeRetentionService'

describe('AtBridgeRetentionService', () => {
  it('protects active follow collections from age-based record pruning', () => {
    expect(isProtectedActiveRecordCollection('app.bsky.graph.follow')).toBe(true)
    expect(isProtectedActiveRecordCollection('canonical.follow')).toBe(true)
    expect(isProtectedActiveRecordCollection('app.bsky.feed.post')).toBe(false)
  })

  it('parses environment overrides with safe defaults', () => {
    const config = readAtBridgeRetentionConfig({
      AT_BRIDGE_RETENTION_ENABLED: 'true',
      AT_BRIDGE_RETENTION_INTERVAL_MINUTES: '15',
      AT_BRIDGE_RETENTION_BATCH_SIZE: '2000',
      AT_BRIDGE_RETENTION_MAX_BATCHES_PER_RUN: '3',
      AT_BRIDGE_RETENTION_AT_POSTS_DAYS: '45',
      AT_BRIDGE_RETENTION_AT_RECORDS_DAYS: '21',
      AT_BRIDGE_RETENTION_INACTIVE_RECORDS_DAYS: '5',
      AT_BRIDGE_RETENTION_DRY_RUN: 'true',
    } as NodeJS.ProcessEnv)

    expect(config).toEqual({
      enabled: true,
      intervalMs: 15 * 60 * 1000,
      batchSize: 2000,
      maxBatchesPerRun: 3,
      atPostsRetentionDays: 45,
      atRecordsRetentionDays: 21,
      inactiveRecordsRetentionDays: 5,
      storyRecordsRetentionHours: 48,
      dryRun: true,
    })
  })
})
