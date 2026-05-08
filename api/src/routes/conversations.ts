import Elysia, { t } from 'elysia'
import { signedIn, signedInGuard } from './elysiaCompat'
import { conversations, conversationMembers, messages, users } from '../db/schema'
import { db } from '../db/client'
import setupPlugin from './setup'
import { eq, and, desc, ne } from 'drizzle-orm'
import { formatRelativeTime, localeFromHeaders, translate, type ApiLocale } from '../i18n'

export interface ConversationPreview {
  id: number
  type: 'dm' | 'group'
  name: string
  preview: string
  lastActivity: string | null
  unreadCount: number
  otherUserName?: string
  otherUserWebId?: string
}

const conversationsRoutes = new Elysia({ name: 'conversations' })
  .use(setupPlugin)
  .guard(signedInGuard)
  .get(
    '/conversations',
    async ({ user, headers }) => {
      const locale = localeFromHeaders(headers)
      try {
        // Fetch conversations for the user
        const convs = await db
          .select({
            id: conversations.id,
            type: conversations.type,
            name: conversations.name,
            createdAt: conversations.createdAt,
            updatedAt: conversations.updatedAt,
          })
          .from(conversations)
          .where(eq(conversations.userId, user.userId))
          .orderBy(desc(conversations.updatedAt))

        // For each conversation, get the latest message and unread count
        const result: ConversationPreview[] = await Promise.all(
          convs.map(async (conv) => {
            // Get latest message
            const [latestMsg] = await db
              .select({
                content: messages.content,
                senderName: users.name,
                createdAt: messages.createdAt,
              })
              .from(messages)
              .innerJoin(users, eq(messages.senderId, users.id))
              .where(eq(messages.conversationId, conv.id))
              .orderBy(desc(messages.createdAt))
              .limit(1)

            // Get other user info for DM
            let otherUserName: string | undefined
            let otherUserWebId: string | undefined
            if (conv.type === 'dm') {
              const [otherUser] = await db
                .select({ name: users.name, webId: users.webId })
                .from(conversationMembers)
                .innerJoin(users, eq(conversationMembers.userId, users.id))
                .where(
                  and(
                    eq(conversationMembers.conversationId, conv.id),
                    ne(users.id, user.userId)
                  )
                )

              if (otherUser) {
                otherUserName = otherUser.name
                otherUserWebId = otherUser.webId
              }
            }

            const preview = latestMsg?.content || translate(locale, 'conversations.noMessagesYet')
            const lastActivityDate = latestMsg?.createdAt
            const lastActivity = lastActivityDate
              ? getRelativeTime(new Date(lastActivityDate), locale)
              : ''

            return {
              id: conv.id,
              type: conv.type,
              name: conv.name || otherUserName || translate(locale, 'conversations.unknown'),
              preview,
              lastActivity,
              unreadCount: 0, // TODO: implement unread tracking
              otherUserName,
              otherUserWebId,
            }
          })
        )

        return result
      } catch (e) {
        console.error('Error fetching conversations:', e)
        throw new Error(translate(locale, 'conversations.fetchListFailed'))
      }
    },
    {
      detail: { description: 'Get all conversations for the current user' },
      ...signedIn,
      response: {
        200: t.Array(t.Any()),
      },
    }
  )
  .get(
    '/conversations/:id',
    async ({ params: { id }, user, headers, status }) => {
      const locale = localeFromHeaders(headers)
      try {
        const conv = await db
          .select()
          .from(conversations)
          .where(eq(conversations.id, parseInt(id)))
          .limit(1)

        if (!conv.length || conv[0].userId !== user.userId) {
          return status(404, translate(locale, 'conversations.notFound'))
        }

        const msgs = await db
          .select({
            id: messages.id,
            senderId: messages.senderId,
            senderName: users.name,
            content: messages.content,
            createdAt: messages.createdAt,
          })
          .from(messages)
          .innerJoin(users, eq(messages.senderId, users.id))
          .where(eq(messages.conversationId, parseInt(id)))
          .orderBy(messages.createdAt)

        return { conversation: conv[0], messages: msgs }
      } catch (e) {
        console.error('Error fetching conversation:', e)
        return status(500, translate(locale, 'conversations.fetchFailed'))
      }
    },
    {
      detail: { description: 'Get a specific conversation with all messages' },
      ...signedIn,
    }
  )
  .post(
    '/conversations',
    async ({ body, user, headers, status }) => {
      const locale = localeFromHeaders(headers)
      const { type, name, memberIds } = body as {
        type: 'dm' | 'group'
        name?: string
        memberIds: number[]
      }

      try {
        // Create conversation
        const [newConv] = await db
          .insert(conversations)
          .values({
            userId: user.userId,
            type,
            name: name || null,
          })
          .returning()

        // Add members (including the creator)
        const allMembers = [...new Set([user.userId, ...memberIds])]
        await db.insert(conversationMembers).values(
          allMembers.map((uid) => ({
            conversationId: newConv.id,
            userId: uid,
          }))
        )

        return newConv
      } catch (e) {
        console.error('Error creating conversation:', e)
        return status(500, translate(locale, 'conversations.createFailed'))
      }
    },
    {
      body: t.Object({
        type: t.Union([t.Literal('dm'), t.Literal('group')]),
        name: t.Optional(t.String()),
        memberIds: t.Array(t.Number()),
      }),
      detail: { description: 'Create a new conversation' },
      ...signedIn,
    }
  )
  .post(
    '/conversations/:id/messages',
    async ({ params: { id }, body, user, headers, status }) => {
      const locale = localeFromHeaders(headers)
      const { content } = body as { content: string }

      try {
        const convId = parseInt(id)

        // Verify user is a member
        const member = await db
          .select()
          .from(conversationMembers)
          .where(
            and(
              eq(conversationMembers.conversationId, convId),
              eq(conversationMembers.userId, user.userId)
            )
          )
          .limit(1)

        if (!member.length) {
          return status(403, translate(locale, 'conversations.notMember'))
        }

        // Create message
        const [newMsg] = await db
          .insert(messages)
          .values({
            conversationId: convId,
            senderId: user.userId,
            content,
          })
          .returning()

        // Update conversation timestamp
        await db
          .update(conversations)
          .set({ updatedAt: new Date() })
          .where(eq(conversations.id, convId))

        return {
          id: newMsg.id,
          senderId: user.userId,
          senderName: user.userName,
          content,
          createdAt: newMsg.createdAt,
        }
      } catch (e) {
        console.error('Error sending message:', e)
        return status(500, translate(locale, 'conversations.sendFailed'))
      }
    },
    {
      body: t.Object({
        content: t.String({ minLength: 1 }),
      }),
      detail: { description: 'Send a message in a conversation' },
      ...signedIn,
    }
  )

function getRelativeTime(date: Date, locale: ApiLocale): string {
  return formatRelativeTime(date, locale)
}

export default conversationsRoutes
