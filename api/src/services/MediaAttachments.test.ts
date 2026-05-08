import { describe, expect, it } from 'bun:test'
import {
  chooseMediaType,
  hashPostRequest,
  isMediaAttachmentId,
  normalizeMediaAttachmentIds,
  normalizeIdempotencyKey,
  sanitizeAltText,
  sanitizeOriginalFilename,
  sniffMediaType,
} from './MediaAttachments'

describe('MediaAttachments helpers', () => {
  it('sniffs GIF bytes and rejects declared/sniffed mismatches', () => {
    const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00])

    expect(sniffMediaType(gif)).toBe('image/gif')
    expect(chooseMediaType('image/png', 'image/gif')).toBeNull()
    expect(chooseMediaType('image/gif', 'image/gif')).toBe('image/gif')
  })

  it('normalizes user-controlled text before persistence or publication', () => {
    expect(sanitizeAltText('  hello\n\tworld  ')).toBe('hello world')
    expect(sanitizeOriginalFilename('../avatar\u0000.png')).toBe('avatar.png')
  })

  it('keeps idempotency hashes stable for equivalent request objects', () => {
    const left = { content: 'hi', attachmentIds: ['b', 'a'], postType: 'note' }
    const right = { postType: 'note', attachmentIds: ['b', 'a'], content: 'hi' }

    expect(hashPostRequest(left)).toBe(hashPostRequest(right))
    expect(normalizeIdempotencyKey(' post-123 ')).toBe('post-123')
    expect(() => normalizeIdempotencyKey('bad key')).toThrow()
  })

  it('validates public media attachment ids before database lookups', () => {
    expect(isMediaAttachmentId('018f3f0b-7a21-7d09-8c28-0e37c15e6caa')).toBe(true)
    expect(isMediaAttachmentId('not-a-uuid')).toBe(false)
  })

  it('normalizes media attachment ids consistently for attach and retry paths', () => {
    expect(normalizeMediaAttachmentIds([
      ' 018f3f0b-7a21-7d09-8c28-0e37c15e6caa ',
      '018f3f0b-7a21-7d09-8c28-0e37c15e6caa',
      '',
    ])).toEqual(['018f3f0b-7a21-7d09-8c28-0e37c15e6caa'])
  })
})
