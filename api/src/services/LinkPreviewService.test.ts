import { describe, expect, test } from 'bun:test'
import { sanitizeHttpUrl } from './LinkPreviewService'

describe('sanitizeHttpUrl', () => {
  test('accepts ordinary http(s) URLs', () => {
    expect(sanitizeHttpUrl('https://example.com/page')).toBe('https://example.com/page')
    expect(sanitizeHttpUrl('http://example.com/')).toBe('http://example.com/')
  })

  test('rejects empty / non-string / malformed input', () => {
    expect(() => sanitizeHttpUrl('')).toThrow()
    expect(() => sanitizeHttpUrl('   ')).toThrow()
    expect(() => sanitizeHttpUrl('not-a-url')).toThrow()
    // @ts-expect-error invalid type
    expect(() => sanitizeHttpUrl(undefined)).toThrow()
  })

  test('rejects non-http(s) schemes', () => {
    expect(() => sanitizeHttpUrl('javascript:alert(1)')).toThrow(/http\(s\)/)
    expect(() => sanitizeHttpUrl('file:///etc/passwd')).toThrow(/http\(s\)/)
    expect(() => sanitizeHttpUrl('ftp://example.com/')).toThrow(/http\(s\)/)
    expect(() => sanitizeHttpUrl('data:text/html,<script>')).toThrow(/http\(s\)/)
  })

  test('rejects URLs that contain credentials (userinfo phishing guard)', () => {
    expect(() => sanitizeHttpUrl('https://user:pass@example.com/')).toThrow(/credentials/)
    expect(() => sanitizeHttpUrl('https://attacker@example.com/')).toThrow(/credentials/)
  })

  test('rejects loopback / unspecified addresses', () => {
    expect(() => sanitizeHttpUrl('http://localhost/')).toThrow(/private|local/)
    expect(() => sanitizeHttpUrl('http://127.0.0.1/')).toThrow(/private|local/)
    expect(() => sanitizeHttpUrl('http://0.0.0.0/')).toThrow(/private|local/)
    expect(() => sanitizeHttpUrl('http://[::1]/')).toThrow(/private|local/)
    expect(() => sanitizeHttpUrl('http://[::]/')).toThrow(/private|local/)
  })

  test('rejects RFC 1918 private IPv4 ranges', () => {
    expect(() => sanitizeHttpUrl('http://10.0.0.1/')).toThrow(/private|local/)
    expect(() => sanitizeHttpUrl('http://172.16.0.1/')).toThrow(/private|local/)
    expect(() => sanitizeHttpUrl('http://172.31.255.255/')).toThrow(/private|local/)
    expect(() => sanitizeHttpUrl('http://192.168.1.1/')).toThrow(/private|local/)
    expect(() => sanitizeHttpUrl('http://169.254.169.254/')).toThrow(/private|local/) // AWS IMDS
  })

  test('rejects 0.0.0.0/8 and CGNAT 100.64/10', () => {
    expect(() => sanitizeHttpUrl('http://0.1.2.3/')).toThrow(/private|local/)
    expect(() => sanitizeHttpUrl('http://100.64.0.1/')).toThrow(/private|local/)
    expect(() => sanitizeHttpUrl('http://100.127.255.255/')).toThrow(/private|local/)
  })

  test('rejects IPv6 link-local / ULA / multicast', () => {
    expect(() => sanitizeHttpUrl('http://[fe80::1]/')).toThrow(/private|local/)
    expect(() => sanitizeHttpUrl('http://[fc00::1]/')).toThrow(/private|local/)
    expect(() => sanitizeHttpUrl('http://[fd12:3456::1]/')).toThrow(/private|local/)
    expect(() => sanitizeHttpUrl('http://[ff02::1]/')).toThrow(/private|local/)
  })

  test('rejects IPv4-mapped IPv6 addresses', () => {
    expect(() => sanitizeHttpUrl('http://[::ffff:127.0.0.1]/')).toThrow(/private|local/)
  })

  test('rejects decimal-encoded IP hostnames (numeric host bypass)', () => {
    // 2130706433 = 127.0.0.1, but the URL parser keeps it as the literal hostname.
    expect(() => sanitizeHttpUrl('http://2130706433/')).toThrow(/numeric|private|local/)
    expect(() => sanitizeHttpUrl('http://3232235521/')).toThrow(/numeric|private|local/) // 192.168.0.1
  })

  test('accepts public IPs and uncommon-but-public hostnames', () => {
    expect(sanitizeHttpUrl('https://8.8.8.8/')).toBe('https://8.8.8.8/')
    expect(sanitizeHttpUrl('https://203.0.114.1/')).toBe('https://203.0.114.1/') // 203.0.114 is public (113 is doc range, blocked)
  })
})
