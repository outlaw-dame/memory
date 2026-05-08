import Elysia from 'elysia'
import { signedIn } from './elysiaCompat'
import setupPlugin from './setup'
import ActivityPod from '../services/ActivityPod'
import { localeFromHeaders, translate } from '../i18n'
import {
  buildPrivateMediaSlug,
  chooseMediaType,
  cleanupExpiredMediaAttachments,
  createUploadingMediaAttachment,
  deleteOwnedUnattachedMediaAttachment,
  getOwnedMediaAttachment,
  isMediaAttachmentId,
  markMediaAttachmentFailed,
  markMediaAttachmentUploaded,
  normalizeMediaType,
  sanitizeAltText,
  sniffMediaType,
  SUPPORTED_ATTACHMENT_MEDIA_TYPES,
  toActivityPubMediaAttachment,
  toPublicMediaAttachment,
} from '../services/MediaAttachments'

const DEFAULT_MAX_UPLOAD_BYTES = 50 * 1024 * 1024
const MAX_UPLOAD_BYTES = parseUploadLimit(process.env.MEMORY_MEDIA_UPLOAD_MAX_BYTES)

const mediaUploadsPlugin = new Elysia({ name: 'media-uploads' })
  .use(setupPlugin)
  .post(
    '/media/uploads',
    async ({ request, set, user, headers }) => {
      const locale = localeFromHeaders(headers)
      const contentType = request.headers.get('content-type') || ''
      if (!contentType.toLowerCase().includes('multipart/form-data')) {
        set.status = 415
        return { error: translate(locale, 'media.upload.multipartRequired') }
      }

      let formData: FormData
      try {
        formData = await request.formData()
      } catch {
        set.status = 400
        return { error: translate(locale, 'media.upload.invalidBody') }
      }

      const file = formData.get('file')
      if (!(file instanceof File)) {
        set.status = 400
        return { error: translate(locale, 'media.upload.fileRequired') }
      }

      if (!user?.token) {
        set.status = 401
        return { error: translate(locale, 'common.mustBeSignedIn') }
      }

      if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
        set.status = 413
        return { error: translate(locale, 'media.upload.tooLarge') }
      }

      const bytes = await file.arrayBuffer()
      const declaredMediaType = normalizeMediaType(file.type)
      const sniffedMediaType = sniffMediaType(new Uint8Array(bytes))
      const mediaType = chooseMediaType(declaredMediaType, sniffedMediaType)
      if (!mediaType || !SUPPORTED_ATTACHMENT_MEDIA_TYPES.test(mediaType)) {
        set.status = 415
        return { error: translate(locale, 'media.upload.unsupportedType') }
      }

      await cleanupExpiredMediaAttachments(user.userId)

      const attachmentRow = await createUploadingMediaAttachment({
        userId: user.userId,
        mediaType,
        size: file.size,
        originalFilename: file.name,
        altText: sanitizeAltText(formData.get('altText')),
      })

      let uploaded: Awaited<ReturnType<typeof ActivityPod.uploadMedia>>
      try {
        const uploadFile = new File([bytes], file.name || 'media', { type: mediaType })
        uploaded = await ActivityPod.uploadMedia(user, uploadFile, buildPrivateMediaSlug(mediaType))
      } catch (error) {
        const upstreamStatus = getUpstreamStatus(error)
        console.error('[mediaUploads] ActivityPods media upload failed:', error)
        await markMediaAttachmentFailed(attachmentRow.id, 'POD_UPLOAD_FAILED', 'Could not upload media to the user pod')
        set.status = upstreamStatus === 401 || upstreamStatus === 403 ? 401 : 502
        return { error: translate(locale, 'media.upload.failed') }
      }

      const updatedAttachment = await markMediaAttachmentUploaded(attachmentRow.id, uploaded.url)
      const media = toPublicMediaAttachment(updatedAttachment)

      return {
        id: updatedAttachment.id,
        state: updatedAttachment.state,
        url: uploaded.url,
        mediaType: uploaded.mediaType,
        size: uploaded.size,
        media,
        attachment: {
          id: updatedAttachment.id,
          ...toActivityPubMediaAttachment(updatedAttachment),
          previewUrl: media.previewUrl || uploaded.url,
          state: updatedAttachment.state,
        },
      }
    },
    {
      detail: { description: 'Uploads image or video media into the signed-in user pod' },
      ...signedIn,
    }
  )
  .get(
    '/media/uploads/:id',
    async ({ params, set, user, headers }) => {
      const locale = localeFromHeaders(headers)
      if (!isMediaAttachmentId(params.id)) {
        set.status = 400
        return { error: translate(locale, 'media.attachments.invalid') }
      }
      await cleanupExpiredMediaAttachments(user.userId)
      const attachment = await getOwnedMediaAttachment(user.userId, params.id)
      if (!attachment) {
        set.status = 404
        return { error: translate(locale, 'media.attachments.notFound') }
      }
      return { media: toPublicMediaAttachment(attachment) }
    },
    {
      detail: { description: 'Returns upload lifecycle state for a media attachment' },
      ...signedIn,
    }
  )
  .delete(
    '/media/uploads/:id',
    async ({ params, set, user, headers }) => {
      const locale = localeFromHeaders(headers)
      if (!isMediaAttachmentId(params.id)) {
        set.status = 400
        return { error: translate(locale, 'media.attachments.invalid') }
      }
      const attachment = await deleteOwnedUnattachedMediaAttachment(user.userId, params.id)
      if (!attachment) {
        set.status = 404
        return { error: translate(locale, 'media.attachments.notFound') }
      }
      return { media: toPublicMediaAttachment(attachment) }
    },
    {
      detail: { description: 'Marks an unattached media upload deleted' },
      ...signedIn,
    }
  )

function parseUploadLimit(value: string | undefined): number {
  if (!value) return DEFAULT_MAX_UPLOAD_BYTES
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_UPLOAD_BYTES
}

function getUpstreamStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null
  const response = (error as { response?: { status?: unknown } }).response
  return typeof response?.status === 'number' ? response.status : null
}

export default mediaUploadsPlugin
