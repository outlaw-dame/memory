type CanonicalIntentEnvelope = {
  canonicalIntentId: string
  kind: string
  sourceProtocol: 'activitypub' | 'atproto'
  sourceEventId: string
  sourceAccountRef: {
    canonicalAccountId?: string | null
    did?: string | null
    activityPubActorUri?: string | null
    handle?: string | null
  }
  createdAt: string
  observedAt: string
  visibility: Record<string, unknown>
  provenance: {
    originProtocol: 'activitypub' | 'atproto'
    originEventId: string
    projectionMode: 'native' | 'mirrored'
  }
  warnings: Array<Record<string, unknown>>
  object?: Record<string, unknown>
  content?: Record<string, unknown>
}

type SigninResponse = { token: string }

type AtRecordResponse = {
  collection: string
  summary?: {
    text?: string | null
  }
  record?: {
    canonicalIntentId?: string
  }
  authorDid?: string
}

type FeedItem = {
  content: string
  authorName: string
  source: string
}

type SqlModule = {
  Pool: new (opts: { connectionString: string }) => {
    query: (text: string, values?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>
    end: () => Promise<void>
  }
}

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required env: ${name}`)
  }
  return value
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

async function postIngress(baseUrl: string, secret: string, payload: CanonicalIntentEnvelope): Promise<void> {
  const response = await fetch(`${baseUrl}/at/webhook/ingress`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-bridge-secret': secret,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Ingress post failed (${response.status}): ${body}`)
  }
}

async function signin(baseUrl: string, username: string, password: string, providerEndpoint: string): Promise<string> {
  const response = await fetch(`${baseUrl}/signin`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ username, password, providerEndpoint }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Signin failed (${response.status}): ${body}`)
  }

  const data = await response.json() as SigninResponse
  assert(typeof data.token === 'string' && data.token.length > 10, 'Signin token missing')
  return data.token
}

async function getAtRecords(baseUrl: string, token: string, searchText: string): Promise<AtRecordResponse[]> {
  const encoded = encodeURIComponent(searchText)
  const response = await fetch(`${baseUrl}/at/records?includeRaw=true&limit=100&search=${encoded}`, {
    headers: {
      auth: token,
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Fetch records failed (${response.status}): ${body}`)
  }

  return await response.json() as AtRecordResponse[]
}

