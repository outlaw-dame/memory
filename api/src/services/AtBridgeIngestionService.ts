/**
 * AT Protocol Bridge — Ingestion Service
 *
 * Consumes trusted at.ingress.v1 events from the Phase 5.5 pipeline and
 * writes them to the memory app's database for display in the UI.
 *
 * This service is the bridge between the mastopod-federation-architecture
 * ingress pipeline and the memory UI's data layer.
 *
 * Event handling:
 *   #commit  → upsert AT post into at_posts table
 *   #identity → upsert identity into at_identities table
 *   #account  → update is_active flag in at_identities table
 *
 * Design principles:
 *   - Idempotent: all writes use upsert semantics (ON CONFLICT DO UPDATE).
 *   - Non-destructive: delete operations mark records as inactive rather
 *     than hard-deleting them.
 *   - Resilient: individual event failures are logged but do not crash the
 *     service; the consumer group will retry failed events.
 *
 * Security notes:
 *   - Content is stored as received; no sanitisation is performed here.
 *   - AT URIs are validated before storage to prevent injection.
 *   - DID values are validated against the did: prefix.
 *   - The FIREHOSE_BRIDGE_SECRET env var must be set to authenticate
 *     incoming webhook calls from the ingress pipeline.
 */

import { db } from '../db/client'
import { atPosts, atIdentities, atFirehoseCursors, atRecords } from '../db/atBridgeSchema'
import { eq } from 'drizzle-orm'

// ---------------------------------------------------------------------------
// Types (mirrors at.ingress.v1 event schema)
// ---------------------------------------------------------------------------

export interface AtIngressCommitEvent {
  seq: number
  did: string
  eventType: '#commit'
  verifiedAt: string
  source: string
  commit: {
    rev: string
    operation: 'create' | 'update' | 'delete'
    collection: string
    rkey: string
    cid: string | null
    record?: Record<string, unknown> | null
    signatureValid: true
  }
}

export interface AtIngressIdentityEvent {
  seq: number
  did: string
  eventType: '#identity'
  verifiedAt: string
  source: string
  identity: {
    handle?: string
    didDocument: Record<string, unknown>
  }
}

export interface AtIngressAccountEvent {
  seq: number
  did: string
  eventType: '#account'
  verifiedAt: string
  source: string
  account: {
    active: boolean
    status?: 'takendown' | 'suspended' | 'deleted' | 'deactivated'
  }
}

export type AtIngressEvent =
  | AtIngressCommitEvent
  | AtIngressIdentityEvent
  | AtIngressAccountEvent

export interface CanonicalActorRef {
  canonicalAccountId?: string | null
  did?: string | null
  webId?: string | null
  activityPubActorUri?: string | null
  handle?: string | null
}

export interface CanonicalObjectRef {
  canonicalObjectId: string
  atUri?: string | null
  cid?: string | null
  activityPubObjectId?: string | null
  canonicalUrl?: string | null
}

export interface CanonicalContent {
  kind: string
  title?: string | null
  summary?: string | null
  plaintext: string
  html?: string | null
  language?: string | null
  blocks: Array<Record<string, unknown>>
  facets: Array<Record<string, unknown>>
  attachments: Array<Record<string, unknown>>
  externalUrl?: string | null
  linkPreview?: Record<string, unknown> | null
}

export interface CanonicalIntentBase {
  canonicalIntentId: string
  sourceProtocol: 'activitypub' | 'atproto'
  sourceEventId: string
  sourceAccountRef: CanonicalActorRef
  createdAt: string
  observedAt: string
  visibility: unknown
  provenance: {
    originProtocol: 'activitypub' | 'atproto'
    originEventId: string
    originAccountId?: string | null
    mirroredFromCanonicalIntentId?: string | null
    projectionMode: 'native' | 'mirrored'
  }
  warnings: Array<Record<string, unknown>>
}

export type CanonicalIntentEvent = CanonicalIntentBase & {
  kind:
    | 'PostCreate'
    | 'PostEdit'
    | 'PostDelete'
    | 'ReactionAdd'
    | 'ReactionRemove'
    | 'ShareAdd'
    | 'ShareRemove'
    | 'FollowAdd'
    | 'FollowRemove'
    | 'ProfileUpdate'
    | 'AccountState'
  object?: CanonicalObjectRef
  content?: CanonicalContent
  inReplyTo?: CanonicalObjectRef | null
  subject?: CanonicalActorRef
  reactionType?: 'like'
  state?: 'active' | 'suspended' | 'deactivated'
}

