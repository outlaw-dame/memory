export const supportedLocales = ['en', 'es'] as const

export type ApiLocale = (typeof supportedLocales)[number]
export type HeaderBag = Record<string, string | string[] | undefined>

const defaultLocale: ApiLocale = 'en'

const messages: Record<ApiLocale, Record<string, string>> = {
  en: {
    'common.mustBeSignedIn': 'You must be signed in to do that',
    'media.upload.multipartRequired': 'Media uploads must use multipart form data',
    'media.upload.invalidBody': 'Could not read the uploaded media',
    'media.upload.fileRequired': 'Choose an image or video file to upload',
    'media.upload.tooLarge': 'That media file is too large',
    'media.upload.unsupportedType': 'That media type is not supported',
    'media.upload.failed': 'Could not upload media to your pod',
    'media.attachments.tooMany': 'You can attach up to 8 media files',
    'media.attachments.invalid': 'One of those media attachments is invalid',
    'media.attachments.notFound': 'Media attachment not found',
    'media.attachments.notAttachable': 'That media attachment is not ready to post',
    'common.userNotFound': 'User not found',
    'auth.alreadyLoggedIn': "You're already logged in",
    'auth.endpointBadStatus': "Endpoint didn't respond with a 200 status code",
    'auth.endpointNoToken': 'Endpoint did not return a token',
    'auth.userCheckFailed': 'Error while checking user',
    'auth.loggedOut': 'You have been logged out',
    'auth.providerNoToken': 'Provider did not return a token',
    'auth.providerError': 'Error with the provider',
    'oidc.missingPrepareParams': 'Missing OIDC prepare parameters',
    'oidc.unableToPrepare': 'Unable to prepare OIDC login',
    'oidc.missingCallbackParams': 'Missing OIDC callback parameters',
    'oidc.unusableAccessToken': 'OIDC provider did not return a usable access token',
    'oidc.unableToComplete': 'Unable to complete OIDC login',
    'profile.fetchFailed': 'Pod server profile request failed',
    'profile.actorMustBeObject': 'actor must be an object',
    'profile.currentFetchFailed': 'Unable to load the current profile before updating it',
    'profile.updateFailed': 'Pod server profile update failed',
    'profile.statusMustBeObject': 'status must be an object',
    'profile.statusContentRequired': 'status content is required',
    'profile.statusContentTooLong': 'status content must be 100 characters or fewer',
    'profile.statusEndTimeInvalid': 'status endTime must be a valid date-time',
    'profile.statusEndTimePast': 'status endTime must be in the future',
    'profile.statusAttachmentInvalid': 'status attachment must be a supported link object',
    'profile.statusAttachmentUrlInvalid': 'status attachment link must be an absolute http(s) URL',
    'profile.attributionDomainsInvalid': 'author attribution domains must be valid domains or http(s) URLs',
    'profile.attributionDomainsTooMany': 'author attribution supports at most 10 domains',
    'profile.discoveryIndexableInvalid': 'indexable must be a boolean value',
    'profile.discoveryNoindexInvalid': 'noindex must be a boolean value',
    'profile.discoveryDiscoverableInvalid': 'discoverable must be a boolean value',
    'profile.discoveryFlagsConflict': 'indexable and noindex values conflict',
    'follow.failed': 'Pod server follow request failed',
    'follow.objectUriHttps': 'objectUri must be an absolute https:// URL',
    'follow.resolveFailed': 'Pod server follow target resolution request failed',
    'reply.objectUriHttps': 'objectUri must be an absolute https:// URL',
    'reply.contentEmpty': 'Reply content must not be empty',
    'reply.resolveFailed': 'Pod server reply policy request failed',
    'reply.submitFailed': 'Pod server reply request failed',
    'metadata.actorUriHttps': 'actorUri must be an absolute https:// URL',
    'metadata.hrefHttps': 'href must be an absolute https:// URL',
    'metadata.verifyActorFailed': 'Pod server actor metadata verification request failed',
    'metadata.verifyRelMeFailed': 'Pod server rel=me verification request failed',
    'notifications.fetchStatusFailed': 'Unable to fetch ActivityPods app status',
    'notifications.upgradeRequired': 'Pod requires application authorization upgrade before webhook activation',
    'notifications.bootstrapFailed': 'Unable to bootstrap ActivityPods notifications',
    'notifications.listFailed': 'Unable to list notifications',
    'activitypods.webhooks.invalidUserId': 'Invalid user id',
    'activitypods.webhooks.unknownTargetUser': 'Unknown webhook target user',
    'activitypods.webhooks.unauthorized': 'Unauthorized',
    'activitypods.webhooks.payloadTooLarge': 'Payload too large',
    'activitypods.webhooks.invalidPayload': 'Invalid notification payload',
    'posts.createFailed': 'Error while creating the post',
    'posts.contentOrAttachmentRequired': 'Add text or media before posting',
    'posts.idempotencyKeyInvalid': 'That idempotency key is not valid',
    'posts.idempotencyKeyConflict': 'That idempotency key was already used for a different post',
    'conversations.noMessagesYet': 'No messages yet',
    'conversations.unknown': 'Unknown',
    'conversations.fetchListFailed': 'Failed to fetch conversations',
    'conversations.notFound': 'Conversation not found',
    'conversations.fetchFailed': 'Failed to fetch conversation',
    'conversations.createFailed': 'Failed to create conversation',
    'conversations.notMember': 'Not a member of this conversation',
    'conversations.sendFailed': 'Failed to send message',
  },
  es: {
    'common.mustBeSignedIn': 'Debes iniciar sesión para hacer eso',
    'media.upload.multipartRequired': 'Las subidas de medios deben usar datos de formulario multipart',
    'media.upload.invalidBody': 'No se pudo leer el archivo multimedia subido',
    'media.upload.fileRequired': 'Elige una imagen o video para subir',
    'media.upload.tooLarge': 'Ese archivo multimedia es demasiado grande',
    'media.upload.unsupportedType': 'Ese tipo de medio no es compatible',
    'media.upload.failed': 'No se pudo subir el contenido multimedia a tu pod',
    'media.attachments.tooMany': 'Puedes adjuntar hasta 8 archivos multimedia',
    'media.attachments.invalid': 'Uno de esos adjuntos multimedia no es válido',
    'media.attachments.notFound': 'No se encontró el adjunto multimedia',
    'media.attachments.notAttachable': 'Ese adjunto multimedia no está listo para publicarse',
    'common.userNotFound': 'Usuario no encontrado',
    'auth.alreadyLoggedIn': 'Ya has iniciado sesión',
    'auth.endpointBadStatus': 'El endpoint no respondió con un código 200',
    'auth.endpointNoToken': 'El endpoint no devolvió un token',
    'auth.userCheckFailed': 'Se produjo un error al comprobar el usuario',
    'auth.loggedOut': 'Se cerró tu sesión',
    'auth.providerNoToken': 'El proveedor no devolvió un token',
    'auth.providerError': 'Se produjo un error con el proveedor',
    'oidc.missingPrepareParams': 'Faltan parámetros para preparar OIDC',
    'oidc.unableToPrepare': 'No se pudo preparar el inicio de sesión OIDC',
    'oidc.missingCallbackParams': 'Faltan parámetros del callback OIDC',
    'oidc.unusableAccessToken': 'El proveedor OIDC no devolvió un token de acceso utilizable',
    'oidc.unableToComplete': 'No se pudo completar el inicio de sesión OIDC',
    'profile.fetchFailed': 'Falló la solicitud del perfil al servidor del pod',
    'profile.actorMustBeObject': 'actor debe ser un objeto',
    'profile.currentFetchFailed': 'No se pudo cargar el perfil actual antes de actualizarlo',
    'profile.updateFailed': 'Falló la actualización del perfil en el servidor del pod',
    'profile.statusMustBeObject': 'status debe ser un objeto',
    'profile.statusContentRequired': 'el contenido del estado es obligatorio',
    'profile.statusContentTooLong': 'el contenido del estado debe tener 100 caracteres o menos',
    'profile.statusEndTimeInvalid': 'status endTime debe ser una fecha y hora válidas',
    'profile.statusEndTimePast': 'status endTime debe estar en el futuro',
    'profile.statusAttachmentInvalid': 'el adjunto del estado debe ser un enlace compatible',
    'profile.statusAttachmentUrlInvalid': 'el enlace adjunto del estado debe ser una URL http(s) absoluta',
    'profile.attributionDomainsInvalid': 'los dominios de atribución del autor deben ser dominios válidos o URL http(s)',
    'profile.attributionDomainsTooMany': 'la atribución de autor admite como máximo 10 dominios',
    'profile.discoveryIndexableInvalid': 'indexable debe ser un valor booleano',
    'profile.discoveryNoindexInvalid': 'noindex debe ser un valor booleano',
    'profile.discoveryDiscoverableInvalid': 'discoverable debe ser un valor booleano',
    'profile.discoveryFlagsConflict': 'los valores de indexable y noindex entran en conflicto',
    'follow.failed': 'Falló la solicitud de seguimiento al servidor del pod',
    'follow.objectUriHttps': 'objectUri debe ser una URL absoluta https://',
    'follow.resolveFailed': 'Falló la solicitud de resolución del objetivo de seguimiento al servidor del pod',
    'reply.objectUriHttps': 'objectUri debe ser una URL absoluta https://',
    'reply.contentEmpty': 'El contenido de la respuesta no puede estar vacío',
    'reply.resolveFailed': 'Falló la solicitud de política de respuesta al servidor del pod',
    'reply.submitFailed': 'Falló el envío de la respuesta al servidor del pod',
    'metadata.actorUriHttps': 'actorUri debe ser una URL absoluta https://',
    'metadata.hrefHttps': 'href debe ser una URL absoluta https://',
    'metadata.verifyActorFailed': 'Falló la solicitud de verificación de metadatos del actor al servidor del pod',
    'metadata.verifyRelMeFailed': 'Falló la solicitud de verificación rel=me al servidor del pod',
    'notifications.fetchStatusFailed': 'No se pudo obtener el estado de la app ActivityPods',
    'notifications.upgradeRequired': 'El pod requiere una actualización de autorización antes de activar el webhook',
    'notifications.bootstrapFailed': 'No se pudieron preparar las notificaciones de ActivityPods',
    'notifications.listFailed': 'No se pudieron listar las notificaciones',
    'activitypods.webhooks.invalidUserId': 'Id de usuario no válido',
    'activitypods.webhooks.unknownTargetUser': 'Usuario de destino del webhook desconocido',
    'activitypods.webhooks.unauthorized': 'No autorizado',
    'activitypods.webhooks.payloadTooLarge': 'La carga útil es demasiado grande',
    'activitypods.webhooks.invalidPayload': 'La carga útil de la notificación no es válida',
    'posts.createFailed': 'Se produjo un error al crear la publicación',
    'posts.contentOrAttachmentRequired': 'Agrega texto o contenido multimedia antes de publicar',
    'posts.idempotencyKeyInvalid': 'Esa clave de idempotencia no es válida',
    'posts.idempotencyKeyConflict': 'Esa clave de idempotencia ya se usó para otra publicación',
    'conversations.noMessagesYet': 'Todavía no hay mensajes',
    'conversations.unknown': 'Desconocido',
    'conversations.fetchListFailed': 'No se pudieron obtener las conversaciones',
    'conversations.notFound': 'No se encontró la conversación',
    'conversations.fetchFailed': 'No se pudo obtener la conversación',
    'conversations.createFailed': 'No se pudo crear la conversación',
    'conversations.notMember': 'No eres miembro de esta conversación',
    'conversations.sendFailed': 'No se pudo enviar el mensaje',
  },
}

