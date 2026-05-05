import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setLocale } from '@/i18n'

const { postMock } = vi.hoisted(() => ({
  postMock: vi.fn()
}))

vi.mock('ky', () => ({
  default: {
    post: postMock
  },
  HTTPError: class MockHTTPError extends Error {
    response: { status: number }

    constructor(status: number) {
      super(`HTTP ${status}`)
      this.response = { status }
    }
  }
}))

import { useFollow } from './useFollow'

describe('useFollow', () => {
  beforeEach(() => {
    localStorage.clear()
    setLocale('en')
    postMock.mockReset()
  })

  it('rejects non-https follow targets before making a request', async () => {
    localStorage.setItem('token', 'token-123')
    const { follow, followError, isFollowing } = useFollow()

    await expect(follow('javascript:alert(1)')).resolves.toBe(false)

    expect(postMock).not.toHaveBeenCalled()
    expect(isFollowing('javascript:alert(1)')).toBe(false)
    expect(followError.value).toBe('Choose a valid https:// ActivityPub URL to follow')
  })

  it('marks a resource as followed after a successful request', async () => {
    localStorage.setItem('token', 'token-123')
    postMock.mockResolvedValue({})
    const objectUri = 'https://remote.example/articles/1'
    const { follow, followError, isFollowing } = useFollow()

    await expect(follow(objectUri)).resolves.toBe(true)

    expect(postMock).toHaveBeenCalledTimes(1)
    expect(isFollowing(objectUri)).toBe(true)
    expect(followError.value).toBeNull()
  })
})