async function getFeed(baseUrl: string, token: string): Promise<FeedItem[]> {
  const response = await fetch(`${baseUrl}/at/feed?limit=50&source=all&mode=chronological`, {
    headers: {
      auth: token,
    },
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Fetch feed failed (${response.status}): ${body}`)
  }

  return await response.json() as FeedItem[]
}

async function main(): Promise<void> {
  const memoryApiBaseUrl = requireEnv('MEMORY_API_BASE_URL', 'http://localhost:8794')
  const bridgeSecret = requireEnv('FIREHOSE_BRIDGE_SECRET', 'dev-local-bridge-secret-abc123')
  const useDbVerification = process.env.MEMORY_PROOF_DB_VERIFY === 'true'
  const username = process.env.MEMORY_TEST_USERNAME ?? 'testdev-local'
  const password = process.env.MEMORY_TEST_PASSWORD ?? 'Test1test'
  const providerEndpoint = process.env.MEMORY_TEST_PROVIDER_ENDPOINT ?? 'http://localhost:3000'

  const runId = `${Date.now()}`
  const sharedAliceAccount = 'acct:alice'
  const unifiedText = `Unified Alice canonical post ${runId}`

  const apIntentId = `intent-ap-alice-${runId}`
  const atIntentId = `intent-at-alice-${runId}`

  const apIntent: CanonicalIntentEnvelope = {
    canonicalIntentId: apIntentId,
    kind: 'PostCreate',
    sourceProtocol: 'activitypub',
    sourceEventId: `ap-event-${runId}`,
    sourceAccountRef: {
      canonicalAccountId: sharedAliceAccount,
      activityPubActorUri: 'https://example.com/users/alice',
      handle: 'alice@example.com',
    },
    createdAt: new Date().toISOString(),
    observedAt: new Date().toISOString(),
    visibility: { to: ['public'] },
    provenance: {
      originProtocol: 'activitypub',
      originEventId: `ap-origin-${runId}`,
      projectionMode: 'native',
    },
    warnings: [],
    object: {
      canonicalObjectId: `object-ap-${runId}`,
      activityPubObjectId: `https://example.com/notes/${runId}`,
      canonicalUrl: `https://example.com/notes/${runId}`,
    },
    content: {
      kind: 'note',
      plaintext: unifiedText,
      blocks: [],
      facets: [],
      attachments: [],
    },
  }

  const atIntent: CanonicalIntentEnvelope = {
    canonicalIntentId: atIntentId,
    kind: 'PostCreate',
    sourceProtocol: 'atproto',
    sourceEventId: `at-event-${runId}`,
    sourceAccountRef: {
      canonicalAccountId: sharedAliceAccount,
      did: 'did:plc:alice123',
      handle: 'alice.bsky.social',
    },
    createdAt: new Date().toISOString(),
    observedAt: new Date().toISOString(),
    visibility: { to: ['public'] },
    provenance: {
      originProtocol: 'atproto',
      originEventId: `at-origin-${runId}`,
      projectionMode: 'native',
    },
    warnings: [],
    object: {
      canonicalObjectId: `object-at-${runId}`,
      atUri: `at://did:plc:alice123/app.bsky.feed.post/${runId}`,
      cid: `bafy${runId}`,
    },
    content: {
      kind: 'note',
      plaintext: unifiedText,
      blocks: [],
      facets: [],
      attachments: [],
    },
  }

  await postIngress(memoryApiBaseUrl, bridgeSecret, apIntent)
  await postIngress(memoryApiBaseUrl, bridgeSecret, atIntent)

  if (useDbVerification) {
    const dbUrl = requireEnv('DB_URL')
    const { Pool } = await import('pg') as unknown as SqlModule
    const pool = new Pool({ connectionString: dbUrl })

    try {
      const recordsResult = await pool.query(
        `SELECT author_did, collection, record->>'canonicalIntentId' AS canonical_intent_id,
                record->'content'->>'plaintext' AS plaintext
           FROM at_records
          WHERE record->>'canonicalIntentId' = ANY($1::text[])`,
        [[apIntentId, atIntentId]],
      )

      const records = recordsResult.rows
      assert(records.length === 2, 'Expected 2 canonical records (AP + AT) in at_records')

      for (const row of records) {
        assert(row.author_did === sharedAliceAccount, 'Record author identity is not unified to canonical account')
        assert(row.plaintext === unifiedText, 'Canonical record plaintext mismatch')
      }

      const feedProjectionResult = await pool.query(
        `SELECT p.author_did, i.handle
           FROM at_posts p
      LEFT JOIN at_identities i ON i.did = p.author_did
          WHERE p.content = $1`,
        [unifiedText],
      )

      const feedRows = feedProjectionResult.rows
      assert(feedRows.length >= 2, 'Expected at least 2 feed projections (AP + AT) in at_posts')

      const uniqueAuthors = new Set(feedRows.map((row) => String(row.author_did)))
      const uniqueHandles = new Set(feedRows.map((row) => String(row.handle ?? '')))

      assert(uniqueAuthors.size === 1, 'Projected feed authors are not unified')
      assert(uniqueHandles.size === 1, 'Projected feed handles are not unified')
      assert([...uniqueHandles][0] === sharedAliceAccount, 'Unified display handle should be canonical account id')

      console.log('Canonical unified proof passed (DB verify mode)')
      console.log(`runId=${runId}`)
      console.log(`rows=${feedRows.length}`)
      console.log(`author=${[...uniqueAuthors][0]}`)
      return
    } finally {
      await pool.end()
    }
  }

  const token = await signin(memoryApiBaseUrl, username, password, providerEndpoint)
  const records = await getAtRecords(memoryApiBaseUrl, token, unifiedText)

  const apRecord = records.find(r => r.record?.canonicalIntentId === apIntentId)
  const atRecord = records.find(r => r.record?.canonicalIntentId === atIntentId)

  assert(apRecord, 'AP canonical post record not found')
  assert(atRecord, 'AT canonical post record not found')

  assert(apRecord.summary?.text === unifiedText, 'AP canonical summary text mismatch')
  assert(atRecord.summary?.text === unifiedText, 'AT canonical summary text mismatch')

  assert(apRecord.authorDid === sharedAliceAccount, 'AP canonical author identity not unified to canonical account')
  assert(atRecord.authorDid === sharedAliceAccount, 'AT canonical author identity not unified to canonical account')

  const feed = await getFeed(memoryApiBaseUrl, token)
  const unifiedEntries = feed.filter(item => item.content === unifiedText)
  assert(unifiedEntries.length >= 2, 'Unified feed entries for AP+AT canonical posts were not both projected')

  const unifiedAuthorNames = new Set(unifiedEntries.map(item => item.authorName))
  assert(unifiedAuthorNames.size === 1, 'Alice author name is not unified across AP and AT canonical posts')

  console.log('Canonical unified proof passed')
  console.log(`runId=${runId}`)
  console.log(`entries=${unifiedEntries.length}`)
  console.log(`author=${[...unifiedAuthorNames][0]}`)
}

main().catch((error) => {
  console.error('Canonical unified proof failed')
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