export function resolveLocale(headerValue: string | null | undefined): ApiLocale {
  if (!headerValue) return defaultLocale

  const candidates = headerValue
    .split(',')
    .map(part => part.trim().split(';')[0]?.toLowerCase())
    .filter(Boolean)

  for (const candidate of candidates) {
    const direct = supportedLocales.find(locale => locale === candidate)
    if (direct) return direct

    const prefix = supportedLocales.find(locale => candidate?.startsWith(`${locale}-`))
    if (prefix) return prefix
  }

  return defaultLocale
}

export function translate(locale: ApiLocale, key: string, params?: Record<string, string | number>): string {
  const template = messages[locale][key] ?? messages[defaultLocale][key] ?? key
  return template.replace(/\{(\w+)\}/g, (_, token: string) => String(params?.[token] ?? `{${token}}`))
}

export function appendVaryHeader(current: string | undefined, value: string): string {
  const items = new Set(
    String(current || '')
      .split(',')
      .map(item => item.trim())
      .filter(Boolean),
  )
  items.add(value)
  return Array.from(items).join(', ')
}

export function localeFromHeaders(headers: HeaderBag): ApiLocale {
  const acceptLanguage = headers['accept-language']
  const normalized = Array.isArray(acceptLanguage) ? acceptLanguage.join(',') : acceptLanguage
  return resolveLocale(normalized)
}

export function applyLocaleHeaders(set: { headers: Record<string, string | number | undefined> }, locale: ApiLocale): void {
  set.headers['content-language'] = locale
  set.headers.vary = appendVaryHeader(typeof set.headers.vary === 'string' ? set.headers.vary : undefined, 'Accept-Language')
}

export function localizedMessage(headers: HeaderBag, key: string, params?: Record<string, string | number>): string {
  return translate(localeFromHeaders(headers), key, params)
}

export function formatRelativeTime(date: Date, locale: ApiLocale): string {
  const diffMs = date.getTime() - Date.now()
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  const week = 7 * day
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })

  if (Math.abs(diffMs) < minute) return rtf.format(0, 'second')
  if (Math.abs(diffMs) < hour) return rtf.format(Math.round(diffMs / minute), 'minute')
  if (Math.abs(diffMs) < day) return rtf.format(Math.round(diffMs / hour), 'hour')
  if (Math.abs(diffMs) < week) return rtf.format(Math.round(diffMs / day), 'day')

  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date)
}
