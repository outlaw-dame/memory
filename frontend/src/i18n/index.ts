import { computed, ref } from 'vue'
import { messages, type SupportedLocale } from './messages'

const STORAGE_KEY = 'memory.locale'
const supportedLocales = Object.keys(messages) as SupportedLocale[]
const defaultLocale: SupportedLocale = 'en'
const locale = ref<SupportedLocale>(resolveInitialLocale())

function syncDocumentLocale(nextLocale: SupportedLocale) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = nextLocale
}

function normalizeLocale(raw: string | null | undefined): SupportedLocale {
  if (!raw) return defaultLocale

  const directMatch = supportedLocales.find(locale => locale === raw)
  if (directMatch) return directMatch

  const languageMatch = supportedLocales.find(locale => raw.toLowerCase().startsWith(`${locale.toLowerCase()}-`))
  if (languageMatch) return languageMatch

  return defaultLocale
}

function resolveInitialLocale(): SupportedLocale {
  if (typeof window === 'undefined') {
    return defaultLocale
  }

  const stored = normalizeLocale(window.localStorage.getItem(STORAGE_KEY))
  if (window.localStorage.getItem(STORAGE_KEY)) {
    syncDocumentLocale(stored)
    return stored
  }

  const browserLocales = navigator.languages.length > 0 ? navigator.languages : [navigator.language]
  const resolved = browserLocales.map(normalizeLocale).find(Boolean) ?? defaultLocale
  syncDocumentLocale(resolved)
  return resolved
}

function getTemplate(targetLocale: SupportedLocale, key: string): string {
  const localeMessages = messages[targetLocale] as Record<string, string>
  const fallbackMessages = messages[defaultLocale] as Record<string, string>
  return localeMessages[key] ?? fallbackMessages[key] ?? key
}

function interpolate(template: string, params: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (_, token: string) => String(params[token] ?? `{${token}}`))
}

export function initializeLocale() {
  syncDocumentLocale(locale.value)
}

export function setLocale(nextLocale: string) {
  const normalized = normalizeLocale(nextLocale)
  locale.value = normalized
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, normalized)
  }
  syncDocumentLocale(normalized)
}

export function getLocale() {
  return locale.value
}

export function t(key: string, params?: Record<string, string | number>, targetLocale: SupportedLocale = locale.value) {
  return interpolate(getTemplate(targetLocale, key), params)
}

export function formatDateTime(
  value: string | number | Date,
  options?: Intl.DateTimeFormatOptions,
  targetLocale: SupportedLocale = locale.value
): string {
  const date = value instanceof Date ? value : new Date(value)
  return new Intl.DateTimeFormat(targetLocale, options).format(date)
}

export function formatRelativeTime(
  value: string | number | Date,
  targetLocale: SupportedLocale = locale.value
): string {
  const date = value instanceof Date ? value : new Date(value)
  const diffMs = date.getTime() - Date.now()
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  const week = 7 * day
  const rtf = new Intl.RelativeTimeFormat(targetLocale, { numeric: 'auto' })

  if (Math.abs(diffMs) < minute) {
    return rtf.format(0, 'second')
  }
  if (Math.abs(diffMs) < hour) {
    return rtf.format(Math.round(diffMs / minute), 'minute')
  }
  if (Math.abs(diffMs) < day) {
    return rtf.format(Math.round(diffMs / hour), 'hour')
  }
  if (Math.abs(diffMs) < week) {
    return rtf.format(Math.round(diffMs / day), 'day')
  }

  return formatDateTime(date, { dateStyle: 'medium' }, targetLocale)
}

export function useI18n() {
  return {
    locale: computed(() => locale.value),
    availableLocales: supportedLocales,
    t,
    setLocale,
    formatDateTime,
    formatRelativeTime,
  }
}