export type BridgeEvent = AtIngressEvent | CanonicalIntentEvent

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const AT_URI_PATTERN = /^at:\/\/did:[a-zA-Z0-9:._-]{1,2000}\/[a-zA-Z0-9.]{1,500}\/[a-zA-Z0-9._-]{1,512}$/
const DID_PATTERN = /^did:[a-zA-Z0-9]+:[a-zA-Z0-9._:-]{1,2000}$/

function isValidDid(did: string): boolean {
  return DID_PATTERN.test(did)
}

function isValidAtUri(uri: string): boolean {
  return AT_URI_PATTERN.test(uri)
}

function buildAtUri(did: string, collection: string, rkey: string): string {
  return `at://${did}/${collection}/${rkey}`
}

function parseAtUri(uri: string): { did: string; collection: string; rkey: string } | null {
  const match = uri.match(/^at:\/\/([^/]+)\/([^/]+)\/(.+)$/)
  if (!match) return null
  return {
    did: match[1],
    collection: match[2],
    rkey: match[3],
  }
}

function isSupportedLexiconCollection(collection: string): boolean {
  return collection.startsWith('app.bsky.') || collection.startsWith('standard.site.')
}

function extractRecordCreatedAt(record: any): Date {
  const raw = record?.createdAt || record?.publishedAt || record?.published
  if (!raw || typeof raw !== 'string') return new Date()
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return new Date()
  // Clamp future-dated author timestamps to now to prevent sort-order manipulation.
  const now = new Date()
  return parsed > now ? now : parsed
}

function extractRecordContent(record: any): string | null {
  const candidates = [record?.text, record?.content, record?.body, record?.description]
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim().length > 0) return value
  }
  return null
}

function normalizeOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function inferFeedPostType(
  collection: string,
  value: { content?: CanonicalContent | null } | Record<string, unknown> | null | undefined,
): 'note' | 'article' {
  if (collection.startsWith('standard.site.')) return 'article'
  if (value && typeof value === 'object' && 'content' in value) {
    const content = (value as { content?: CanonicalContent | null }).content
    if (content?.kind === 'article') return 'article'
  }
  return 'note'
}

function extractRecordTitle(record: any): string | null {
  return normalizeOptionalString(record?.title)
    ?? normalizeOptionalString(record?.name)
    ?? normalizeOptionalString(record?.headline)
}

function extractRecordSummary(record: any): string | null {
  return normalizeOptionalString(record?.summary)
    ?? normalizeOptionalString(record?.description)
}

function extractRecordCanonicalUrl(record: any): string | null {
  return normalizeOptionalString(record?.url)
}

function shouldProjectToFeed(collection: string, record: any): boolean {
  if (collection === 'app.bsky.feed.post') return true
  if (!collection.startsWith('standard.site.')) return false
  const hasDisplayContent = typeof extractRecordContent(record) === 'string'
  return hasDisplayContent
}

function isCanonicalIntentEvent(event: unknown): event is CanonicalIntentEvent {
  if (!event || typeof event !== 'object') return false
  const value = event as Record<string, unknown>
  return (
    typeof value.kind === 'string'
    && typeof value.canonicalIntentId === 'string'
    && typeof value.sourceProtocol === 'string'
    && typeof value.sourceEventId === 'string'
  )
}

function canonicalActorIdentity(ref: CanonicalActorRef): string {
  return (
    ref.canonicalAccountId
    || ref.handle
    || ref.did
    || ref.activityPubActorUri
    || ref.webId
    || 'unknown-actor'
  )
}

function canonicalOperation(kind: CanonicalIntentEvent['kind']): 'create' | 'update' | 'delete' {
  switch (kind) {
    case 'PostEdit':
    case 'ProfileUpdate':
      return 'update'
    case 'PostDelete':
    case 'ReactionRemove':
    case 'ShareRemove':
    case 'FollowRemove':
      return 'delete'
    default:
      return 'create'
  }
}

function canonicalCollection(intent: CanonicalIntentEvent): string {
  const atUri = intent.object?.atUri
  if (typeof atUri === 'string') {
    const parsed = parseAtUri(atUri)
    if (parsed?.collection) return parsed.collection
  }

  switch (intent.kind) {
    case 'PostCreate':
    case 'PostEdit':
    case 'PostDelete':
      return 'canonical.post'
    case 'ReactionAdd':
    case 'ReactionRemove':
      return 'canonical.reaction'
    case 'ShareAdd':
    case 'ShareRemove':
      return 'canonical.share'
    case 'FollowAdd':
    case 'FollowRemove':
      return 'canonical.follow'
    case 'ProfileUpdate':
      return 'canonical.profile'
    case 'AccountState':
      return 'canonical.account'
    default:
      return 'canonical.intent'
  }
}

