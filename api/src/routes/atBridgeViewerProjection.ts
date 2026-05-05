export type ProjectedFeedSource = 'activitypods' | 'atproto'

export type ViewerModerationFilter = {
  action: 'hide' | 'warn' | 'filter'
  matchType: 'word' | 'phrase'
  terms: string[]
  includeHashtagVariants: boolean
}

export type ModerationVisibilityAction = 'off' | 'warn' | 'hide'

export type ViewerModerationState = {
  hiddenSubjectKeys: Set<string>
  filters: ViewerModerationFilter[]
  sensitiveMediaAction: ModerationVisibilityAction
  atprotoLabelerAction: ModerationVisibilityAction
  hasEnabledAtprotoLabelers: boolean
}

export type ModerationWarning = {
  reason: 'sensitive-media' | 'atproto-labeler'
  message: string
}

export type ThreadProjectionRow = {
  authorWebId: string
  source: ProjectedFeedSource
  atUri: string | null
  objectUri: string | null
  candidateUri?: string | null
  content: string
  title: string | null
  summary: string | null
  hashtags: string[]
  hasMedia?: boolean | null
  moderationWarning?: ModerationWarning | null
  createdAt: Date | null
  replyParentUri?: string | null
  replyRootUri?: string | null
  threadReplyCount?: number | null
  threadParticipantCount?: number | null
  threadLastActivityAt?: Date | null
}

export type ViewerThreadMetrics = {
  replyCount: number
  participantCount: number
  lastActivityAt: Date | null
}

export type VisibleThreadWindow<T> = {
  page: T[]
  nextOffset: number
}

function normalizeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function parseAtUri(value: string): { did: string; collection?: string; rkey?: string } | null {
  if (!value.startsWith('at://')) return null
  const parts = value.replace('at://', '').split('/').filter(Boolean)
  if (parts.length < 1) return null
  return {
    did: parts[0],
    collection: parts[1],
    rkey: parts[2],
  }
}

function normalizeModerationSubjectKey(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim().toLowerCase() : null
}

function getPrimaryParticipantKey(row: ThreadProjectionRow): string | null {
  if (row.source === 'atproto') {
    const did = row.atUri ? normalizeModerationSubjectKey(parseAtUri(row.atUri)?.did) : null
    if (did) return did
  }

  return normalizeModerationSubjectKey(row.authorWebId)
}

function getRowSubjectKeys(row: ThreadProjectionRow): Set<string> {
  const keys = new Set<string>()
  const authorWebId = normalizeModerationSubjectKey(row.authorWebId)
  if (authorWebId) keys.add(authorWebId)

  if (row.source === 'atproto') {
    const atDid = row.atUri ? normalizeModerationSubjectKey(parseAtUri(row.atUri)?.did) : null
    if (atDid) keys.add(atDid)
  }

  return keys
}

