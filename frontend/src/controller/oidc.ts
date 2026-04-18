import { buildApiHeaders, getApiBaseUrl } from '@/controller/http'
import type { SignInResponse } from '#api/types'

const TRANSACTION_STORAGE_KEY = 'memory.oidc.transaction'
const API_BASE_URL = getApiBaseUrl()

export const DEFAULT_PROVIDER_ENDPOINT = 'http://localhost:3000'

interface OidcMetadata {
  authorizationUrl: string
  clientId: string
}

interface OidcTransaction {
  state: string
  codeVerifier: string
  issuer: string
  providerEndpoint: string
  redirectUri: string
  clientId: string
}

export type OidcCallbackResult = SignInResponse

export async function beginOidcSignIn(providerEndpoint = DEFAULT_PROVIDER_ENDPOINT) {
  const redirectUri = getRedirectUri()
  const state = randomString()
  const codeVerifier = randomString()
  const codeChallenge = await sha256Base64Url(codeVerifier)
  const prepared = await prepareOidcLogin(providerEndpoint, redirectUri, state, codeChallenge)

  saveTransaction({
    state,
    codeVerifier,
    issuer: providerEndpoint,
    providerEndpoint,
    redirectUri,
    clientId: prepared.clientId
  })

  window.location.assign(prepared.authorizationUrl)
}

export async function finishOidcSignIn(search: string): Promise<OidcCallbackResult> {
  const params = new URLSearchParams(search)
  const code = params.get('code')
  const state = params.get('state')
  const error = params.get('error')
  const errorDescription = params.get('error_description')

  if (error) {
    throw new Error(errorDescription || error)
  }

  if (!code || !state) {
    throw new Error('Missing authorization response parameters')
  }

  const transaction = loadTransaction()
  clearTransaction()

  if (!transaction) {
    throw new Error('Missing OIDC transaction state')
  }

  if (transaction.state !== state) {
    throw new Error('Invalid OIDC state')
  }

  const session = await fetch(`${API_BASE_URL}/oidc-auth/callback`, {
    method: 'POST',
    headers: buildApiHeaders({ includeJsonContentType: true }),
    body: JSON.stringify({
      providerEndpoint: transaction.providerEndpoint,
      redirectUri: transaction.redirectUri,
      clientId: transaction.clientId,
      code,
      codeVerifier: transaction.codeVerifier
    })
  }).then(async response => {
    if (!response.ok) {
      throw new Error(await response.text())
    }

    return response.json() as Promise<SignInResponse>
  })

  return session
}

function getRedirectUri() {
  return new URL('/auth/callback', window.location.origin).toString()
}

async function prepareOidcLogin(
  providerEndpoint: string,
  redirectUri: string,
  state: string,
  codeChallenge: string
): Promise<OidcMetadata> {
  const response = await fetch(`${API_BASE_URL}/oidc-auth/callback`, {
    method: 'POST',
    headers: buildApiHeaders({ includeJsonContentType: true }),
    body: JSON.stringify({
      providerEndpoint,
      redirectUri,
      state,
      codeChallenge
    })
  })

  if (!response.ok) {
    throw new Error(await response.text())
  }

  return response.json()
}

function saveTransaction(transaction: OidcTransaction) {
  sessionStorage.setItem(TRANSACTION_STORAGE_KEY, JSON.stringify(transaction))
}

function loadTransaction(): OidcTransaction | null {
  const raw = sessionStorage.getItem(TRANSACTION_STORAGE_KEY)
  if (!raw) {
    return null
  }

  return JSON.parse(raw) as OidcTransaction
}

function clearTransaction() {
  sessionStorage.removeItem(TRANSACTION_STORAGE_KEY)
}

function randomString() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return base64UrlEncode(bytes)
}

async function sha256Base64Url(input: string) {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return base64UrlEncode(new Uint8Array(digest))
}

function base64UrlEncode(bytes: Uint8Array) {
  const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('')
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}
