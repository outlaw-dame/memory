import { describe, expect, it } from 'bun:test'
import { mapFeedMetricCounts } from './feedMetrics'

describe('feed metric mapping', () => {
  it('maps integer counts from feed rows', () => {
    const mapped = mapFeedMetricCounts({
      like_count: 9,
      quote_count: 3,
    })

    expect(mapped).toEqual({
      likeCount: 9,
      quoteCount: 3,
    })
  })

  it('normalizes missing and invalid values to zero', () => {
    const mapped = mapFeedMetricCounts({
      like_count: null,
      quote_count: 'not-a-number',
    })

    expect(mapped).toEqual({
      likeCount: 0,
      quoteCount: 0,
    })
  })

  it('parses string numerics and clamps negatives', () => {
    const mapped = mapFeedMetricCounts({
      like_count: '14',
      quote_count: -5,
    })

    expect(mapped).toEqual({
      likeCount: 14,
      quoteCount: 0,
    })
  })
})
