import type { App } from '#api/index.ts'
import type { viablePodProviders } from '#api/types'
import type { Static } from '@sinclair/typebox'

export type ProviderEndpoints = Static<typeof viablePodProviders>

export type { App }