function getRowSearchCorpus(row: ThreadProjectionRow): { combined: string; tokens: Set<string> } {
  const parts = [
    row.content,
    row.title ?? null,
    row.summary ?? null,
    ...(Array.isArray(row.hashtags) ? row.hashtags : []).flatMap(hashtag => {
      const normalized = normalizeString(hashtag)?.toLowerCase()
      if (!normalized) return []
      return normalized.startsWith('#') ? [normalized, normalized.slice(1)] : [normalized, `#${normalized}`]
    }),
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map(value => value.toLowerCase())

  const combined = parts.join(' ')
  const tokens = new Set((combined.match(/[\p{L}\p{N}_#@.:-]+/gu) ?? []).map(token => token.toLowerCase()))
  return { combined, tokens }
}

function expandFilterTerms(filter: ViewerModerationFilter): string[] {
  const expanded = new Set<string>()

  for (const term of filter.terms) {
    const normalized = term.trim().toLowerCase()
    if (!normalized) continue
    expanded.add(normalized)

    if (!filter.includeHashtagVariants) continue
    if (normalized.startsWith('#')) {
      const withoutHash = normalized.slice(1)
      if (withoutHash) expanded.add(withoutHash)
    } else {
      expanded.add(`#${normalized}`)
    }
  }

  return [...expanded]
}

function matchesViewerKeywordFilter(row: ThreadProjectionRow, filters: ViewerModerationFilter[]): boolean {
  if (filters.length === 0) return false

  const corpus = getRowSearchCorpus(row)
  for (const filter of filters) {
    if (filter.action === 'warn') continue

    const terms = expandFilterTerms(filter)
    const matches = filter.matchType === 'phrase'
      ? terms.some(term => corpus.combined.includes(term))
      : terms.some(term => corpus.tokens.has(term))

    if (matches) return true
  }

  return false
}

function rowHasMedia(row: ThreadProjectionRow): boolean {
  return row.hasMedia === true
}

function shouldHideForMediaPolicy(row: ThreadProjectionRow, state: ViewerModerationState): boolean {
  if (!rowHasMedia(row)) return false

  if (state.sensitiveMediaAction === 'hide') {
    return true
  }

  if (
    state.hasEnabledAtprotoLabelers &&
    row.source === 'atproto' &&
    state.atprotoLabelerAction === 'hide'
  ) {
    return true
  }

  return false
}

function resolveWarningForRow(row: ThreadProjectionRow, state: ViewerModerationState): ModerationWarning | null {
  if (!rowHasMedia(row)) return null

  if (
    state.hasEnabledAtprotoLabelers &&
    row.source === 'atproto' &&
    state.atprotoLabelerAction === 'warn'
  ) {
    return {
      reason: 'atproto-labeler',
      message: 'Hidden preview: trusted ATProto labelers flagged this media as sensitive.',
    }
  }

  if (state.sensitiveMediaAction === 'warn') {
    return {
      reason: 'sensitive-media',
      message: 'Hidden preview: your sensitive media preference is set to warn.',
    }
  }

  return null
}

export function isRowHiddenForViewer(row: ThreadProjectionRow, state: ViewerModerationState | null): boolean {
  if (!state) return false

  const rowSubjectKeys = getRowSubjectKeys(row)
  for (const key of rowSubjectKeys) {
    if (state.hiddenSubjectKeys.has(key)) return true
  }

  if (matchesViewerKeywordFilter(row, state.filters)) return true
  if (shouldHideForMediaPolicy(row, state)) return true

  return false
}

export function filterViewerModeratedRows<T extends ThreadProjectionRow>(
  rows: T[],
  state: ViewerModerationState | null,
): { visible: T[]; hiddenCount: number } {
  if (!state || rows.length === 0) {
    return { visible: rows, hiddenCount: 0 }
  }

  const visible: T[] = []
  let hiddenCount = 0

  for (const row of rows) {
    if (isRowHiddenForViewer(row, state)) {
      hiddenCount += 1
      continue
    }
    visible.push(row)
  }

  return { visible, hiddenCount }
}

export function applyViewerWarningFlags<T extends ThreadProjectionRow>(
  rows: T[],
  state: ViewerModerationState | null,
): T[] {
  if (!state || rows.length === 0) return rows

  return rows.map(row => {
    const warning = resolveWarningForRow(row, state)
    return {
      ...row,
      moderationWarning: warning,
    }
  })
}

export function getThreadRootUri(row: ThreadProjectionRow): string | null {
  return normalizeString(row.replyRootUri)
    ?? normalizeString(row.candidateUri)
    ?? normalizeString(row.objectUri)
    ?? normalizeString(row.atUri)
    ?? null
}

export function buildViewerThreadMetrics<T extends ThreadProjectionRow>(rows: T[]): ViewerThreadMetrics {
  const participants = new Set<string>()
  let lastActivityAt: Date | null = null

  for (const row of rows) {
    const participantKey = getPrimaryParticipantKey(row)
    if (participantKey) participants.add(participantKey)

    if (row.createdAt && (!lastActivityAt || row.createdAt.getTime() > lastActivityAt.getTime())) {
      lastActivityAt = row.createdAt
    }
  }

  return {
    replyCount: rows.length,
    participantCount: participants.size,
    lastActivityAt,
  }
}

export function applyViewerThreadMetrics<T extends ThreadProjectionRow>(
  rows: T[],
  metricsByRootUri: ReadonlyMap<string, ViewerThreadMetrics>,
): T[] {
  return rows.map(row => {
    const rootUri = getThreadRootUri(row)
    const metrics = rootUri ? metricsByRootUri.get(rootUri) : null
    if (!metrics) return row

    return {
      ...row,
      threadReplyCount: metrics.replyCount,
      threadParticipantCount: metrics.participantCount,
      threadLastActivityAt: metrics.lastActivityAt,
    }
  })
}

export function appendVisibleThreadWindow<T extends ThreadProjectionRow>(
  window: VisibleThreadWindow<T>,
  batch: T[],
  limit: number,
  moderationState: ViewerModerationState | null,
): VisibleThreadWindow<T> {
  const page = [...window.page]
  let nextOffset = window.nextOffset

  for (const row of batch) {
    nextOffset += 1
    if (isRowHiddenForViewer(row, moderationState)) continue
    page.push(row)
    if (page.length >= limit + 1) break
  }

  return { page, nextOffset }
}

export function finalizeVisibleThreadWindow<T>(
  page: T[],
  nextOffset: number,
  limit: number,
  exhausted: boolean,
): { visiblePage: T[]; nextCursorOffset: number | null; hasMore: boolean } {
  const hasMore = page.length > limit || !exhausted
  return {
    visiblePage: hasMore ? page.slice(0, limit) : page,
    nextCursorOffset: hasMore ? nextOffset : null,
    hasMore,
  }
}
