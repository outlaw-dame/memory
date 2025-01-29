import { t } from 'elysia'

export const vibaleProviderNames = ['memory.']

export enum ViablePodProvider {
  'memory.' = 'memory.'
}

export const podProviderEndpoint: { [key in ViablePodProvider]: string } = {
  'memory.': 'http://localhost:3000'
}

export const viablePodProviders = t.Enum(ViablePodProvider)
