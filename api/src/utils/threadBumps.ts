export interface ThreadBumpFeedItem {
  id: number
  source: 'activitypods' | 'atproto'
  authorWebId: string
  atUri: string | null
  objectUri: string | null
}

export interface ThreadBumpMeta {
  replyParentUri: string | null
  replyRootUri: string | null
}

function feedItemKey(item: ThreadBumpFeedItem): string {
  return item.atUri ?? item.objectUri ?? `${item.source}:${item.id}`
}

export function applyFollowedReplyThreadBumps<T extends ThreadBumpFeedItem>(
  items: T[],
  followedAuthorIds: ReadonlySet<string>,
  metaByItemId: ReadonlyMap<number, ThreadBumpMeta>,
  anchorByUri: ReadonlyMap<string, T>,
): T[] {
  if (items.length === 0 || followedAuthorIds.size === 0 || metaByItemId.size === 0) {
    return items
  }

  const replaced = items.map(item => {
    if (!followedAuthorIds.has(item.authorWebId)) return item

    const meta = metaByItemId.get(item.id)
    if (!meta) return item

    const anchorUri = meta.replyRootUri ?? meta.replyParentUri
    if (!anchorUri) return item

    const currentUri = item.atUri ?? item.objectUri
    if (currentUri === anchorUri) return item

    return anchorByUri.get(anchorUri) ?? item
  })

  const deduped: T[] = []
  const seen = new Set<string>()

  for (const item of replaced) {
    const key = feedItemKey(item)
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(item)
  }

  return deduped
}