import { afterEach, describe, expect, it } from 'bun:test'
import { randomBytes } from 'node:crypto'
import {
  decryptToken,
  encryptToken,
  isEncryptedSecret,
  shouldReencryptSecret,
} from './TokenVault'

const originalKey = process.env.MEMORY_TOKEN_ENCRYPTION_KEY
const originalNodeEnv = process.env.NODE_ENV

afterEach(() => {
  if (originalKey === undefined) {
    delete process.env.MEMORY_TOKEN_ENCRYPTION_KEY
  } else {
    process.env.MEMORY_TOKEN_ENCRYPTION_KEY = originalKey
  }
  process.env.NODE_ENV = originalNodeEnv
})

describe('TokenVault', () => {
  it('encrypts and decrypts Pod tokens with AES-GCM', () => {
    process.env.MEMORY_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('base64url')

    const encrypted = encryptToken('pod-secret-token')

    expect(typeof encrypted).toBe('string')
    expect(encrypted).not.toBe('pod-secret-token')
    expect(isEncryptedSecret(encrypted)).toBe(true)
    expect(decryptToken(encrypted)).toBe('pod-secret-token')
  })

  it('keeps legacy dev tokens readable and marks them for self-healing when a key exists', () => {
    process.env.NODE_ENV = 'development'
    process.env.MEMORY_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('base64url')

    expect(decryptToken('legacy-token')).toBe('legacy-token')
    expect(shouldReencryptSecret('legacy-token')).toBe(true)
  })

  it('refuses to store plaintext Pod tokens in production', () => {
    process.env.NODE_ENV = 'production'
    delete process.env.MEMORY_TOKEN_ENCRYPTION_KEY

    expect(() => encryptToken('pod-secret-token')).toThrow(/MEMORY_TOKEN_ENCRYPTION_KEY/)
  })
})
