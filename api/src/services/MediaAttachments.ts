import { createHash, randomUUID } from 'node:crypto'
import { and, eq, inArray, isNull, lt } from 'drizzle-orm'
import { db } from '../db/client'
import { mediaAttachments } from '../db/schema'
import type { MediaAttachmentInput } from '../types'

export const MAX_MEDIA_ATTACHMENTS = 8
export const SUPPORTED_ATTACHMENT_MEDIA_TYPES = /^(image\/(avif|gif|jpeg|png|webp)|video\/(mp4|quicktime|webm))$/

const DEFAULT_ATTACHMENT_TTL_MS = 24 * 60 * 60 * 1000
const MAX_ORIGINAL_FILENAME_LENGTH = 240
const MAX_ALT_TEXT_LENGTH = 160

export type MediaAttachmentRow = typeof mediaAttachments.$inferSelect
export type MediaAttachmentKind = MediaAttachmentRow['kind']
export type MediaAttachmentState = MediaAttachmentRow['state']

export interface PublicMediaAttachment {
  id: string
  state: MediaAttachmentState
  type: 'Image' | 'Video' | 'Audio' | 'Document'
  kind: MediaAttachmentKind
  mediaType: string
  url: string | null
  sourceUrl: string | null
  canonicalUrl: string | null
  previewUrl: string | null
  thumbnailUrl: string | null
  gatewayUrl: string | null
  filebaseCid: string | null
  digestMultibase: string | null
  size: number
  width: number | null
  height: number | null
  durationMs: number | null
  altText: string | null
  blurhash: string | null
  errorCode: string | null
  errorMessage: string | null
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

export class MediaAttachmentError extends Error {
  constructor(
    public readonly status: number,
    public readonly translationKey: string,
    message: string,
  ) {
    super(message)
    this.name = 'MediaAttachmentError'
  }
}

export function parseAttachmentTtlMs(value = process.env.MEMORY_MEDIA_ATTACHMENT_TTL_MS): number {
  if (!value) return DEFAULT_ATTACHMENT_TTL_MS
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ATTACHMENT_TTL_MS
}

export function buildPrivateMediaSlug(mediaType: string): string {
  return `${randomUUID()}${extensionForMediaType(mediaType)}`
}

export function normalizeMediaType(value: string): string | null {
  const normalized = value.split(';')[0]?.trim().toLowerCase()
  return normalized || null
}

export function chooseMediaType(declaredMediaType: string | null, sniffedMediaType: string | null): string | null {
  if (declaredMediaType && sniffedMediaType && declaredMediaType !== sniffedMediaType) {
    return null
  }
  return sniffedMediaType || declaredMediaType
}

export function sniffMediaType(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) return 'image/png'
  if (bytes.length >= 6) {
    const signature = ascii(bytes, 0, 6)
    if (signature === 'GIF87a' || signature === 'GIF89a') return 'image/gif'
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') return 'image/webp'
  if (bytes.length >= 12 && ascii(bytes, 4, 8) === 'ftyp') {
    const brand = ascii(bytes, 8, 12)
    if (brand === 'avif' || brand === 'avis') return 'image/avif'
    if (brand === 'qt  ') return 'video/quicktime'
    return 'video/mp4'
  }
  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return 'video/webm'
  return null
}

export function sanitizeAltText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()
  return normalized.length > 0 ? normalized.slice(0, MAX_ALT_TEXT_LENGTH) : null
}

export function sanitizeOriginalFilename(value: string | undefined): string | null {
  if (!value) return null
  const basename = value.split(/[\\/]/).pop()?.replace(/[\u0000-\u001f\u007f]/g, '').trim()
  return basename ? basename.slice(0, MAX_ORIGINAL_FILENAME_LENGTH) : null
}

export function inferMediaKind(mediaType: string): MediaAttachmentKind {
  if (mediaType === 'image/gif') return 'gif'
  if (mediaType.startsWith('image/')) return 'image'
  if (mediaType.startsWith('video/')) return 'video'
  if (mediaType.startsWith('audio/')) return 'audio'
  return 'unknown'
}

export function hashPostRequest(value: unknown): string {
  return createHash('sha256').update(stableJson(value)).digest('hex')
}

export function normalizeIdempotencyKey(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  if (!normalized) return null
  if (normalized.length > 128) {
    throw new MediaAttachmentError(400, 'posts.idempotencyKeyInvalid', 'Idempotency key is too long')
  }
  if (!/^[A-Za-z0-9._:-]+$/.test(normalized)) {
    throw new MediaAttachmentError(400, 'posts.idempotencyKeyInvalid', 'Idempotency key contains unsupported characters')
  }
  return normalized
}

export function normalizeMediaAttachmentIds(ids: string[]): string[] {
  return Array.from(new Set(ids.map(id => id.trim()).filter(Boolean)))
}

