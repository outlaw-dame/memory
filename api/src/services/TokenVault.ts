import { createCipheriv, createDecipheriv, createSecretKey, randomBytes } from 'node:crypto'

const TOKEN_PREFIX = 'enc:v1'
const KEY_ENV = 'MEMORY_TOKEN_ENCRYPTION_KEY'
const AAD = new TextEncoder().encode('memory-api:pod-token:v1')

function toBase64Url(value: Uint8Array): string {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function toBase64(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  return normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
}

function fromBase64Url(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(toBase64(value), 'base64'))
}

function decodeKey(raw: string): Uint8Array {
  const trimmed = raw.trim()
  const key = /^[0-9a-f]{64}$/i.test(trimmed)
    ? new Uint8Array(Buffer.from(trimmed, 'hex'))
    : fromBase64Url(trimmed)

  if (key.length !== 32) {
    throw new Error(`${KEY_ENV} must decode to exactly 32 bytes for AES-256-GCM`)
  }

  return key
}

function getEncryptionKey(): Uint8Array | null {
  const raw = process.env[KEY_ENV]
  if (!raw) return null
  return decodeKey(raw)
}

export function assertTokenVaultReadyForProduction(): void {
  if (process.env.NODE_ENV !== 'production') return
  if (!getEncryptionKey()) {
    throw new Error(`${KEY_ENV} is required to run Memory API in production`)
  }
}

export function canEncryptSecrets(): boolean {
  try {
    return getEncryptionKey() !== null
  } catch {
    return false
  }
}

export function isEncryptedSecret(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(`${TOKEN_PREFIX}:`)
}

export function shouldReencryptSecret(value: string | null | undefined): boolean {
  return !!value && !isEncryptedSecret(value) && canEncryptSecrets()
}

export function encryptToken(token: string | null | undefined): string | null {
  if (!token) return null
  if (isEncryptedSecret(token)) return token

  const key = getEncryptionKey()
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`${KEY_ENV} is required to store Pod tokens in production`)
    }
    return token
  }

  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', createSecretKey(key), new Uint8Array(iv))
  cipher.setAAD(AAD)
  const ciphertext = `${cipher.update(token, 'utf8', 'base64')}${cipher.final('base64')}`
  const tag = new Uint8Array(cipher.getAuthTag())

  return [
    TOKEN_PREFIX,
    toBase64Url(new Uint8Array(iv)),
    ciphertext.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, ''),
    toBase64Url(tag),
  ].join(':')
}

export function decryptToken(stored: string | null | undefined): string | null {
  if (!stored) return null
  if (!isEncryptedSecret(stored)) return stored

  const parts = stored.split(':')
  if (parts.length !== 5 || `${parts[0]}:${parts[1]}` !== TOKEN_PREFIX) {
    throw new Error('Invalid encrypted token format')
  }

  const key = getEncryptionKey()
  if (!key) {
    throw new Error(`${KEY_ENV} is required to decrypt stored Pod tokens`)
  }

  const [, , ivPart, ciphertextPart, tagPart] = parts
  const decipher = createDecipheriv('aes-256-gcm', createSecretKey(key), fromBase64Url(ivPart))
  decipher.setAAD(AAD)
  decipher.setAuthTag(fromBase64Url(tagPart))

  return `${decipher.update(toBase64(ciphertextPart), 'base64', 'utf8')}${decipher.final('utf8')}`
}