function canonicalRkey(intentId: string): string {
  const cleaned = intentId.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-120)
  return cleaned.length > 0 ? cleaned : 'intent'
}

function canonicalUri(intent: CanonicalIntentEvent): string {
  if (intent.object?.atUri && isValidAtUri(intent.object.atUri)) {
    return intent.object.atUri
  }
  return `canonical://intent/${encodeURIComponent(intent.canonicalIntentId)}`
}

function parseTimestamp(value: string): Date {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

function contentFromCanonical(intent: CanonicalIntentEvent): string | null {
  if (!intent.content) return null
  const plain = intent.content.plaintext
  if (typeof plain === 'string' && plain.trim().length > 0) return plain
  if (typeof intent.content.summary === 'string' && intent.content.summary.trim().length > 0) {
    return intent.content.summary
  }
  if (typeof intent.content.title === 'string' && intent.content.title.trim().length > 0) {
    return intent.content.title
  }
  return null
}

function titleFromCanonical(intent: CanonicalIntentEvent): string | null {
  return normalizeOptionalString(intent.content?.title)
}

function summaryFromCanonical(intent: CanonicalIntentEvent): string | null {
  return normalizeOptionalString(intent.content?.summary)
}

function canonicalUrlFromIntent(intent: CanonicalIntentEvent): string | null {
  return normalizeOptionalString(intent.content?.externalUrl)
    ?? normalizeOptionalString(intent.object?.canonicalUrl)
    ?? normalizeOptionalString(intent.object?.activityPubObjectId)
}

function shouldProjectCanonicalToFeed(intent: CanonicalIntentEvent): boolean {
  if (intent.kind !== 'PostCreate' && intent.kind !== 'PostEdit') return false
  return typeof contentFromCanonical(intent) === 'string'
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class AtBridgeIngestionService {
  /**
   * Process either a legacy AT ingress envelope or a canonical intent envelope.
   * CanonicalIntent is the preferred unification contract.
   */
  async processBridgeEvent(event: BridgeEvent | Record<string, unknown>): Promise<boolean> {
    if (isCanonicalIntentEvent(event)) {
      return this.processCanonicalIntent(event)
    }
    return this.processIngressEvent(event as AtIngressEvent)
  }

  /**
   * Process a single trusted at.ingress.v1 event.
   * Returns true if processed successfully, false on error.
   */
  async processIngressEvent(event: AtIngressEvent): Promise<boolean> {
    try {
      switch (event.eventType) {
        case '#commit':
          await this.handleCommit(event)
          break
        case '#identity':
          await this.handleIdentity(event)
          break
        case '#account':
          await this.handleAccount(event)
          break
        default:
          console.warn('[AtBridgeIngestion] Unknown event type:', (event as any).eventType)
      }

      // Update cursor tracking
      await this.updateCursorState(event.source, event.seq)
      return true
    } catch (err) {
      console.error('[AtBridgeIngestion] Failed to process event:', {
        seq: event.seq,
        did: event.did,
        eventType: event.eventType,
        error: err instanceof Error ? err.message : String(err),
      })
      return false
    }
  }

  /**
   * Process a single CanonicalIntent envelope.
   */
  async processCanonicalIntent(intent: CanonicalIntentEvent): Promise<boolean> {
    try {
      await this.handleCanonicalIntent(intent)

      const parsedSeq = Number.parseInt(intent.sourceEventId, 10)
      const fallbackSeq = Math.floor(Date.now() / 1000)
      const seq = Number.isFinite(parsedSeq) ? parsedSeq : fallbackSeq
      const sourceId = `canonical:${intent.sourceProtocol}`
      await this.updateCursorState(sourceId, seq)

      return true
    } catch (err) {
      console.error('[AtBridgeIngestion] Failed to process canonical intent:', {
        canonicalIntentId: intent.canonicalIntentId,
        kind: intent.kind,
        sourceProtocol: intent.sourceProtocol,
        error: err instanceof Error ? err.message : String(err),
      })
      return false
    }
  }

  private async handleCommit(event: AtIngressCommitEvent): Promise<void> {
    const { commit, did, source, seq } = event

    // Support Bluesky lexicons plus standard.site lexicons.
    if (!isSupportedLexiconCollection(commit.collection)) {
      return
    }

    if (!isValidDid(did)) {
      console.warn('[AtBridgeIngestion] Invalid DID in commit event:', did)
      return
    }

    const atUri = buildAtUri(did, commit.collection, commit.rkey)
    if (!isValidAtUri(atUri)) {
      console.warn('[AtBridgeIngestion] Invalid AT URI constructed:', atUri)
      return
    }

    const record = (commit.record as any) ?? null
    const createdAt = extractRecordCreatedAt(record)

    if (commit.operation === 'delete') {
      // Soft-delete both canonical raw record and feed projection.
      await db
        .update(atRecords)
        .set({
          isActive: false,
          operation: 'delete',
          firehoseSeq: seq,
          ingestedAt: new Date(),
        })
        .where(eq(atRecords.atUri, atUri))

      await db
        .update(atPosts)
        .set({ isPublic: false })
        .where(eq(atPosts.atUri, atUri))
      return
    }

    await db
      .insert(atRecords)
      .values({
        authorDid: did,
        collection: commit.collection,
        rkey: commit.rkey,
        atUri,
        cid: commit.cid,
        operation: commit.operation,
        record,
        isActive: true,
        createdAt,
        ingestedAt: new Date(),
        sourceRelay: source,
        firehoseSeq: seq,
      })
      .onConflictDoUpdate({
        target: atRecords.atUri,
        set: {
          cid: commit.cid,
          operation: commit.operation,
          record,
          isActive: true,
          createdAt,
          ingestedAt: new Date(),
          sourceRelay: source,
          firehoseSeq: seq,
        },
      })

    // Keep the existing at_posts projection for feed-friendly, text-first records.
    if (!shouldProjectToFeed(commit.collection, record)) {
      return
    }

    const content = extractRecordContent(record)
    if (!content) return
    const postType = inferFeedPostType(commit.collection, record)
    const title = extractRecordTitle(record)
    const summary = extractRecordSummary(record)
    const canonicalUrl = extractRecordCanonicalUrl(record)

    await db
      .insert(atPosts)
      .values({
        authorDid: did,
        rkey: commit.rkey,
        atUri,
        cid: commit.cid,
        content,
        postType,
        title,
        summary,
        canonicalUrl,
        isPublic: true,
        facets: record?.facets ?? null,
        embeds: record?.embed ?? null,
        replyParentUri: record?.reply?.parent?.uri ?? null,
        replyRootUri: record?.reply?.root?.uri ?? null,
        createdAt,
        ingestedAt: new Date(),
        sourceRelay: source,
        firehoseSeq: seq,
      })
      .onConflictDoUpdate({
        target: atPosts.atUri,
        set: {
          content,
          cid: commit.cid,
          postType,
          title,
          summary,
          canonicalUrl,
          facets: record?.facets ?? null,
          embeds: record?.embed ?? null,
          isPublic: true,
          firehoseSeq: seq,
        },
      })
  }

  private async handleIdentity(event: AtIngressIdentityEvent): Promise<void> {
    const { did, identity } = event

    if (!isValidDid(did)) {
      console.warn('[AtBridgeIngestion] Invalid DID in identity event:', did)
      return
    }

    await db
      .insert(atIdentities)
      .values({
        did,
        handle: identity.handle ?? null,
        didDocument: identity.didDocument as any,
        isActive: true,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: atIdentities.did,
        set: {
          handle: identity.handle ?? null,
          didDocument: identity.didDocument as any,
          isActive: true,
          resolvedAt: new Date(),
          updatedAt: new Date(),
        },
      })
  }

  private async handleAccount(event: AtIngressAccountEvent): Promise<void> {
    const { did, account } = event

    if (!isValidDid(did)) {
      console.warn('[AtBridgeIngestion] Invalid DID in account event:', did)
      return
    }

    await db
      .insert(atIdentities)
      .values({
        did,
        isActive: account.active,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: atIdentities.did,
        set: {
          isActive: account.active,
          updatedAt: new Date(),
        },
      })
  }

  private async handleCanonicalIntent(intent: CanonicalIntentEvent): Promise<void> {
    const authorIdentity = canonicalActorIdentity(intent.sourceAccountRef)
    const collection = canonicalCollection(intent)
    const uri = canonicalUri(intent)
    const operation = canonicalOperation(intent.kind)
    const createdAt = parseTimestamp(intent.createdAt)
    const parsedUri = parseAtUri(uri)
    const rkey = parsedUri?.rkey ?? canonicalRkey(intent.canonicalIntentId)
    const cid = intent.object?.cid ?? null
    const record = {
      ...intent,
      _ingestContract: 'CanonicalIntent',
    }

    await db
      .insert(atRecords)
      .values({
        authorDid: authorIdentity,
        collection,
        rkey,
        atUri: uri,
        cid,
        operation,
        record,
        isActive: operation !== 'delete',
        createdAt,
        ingestedAt: new Date(),
        sourceRelay: `canonical:${intent.sourceProtocol}:${intent.provenance.originProtocol}`,
        firehoseSeq: null,
      })
      .onConflictDoUpdate({
        target: atRecords.atUri,
        set: {
          cid,
          operation,
          record,
          isActive: operation !== 'delete',
          createdAt,
          ingestedAt: new Date(),
          sourceRelay: `canonical:${intent.sourceProtocol}:${intent.provenance.originProtocol}`,
          firehoseSeq: null,
        },
      })

    if (operation === 'delete') {
      await db
        .update(atPosts)
        .set({ isPublic: false })
        .where(eq(atPosts.atUri, uri))
    } else if (shouldProjectCanonicalToFeed(intent)) {
      const content = contentFromCanonical(intent)
      if (content) {
        const parentUri = intent.inReplyTo?.atUri ?? intent.inReplyTo?.activityPubObjectId ?? null
        const postType = inferFeedPostType(collection, intent)
        const title = titleFromCanonical(intent)
        const summary = summaryFromCanonical(intent)
        const canonicalUrl = canonicalUrlFromIntent(intent)
        await db
          .insert(atPosts)
          .values({
            authorDid: authorIdentity,
            rkey,
            atUri: uri,
            cid,
            content,
            postType,
            title,
            summary,
            canonicalUrl,
            isPublic: true,
            facets: intent.content?.facets ?? null,
            embeds: intent.content?.attachments ?? null,
            replyParentUri: parentUri,
            replyRootUri: parentUri,
            createdAt,
            ingestedAt: new Date(),
            sourceRelay: `canonical:${intent.sourceProtocol}:${intent.provenance.originProtocol}`,
            firehoseSeq: null,
          })
          .onConflictDoUpdate({
            target: atPosts.atUri,
            set: {
              content,
              cid,
              postType,
              title,
              summary,
              canonicalUrl,
              facets: intent.content?.facets ?? null,
              embeds: intent.content?.attachments ?? null,
              isPublic: true,
              createdAt,
            },
          })
      }
    }

    if (intent.kind === 'ProfileUpdate' || intent.kind === 'AccountState') {
      const isActive = intent.kind === 'AccountState' ? intent.state === 'active' : true
      await this.upsertCanonicalIdentity(intent, authorIdentity, isActive)
      return
    }

    await this.upsertCanonicalIdentity(intent, authorIdentity, true)
  }

  private async upsertCanonicalIdentity(
    intent: CanonicalIntentEvent,
    actorIdentity: string,
    isActive: boolean,
  ): Promise<void> {
    const displayHandle = intent.sourceAccountRef.canonicalAccountId
      ?? intent.sourceAccountRef.handle
      ?? null

    await db
      .insert(atIdentities)
      .values({
        did: actorIdentity,
        handle: displayHandle,
        didDocument: {
          canonicalAccountId: intent.sourceAccountRef.canonicalAccountId ?? null,
          did: intent.sourceAccountRef.did ?? null,
          activityPubActorUri: intent.sourceAccountRef.activityPubActorUri ?? null,
          webId: intent.sourceAccountRef.webId ?? null,
          sourceProtocol: intent.sourceProtocol,
          lastCanonicalIntentId: intent.canonicalIntentId,
        },
        isActive,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: atIdentities.did,
        set: {
          handle: displayHandle,
          didDocument: {
            canonicalAccountId: intent.sourceAccountRef.canonicalAccountId ?? null,
            did: intent.sourceAccountRef.did ?? null,
            activityPubActorUri: intent.sourceAccountRef.activityPubActorUri ?? null,
            webId: intent.sourceAccountRef.webId ?? null,
            sourceProtocol: intent.sourceProtocol,
            lastCanonicalIntentId: intent.canonicalIntentId,
          },
          isActive,
          resolvedAt: new Date(),
          updatedAt: new Date(),
        },
      })
  }

  private async updateCursorState(sourceId: string, seq: number): Promise<void> {
    try {
      await db
        .insert(atFirehoseCursors)
        .values({
          sourceId,
          isConnected: true,
          hotSeq: seq,
          lastEventAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: atFirehoseCursors.sourceId,
          set: {
            isConnected: true,
            hotSeq: seq,
            lastEventAt: new Date(),
            updatedAt: new Date(),
          },
        })
    } catch (err) {
      // Non-fatal: cursor tracking failure should not block event processing
      console.error('[AtBridgeIngestion] Failed to update cursor state:', err)
    }
  }
}

export const atBridgeIngestionService = new AtBridgeIngestionService()
