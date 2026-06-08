import { and, eq, inArray, lt, notInArray, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { atPosts, atRecords } from '../db/atBridgeSchema'

const PROTECTED_ACTIVE_RECORD_COLLECTIONS = [
  'app.bsky.graph.follow',
  'canonical.follow',
] as const

const DEFAULT_INTERVAL_MINUTES = 60
const DEFAULT_BATCH_SIZE = 5000
const DEFAULT_MAX_BATCHES_PER_RUN = 8
const DEFAULT_AT_POSTS_RETENTION_DAYS = 30
const DEFAULT_AT_RECORDS_RETENTION_DAYS = 14
const DEFAULT_INACTIVE_RECORDS_RETENTION_DAYS = 3
const DEFAULT_STORY_RECORDS_RETENTION_HOURS = 48
const STORY_COLLECTION = 'org.activitypods.story.slide'

export interface AtBridgeRetentionConfig {
  enabled: boolean
  intervalMs: number
  batchSize: number
  maxBatchesPerRun: number
  atPostsRetentionDays: number
  atRecordsRetentionDays: number
  inactiveRecordsRetentionDays: number
  storyRecordsRetentionHours: number
  dryRun: boolean
}

export interface AtBridgeRetentionRunSummary {
  deletedAtPosts: number
  deletedStoryAtRecords: number
  deletedActiveAtRecords: number
  deletedInactiveAtRecords: number
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback
  const normalized = value.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return fallback
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function retentionCutoff(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

function retentionCutoffHours(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000)
}

export function isProtectedActiveRecordCollection(collection: string): boolean {
  return PROTECTED_ACTIVE_RECORD_COLLECTIONS.includes(collection as (typeof PROTECTED_ACTIVE_RECORD_COLLECTIONS)[number])
}

export function readAtBridgeRetentionConfig(env: NodeJS.ProcessEnv = process.env): AtBridgeRetentionConfig {
  const intervalMinutes = parsePositiveInteger(env.AT_BRIDGE_RETENTION_INTERVAL_MINUTES, DEFAULT_INTERVAL_MINUTES)

  return {
    enabled: parseBoolean(env.AT_BRIDGE_RETENTION_ENABLED, false),
    intervalMs: intervalMinutes * 60 * 1000,
    batchSize: parsePositiveInteger(env.AT_BRIDGE_RETENTION_BATCH_SIZE, DEFAULT_BATCH_SIZE),
    maxBatchesPerRun: parsePositiveInteger(env.AT_BRIDGE_RETENTION_MAX_BATCHES_PER_RUN, DEFAULT_MAX_BATCHES_PER_RUN),
    atPostsRetentionDays: parsePositiveInteger(env.AT_BRIDGE_RETENTION_AT_POSTS_DAYS, DEFAULT_AT_POSTS_RETENTION_DAYS),
    atRecordsRetentionDays: parsePositiveInteger(env.AT_BRIDGE_RETENTION_AT_RECORDS_DAYS, DEFAULT_AT_RECORDS_RETENTION_DAYS),
    inactiveRecordsRetentionDays: parsePositiveInteger(env.AT_BRIDGE_RETENTION_INACTIVE_RECORDS_DAYS, DEFAULT_INACTIVE_RECORDS_RETENTION_DAYS),
    storyRecordsRetentionHours: parsePositiveInteger(env.AT_BRIDGE_RETENTION_STORY_RECORDS_HOURS, DEFAULT_STORY_RECORDS_RETENTION_HOURS),
    dryRun: parseBoolean(env.AT_BRIDGE_RETENTION_DRY_RUN, false),
  }
}

async function collectInactiveRecordIds(cutoff: Date, batchSize: number): Promise<number[]> {
  const rows = await db
    .select({ id: atRecords.id })
    .from(atRecords)
    .where(
      and(
        eq(atRecords.isActive, false),
        lt(atRecords.ingestedAt, cutoff),
      ),
    )
    .orderBy(atRecords.ingestedAt, atRecords.id)
    .limit(batchSize)

  return rows.map(row => row.id)
}

async function collectActiveRecordIds(cutoff: Date, batchSize: number): Promise<number[]> {
  const rows = await db
    .select({ id: atRecords.id })
    .from(atRecords)
    .where(
      and(
        eq(atRecords.isActive, true),
        lt(atRecords.ingestedAt, cutoff),
        notInArray(atRecords.collection, [...PROTECTED_ACTIVE_RECORD_COLLECTIONS]),
        sql`${atRecords.collection} <> ${STORY_COLLECTION}`,
      ),
    )
    .orderBy(atRecords.ingestedAt, atRecords.id)
    .limit(batchSize)

  return rows.map(row => row.id)
}

async function collectStoryRecordIds(cutoff: Date, batchSize: number): Promise<number[]> {
  const rows = await db
    .select({ id: atRecords.id })
    .from(atRecords)
    .where(
      and(
        eq(atRecords.collection, STORY_COLLECTION),
        lt(atRecords.ingestedAt, cutoff),
      ),
    )
    .orderBy(atRecords.ingestedAt, atRecords.id)
    .limit(batchSize)

  return rows.map(row => row.id)
}

async function collectAtPostIds(cutoff: Date, batchSize: number): Promise<number[]> {
  const rows = await db
    .select({ id: atPosts.id })
    .from(atPosts)
    .where(lt(atPosts.ingestedAt, cutoff))
    .orderBy(atPosts.ingestedAt, atPosts.id)
    .limit(batchSize)

  return rows.map(row => row.id)
}

async function deleteByIds(tableName: 'at_records' | 'at_posts', ids: number[]): Promise<void> {
  if (ids.length === 0) return

  if (tableName === 'at_records') {
    await db.delete(atRecords).where(inArray(atRecords.id, ids))
    return
  }

  await db.delete(atPosts).where(inArray(atPosts.id, ids))
}

export async function runAtBridgeRetention(config: AtBridgeRetentionConfig): Promise<AtBridgeRetentionRunSummary> {
  const summary: AtBridgeRetentionRunSummary = {
    deletedAtPosts: 0,
    deletedStoryAtRecords: 0,
    deletedActiveAtRecords: 0,
    deletedInactiveAtRecords: 0,
  }

  const inactiveCutoff = retentionCutoff(config.inactiveRecordsRetentionDays)
  const storyCutoff = retentionCutoffHours(config.storyRecordsRetentionHours)
  const activeRecordCutoff = retentionCutoff(config.atRecordsRetentionDays)
  const atPostCutoff = retentionCutoff(config.atPostsRetentionDays)

  for (let batchIndex = 0; batchIndex < config.maxBatchesPerRun; batchIndex += 1) {
    const ids = await collectInactiveRecordIds(inactiveCutoff, config.batchSize)
    if (ids.length === 0) break
    summary.deletedInactiveAtRecords += ids.length
    if (!config.dryRun) await deleteByIds('at_records', ids)
  }

  for (let batchIndex = 0; batchIndex < config.maxBatchesPerRun; batchIndex += 1) {
    const ids = await collectStoryRecordIds(storyCutoff, config.batchSize)
    if (ids.length === 0) break
    summary.deletedStoryAtRecords += ids.length
    if (!config.dryRun) await deleteByIds('at_records', ids)
  }

  for (let batchIndex = 0; batchIndex < config.maxBatchesPerRun; batchIndex += 1) {
    const ids = await collectActiveRecordIds(activeRecordCutoff, config.batchSize)
    if (ids.length === 0) break
    summary.deletedActiveAtRecords += ids.length
    if (!config.dryRun) await deleteByIds('at_records', ids)
  }

  for (let batchIndex = 0; batchIndex < config.maxBatchesPerRun; batchIndex += 1) {
    const ids = await collectAtPostIds(atPostCutoff, config.batchSize)
    if (ids.length === 0) break
    summary.deletedAtPosts += ids.length
    if (!config.dryRun) await deleteByIds('at_posts', ids)
  }

  if (!config.dryRun && (
    summary.deletedAtPosts > 0 ||
    summary.deletedStoryAtRecords > 0 ||
    summary.deletedActiveAtRecords > 0 ||
    summary.deletedInactiveAtRecords > 0
  )) {
    await db.execute(sql`ANALYZE at_records`)
    await db.execute(sql`ANALYZE at_posts`)
  }

  return summary
}

export function startAtBridgeRetentionService(env: NodeJS.ProcessEnv = process.env): Timer | null {
  const config = readAtBridgeRetentionConfig(env)
  if (!config.enabled) {
    console.info('[AtBridgeRetention] Disabled')
    return null
  }

  const execute = async () => {
    try {
      const summary = await runAtBridgeRetention(config)
      console.info('[AtBridgeRetention] Completed run', summary)
    } catch (error) {
      console.error('[AtBridgeRetention] Run failed', error)
    }
  }

  void execute()
  const timer = setInterval(() => {
    void execute()
  }, config.intervalMs)

  console.info('[AtBridgeRetention] Enabled', {
    intervalMs: config.intervalMs,
    batchSize: config.batchSize,
    maxBatchesPerRun: config.maxBatchesPerRun,
    atPostsRetentionDays: config.atPostsRetentionDays,
    atRecordsRetentionDays: config.atRecordsRetentionDays,
    inactiveRecordsRetentionDays: config.inactiveRecordsRetentionDays,
    storyRecordsRetentionHours: config.storyRecordsRetentionHours,
    dryRun: config.dryRun,
    protectedCollections: [...PROTECTED_ACTIVE_RECORD_COLLECTIONS],
  })

  return timer
}
