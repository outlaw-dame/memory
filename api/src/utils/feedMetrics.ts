function toNonNegativeInteger(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value))
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed)) return Math.max(0, parsed)
  }

  return 0
}

export function mapFeedMetricCounts(row: Record<string, unknown>): { likeCount: number; quoteCount: number } {
  return {
    likeCount: toNonNegativeInteger(row.like_count),
    quoteCount: toNonNegativeInteger(row.quote_count),
  }
}
