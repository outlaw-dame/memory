import Elysia, { t } from 'elysia'
import { conversations, conversationMembers, messages, users } from '../db/schema'
import { db } from '../db/client'
import setupPlugin from './setup'
import { eq, and, desc, sql } from 'drizzle-orm'

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
  .guard({
    as: 'scoped',
    isSignedIn: true
  })
  .get(
    '/conversations',
    async ({ user }) => {
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
                    eq(users.id, sql`NOT ${user.userId}`)
                  )
                )

              if (otherUser) {
                otherUserName = otherUser.name
                otherUserWebId = otherUser.webId
              }
            }

            const preview = latestMsg?.content || 'No messages yet'
            const lastActivityDate = latestMsg?.createdAt
            const lastActivity = lastActivityDate
              ? getRelativeTime(new Date(lastActivityDate))
              : ''

            return {
              id: conv.id,
              type: conv.type,
              name: conv.name || otherUserName || 'Unknown',
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
        throw new Error('Failed to fetch conversations')
      }
    },
    {
      detail: 'Get all conversations for the current user',
      isSignedIn: true,
      response: {
        200: t.Array(t.Any()),
      },
    }
  )
  .get(
    '/conversations/:id',
    async ({ params: { id }, user, error }) => {
      try {
        const conv = await db
          .select()
          .from(conversations)
          .where(eq(conversations.id, parseInt(id)))
          .limit(1)

        if (!conv.length || conv[0].userId !== user.userId) {
          return error(404, 'Conversation not found')
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
        return error(500, 'Failed to fetch conversation')
      }
    },
    {
      detail: 'Get a specific conversation with all messages',
      isSignedIn: true,
    }
  )
  .post(
    '/conversations',
    async ({ body, user, error }) => {
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
        return error(500, 'Failed to create conversation')
      }
    },
    {
      body: t.Object({
        type: t.Union([t.Literal('dm'), t.Literal('group')]),
        name: t.Optional(t.String()),
        memberIds: t.Array(t.Number()),
      }),
      detail: 'Create a new conversation',
      isSignedIn: true,
    }
  )
  .post(
    '/conversations/:id/messages',
    async ({ params: { id }, body, user, error }) => {
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
          return error(403, 'Not a member of this conversation')
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
        return error(500, 'Failed to send message')
      }
    },
    {
      body: t.Object({
        content: t.String({ minLength: 1 }),
      }),
      detail: 'Send a message in a conversation',
      isSignedIn: true,
    }
  )

function getRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'now'
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`
  }

  return date.toLocaleDateString()
}

export default conversationsRoutes