export async function cleanupExpiredMediaAttachments(userId?: number): Promise<void> {
  const conditions = [
    isNull(mediaAttachments.postId),
    inArray(mediaAttachments.state, ['uploading', 'uploaded', 'failed']),
    lt(mediaAttachments.expiresAt, new Date()),
  ]

  if (typeof userId === 'number' && userId > 0) {
    conditions.push(eq(mediaAttachments.userId, userId))
  }

  await db
    .update(mediaAttachments)
    .set({
      state: 'expired',
      errorCode: 'MEDIA_ATTACHMENT_EXPIRED',
      errorMessage: 'Upload was not attached to a post before it expired',
      updatedAt: new Date(),
    })
    .where(and(...conditions))
}

export async function createUploadingMediaAttachment(input: {
  userId: number
  mediaType: string
  size: number
  originalFilename?: string | null
  altText?: string | null
}): Promise<MediaAttachmentRow> {
  const expiresAt = new Date(Date.now() + parseAttachmentTtlMs())
  const [row] = await db
    .insert(mediaAttachments)
    .values({
      userId: input.userId,
      sourceMediaType: input.mediaType,
      sourceSize: input.size,
      originalFilename: sanitizeOriginalFilename(input.originalFilename ?? undefined),
      altText: sanitizeAltText(input.altText),
      kind: inferMediaKind(input.mediaType),
      state: 'uploading',
      expiresAt,
    })
    .returning()
  return row
}

export async function markMediaAttachmentUploaded(id: string, sourceUrl: string): Promise<MediaAttachmentRow> {
  const [row] = await db
    .update(mediaAttachments)
    .set({
      state: 'uploaded',
      sourceUrl,
      errorCode: null,
      errorMessage: null,
      updatedAt: new Date(),
    })
    .where(eq(mediaAttachments.id, id))
    .returning()
  return row
}

export async function markMediaAttachmentFailed(id: string, code: string, message: string): Promise<void> {
  await db
    .update(mediaAttachments)
    .set({
      state: 'failed',
      errorCode: code.slice(0, 64),
      errorMessage: message.slice(0, 500),
      updatedAt: new Date(),
    })
    .where(eq(mediaAttachments.id, id))
}

export interface MediaAttachmentProcessedUpdate {
  canonicalUrl: string
  gatewayUrl?: string | null
  filebaseCid?: string | null
  digestMultibase?: string | null
  width?: number | null
  height?: number | null
  /** Duration in milliseconds. Convert from seconds at the call site if needed. */
  durationMs?: number | null
  blurhash?: string | null
  thumbnailUrl?: string | null
  previewUrl?: string | null
}

/**
 * Marks a media attachment as fully processed, recording the sidecar's
 * output fields (canonical URL, gateway URL, IPFS CID, dimensions, etc.).
 *
 * Matched by `sourceUrl` — the pod URL of the original binary upload,
 * which the sidecar carries through from the ActivityPods LDP event.
 *
 * Returns:
 *   'updated'       — row found and updated to state=ready.
 *   'already_ready' — row was already in state=ready (idempotent re-delivery).
 *   'not_found'     — no matching row, or row is in a terminal state that
 *                     cannot transition (expired, deleted).
 */
