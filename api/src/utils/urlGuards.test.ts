import { describe, expect, test } from 'bun:test'
import {
  sanitizeHttpUrl,
  isPublicHttpUrl,
  isBlockedIpv4Literal,
  isBlockedIpv6Literal,
  UrlGuardError,
} from './urlGuards'

describe('urlGuards', () => {
  test('sanitizeHttpUrl accepts public http(s) URLs', () => {
    expect(sanitizeHttpUrl('https://example.com/page')).toBe('https://example.com/page')
    expect(sanitizeHttpUrl('http://203.0.114.1/')).toBe('http://203.0.114.1/')
  })

  test('sanitizeHttpUrl throws UrlGuardError with code', () => {
    try {
      sanitizeHttpUrl('javascript:alert(1)')
      throw new Error('expected throw')
    } catch (e) {
      expect(e).toBeInstanceOf(UrlGuardError)
      expect((e as UrlGuardError).code).toBe('scheme')
    }
  })

  test('isBlockedIpv4Literal covers private + reserved ranges', () => {
    expect(isBlockedIpv4Literal('10.0.0.1')).toBe(true)
    expect(isBlockedIpv4Literal('127.0.0.1')).toBe(true)
    expect(isBlockedIpv4Literal('169.254.169.254')).toBe(true)
    expect(isBlockedIpv4Literal('172.16.0.1')).toBe(true)
    expect(isBlockedIpv4Literal('192.168.0.1')).toBe(true)
    expect(isBlockedIpv4Literal('100.64.0.1')).toBe(true)
    expect(isBlockedIpv4Literal('203.0.113.5')).toBe(true) // doc range
    expect(isBlockedIpv4Literal('224.0.0.1')).toBe(true) // multicast
    expect(isBlockedIpv4Literal('8.8.8.8')).toBe(false)
    expect(isBlockedIpv4Literal('1.1.1.1')).toBe(false)
  })

  test('isBlockedIpv6Literal covers loopback / ULA / link-local / multicast', () => {
    expect(isBlockedIpv6Literal('::1')).toBe(true)
    expect(isBlockedIpv6Literal('::')).toBe(true)
    expect(isBlockedIpv6Literal('fe80::1')).toBe(true)
    expect(isBlockedIpv6Literal('fc00::1')).toBe(true)
    expect(isBlockedIpv6Literal('fd12:3456::1')).toBe(true)
    expect(isBlockedIpv6Literal('ff02::1')).toBe(true)
    expect(isBlockedIpv6Literal('::ffff:127.0.0.1')).toBe(true)
    expect(isBlockedIpv6Literal('2606:4700::1111')).toBe(false) // public Cloudflare
    expect(isBlockedIpv6Literal('2001:db8::1')).toBe(false) // doc range, conservatively allow at literal level
    expect(isBlockedIpv6Literal('not-an-ipv6')).toBe(false) // non-IPv6 strings
  })

  test('isPublicHttpUrl behaves as a predicate (no throw)', () => {
    expect(isPublicHttpUrl('https://example.com/')).toBe(true)
    expect(isPublicHttpUrl('http://10.0.0.1/')).toBe(false)
    expect(isPublicHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isPublicHttpUrl(undefined)).toBe(false)
    expect(isPublicHttpUrl(42)).toBe(false)
    expect(isPublicHttpUrl('')).toBe(false)
  })
})