export async function updateMediaAttachmentProcessed(
  sourceUrl: string,
  update: MediaAttachmentProcessedUpdate,
): Promise<'updated' | 'already_ready' | 'not_found'> {
  const [existing] = await db
    .select({ id: mediaAttachments.id, state: mediaAttachments.state })
    .from(mediaAttachments)
    .where(eq(mediaAttachments.sourceUrl, sourceUrl))
    .limit(1)

  if (!existing) return 'not_found'
  if (existing.state === 'ready') return 'already_ready'
  // Terminal states that cannot be promoted to ready
  if (existing.state === 'expired' || existing.state === 'deleted') return 'not_found'

  await db
    .update(mediaAttachments)
    .set({
      state: 'ready',
      canonicalUrl: update.canonicalUrl,
      gatewayUrl: update.gatewayUrl ?? null,
      filebaseCid: update.filebaseCid ?? null,
      digestMultibase: update.digestMultibase ?? null,
      width: update.width ?? null,
      height: update.height ?? null,
      durationMs: update.durationMs ?? null,
      blurhash: update.blurhash ?? null,
      thumbnailUrl: update.thumbnailUrl ?? null,
      previewUrl: update.previewUrl ?? null,
      errorCode: null,
      errorMessage: null,
      expiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(mediaAttachments.id, existing.id))

  return 'updated'
}

export async function getOwnedMediaAttachment(userId: number, id: string): Promise<MediaAttachmentRow | null> {
  if (!isMediaAttachmentId(id)) return null
  const [row] = await db
    .select()
    .from(mediaAttachments)
    .where(and(eq(mediaAttachments.userId, userId), eq(mediaAttachments.id, id)))
    .limit(1)
  return row ?? null
}

export async function deleteOwnedUnattachedMediaAttachment(userId: number, id: string): Promise<MediaAttachmentRow | null> {
  if (!isMediaAttachmentId(id)) return null
  const [row] = await db
    .update(mediaAttachments)
    .set({ state: 'deleted', expiresAt: new Date(), updatedAt: new Date() })
    .where(and(eq(mediaAttachments.userId, userId), eq(mediaAttachments.id, id), isNull(mediaAttachments.postId)))
    .returning()
  return row ?? null
}

export async function resolveAttachableMediaAttachments(userId: number, ids: string[]): Promise<MediaAttachmentRow[]> {
  const uniqueIds = normalizeMediaAttachmentIds(ids)
  if (uniqueIds.length > MAX_MEDIA_ATTACHMENTS) {
    throw new MediaAttachmentError(400, 'media.attachments.tooMany', 'Too many media attachments')
  }
  if (uniqueIds.some(id => !isMediaAttachmentId(id))) {
    throw new MediaAttachmentError(400, 'media.attachments.invalid', 'Invalid media attachment id')
  }
  if (uniqueIds.length === 0) return []

  await cleanupExpiredMediaAttachments(userId)

  const rows = await db
    .select()
    .from(mediaAttachments)
    .where(and(eq(mediaAttachments.userId, userId), inArray(mediaAttachments.id, uniqueIds)))

  const byId = new Map(rows.map(row => [row.id, row]))
  const orderedRows = uniqueIds.map(id => byId.get(id))
  if (orderedRows.some(row => !row)) {
    throw new MediaAttachmentError(404, 'media.attachments.notFound', 'Media attachment not found')
  }

  const invalid = orderedRows.find(row => row && (!isNullish(row.postId) || !isAttachableState(row.state) || !row.sourceUrl))
  if (invalid) {
    throw new MediaAttachmentError(409, 'media.attachments.notAttachable', 'Media attachment is not attachable')
  }

  return orderedRows as MediaAttachmentRow[]
}

export async function markMediaAttachmentsAttached(userId: number, ids: string[], postId: number): Promise<void> {
  const uniqueIds = normalizeMediaAttachmentIds(ids)
  if (uniqueIds.length === 0) return

  await db
    .update(mediaAttachments)
    .set({ postId, expiresAt: null, updatedAt: new Date() })
    .where(and(eq(mediaAttachments.userId, userId), inArray(mediaAttachments.id, uniqueIds), isNull(mediaAttachments.postId)))
}

export function toPublicMediaAttachment(row: MediaAttachmentRow): PublicMediaAttachment {
  const createdAt = row.createdAt instanceof Date ? row.createdAt.toISOString() : new Date(row.createdAt as unknown as string).toISOString()
  const updatedAt = row.updatedAt instanceof Date ? row.updatedAt.toISOString() : new Date(row.updatedAt as unknown as string).toISOString()
  return {
    id: row.id,
    state: row.state,
    type: activityPubAttachmentType(row.sourceMediaType),
    kind: row.kind,
    mediaType: row.sourceMediaType,
    url: row.canonicalUrl || row.sourceUrl,
    sourceUrl: row.sourceUrl,
    canonicalUrl: row.canonicalUrl,
    previewUrl: row.previewUrl,
    thumbnailUrl: row.thumbnailUrl,
    gatewayUrl: row.gatewayUrl,
    filebaseCid: row.filebaseCid,
    digestMultibase: row.digestMultibase,
    size: row.sourceSize,
    width: row.width,
    height: row.height,
    durationMs: row.durationMs,
    altText: row.altText,
    blurhash: row.blurhash,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    createdAt,
    updatedAt,
  }
}

export function toActivityPubMediaAttachment(row: MediaAttachmentRow): MediaAttachmentInput {
  const url = row.canonicalUrl || row.sourceUrl
  if (!url) {
    throw new MediaAttachmentError(409, 'media.attachments.notAttachable', 'Media attachment has no usable URL')
  }
  return {
    type: row.sourceMediaType.startsWith('video/') ? 'Video' : 'Image',
    mediaType: row.sourceMediaType,
    url,
    ...(row.altText ? { name: row.altText } : {}),
  }
}

function extensionForMediaType(mediaType: string): string {
  switch (mediaType) {
    case 'image/avif':
      return '.avif'
    case 'image/gif':
      return '.gif'
    case 'image/jpeg':
      return '.jpg'
    case 'image/png':
      return '.png'
    case 'image/webp':
      return '.webp'
    case 'video/mp4':
      return '.mp4'
    case 'video/quicktime':
      return '.mov'
    case 'video/webm':
      return '.webm'
    default:
      return ''
  }
}

function isAttachableState(state: MediaAttachmentState): boolean {
  return state === 'uploaded' || state === 'ready'
}

function activityPubAttachmentType(mediaType: string): PublicMediaAttachment['type'] {
  if (mediaType.startsWith('image/')) return 'Image'
  if (mediaType.startsWith('video/')) return 'Video'
  if (mediaType.startsWith('audio/')) return 'Audio'
  return 'Document'
}

export function isMediaAttachmentId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

function isNullish(value: unknown): boolean {
  return value === null || value === undefined
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.subarray(start, end))
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableJson(entryValue)}`)
    return `{${entries.join(',')}}`
  }
  return JSON.stringify(value)
}
