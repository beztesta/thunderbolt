import { chatMessagesTable, chatThreadsTable } from '@/db/tables'
import { useDatabase } from '@/hooks/use-database'
import { generateTitle } from '@/lib/title-generator'
import { convertDbChatMessageToUIMessage, convertUIMessageToDbChatMessage } from '@/lib/utils'
import { SaveMessagesFunction } from '@/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { UIMessage } from 'ai'
import { eq, sql } from 'drizzle-orm'
import { useParams } from 'react-router'
import FlowerChat from './flower-chat'

export default function FlowerChatDetailPage() {
  const params = useParams()
  const { db } = useDatabase()
  const queryClient = useQueryClient()

  // Helper function to generate and update title
  const updateThreadTitle = async (messages: UIMessage[], threadId: string) => {
    const firstUserMessage = messages.find(msg => msg.role === 'user')
    if (!firstUserMessage) return

    const textContent = firstUserMessage.parts
      ?.filter(part => part.type === 'text')
      .map(part => part.text)
      .join(' ')

    if (!textContent) return

    try {
      const title = await generateTitle(textContent)
      await db.update(chatThreadsTable).set({ title }).where(eq(chatThreadsTable.id, threadId))
      queryClient.invalidateQueries({ queryKey: ['chatThreads'] })
    } catch (error) {
      console.error('Error generating title:', error)
    }
  }

  const {
    data: messages,
    isLoading,
    isError,
  } = useQuery<UIMessage[], Error>({
    queryKey: ['chatMessages', params.chatThreadId],
    queryFn: async () => {
      const chatMessages = await db.select().from(chatMessagesTable).where(eq(chatMessagesTable.chatThreadId, params.chatThreadId!)).orderBy(chatMessagesTable.id)
      return chatMessages.map(convertDbChatMessageToUIMessage)
    },
    enabled: !!params.chatThreadId,
  })

  const addMessagesMutation = useMutation({
    mutationFn: async (messages: UIMessage[]) => {
      if (!params.chatThreadId) {
        throw new Error('No chat thread ID')
      }

      const dbChatMessages = messages.map((message) => convertUIMessageToDbChatMessage(message, params.chatThreadId!))

      const thread = await db.select().from(chatThreadsTable).where(eq(chatThreadsTable.id, params.chatThreadId!)).get()

      if (!thread) {
        throw new Error('Thread not found')
      }

      // Insert messages
      await db
        .insert(chatMessagesTable)
        .values(dbChatMessages)
        .onConflictDoUpdate({
          target: chatMessagesTable.id,
          set: {
            content: sql`excluded.content`,
            parts: sql`excluded.parts`,
            role: sql`excluded.role`,
          },
        })

      // Generate title in background if needed
      if (thread.title === 'New Chat') {
        updateThreadTitle(messages, params.chatThreadId!)
      }

      return dbChatMessages
    },
    onSuccess: () => {
      // Invalidate and refetch messages after adding a new one
      queryClient.invalidateQueries({ queryKey: ['chatMessages', params.chatThreadId] })
      // Also invalidate chat threads to update the sidebar
      queryClient.invalidateQueries({ queryKey: ['chatThreads'] })
    },
  })

  const saveMessages: SaveMessagesFunction = async ({ messages }) => {
    await addMessagesMutation.mutateAsync(messages)
  }

  return params.chatThreadId ? (
    <>
      <div className="h-full w-full">
        {isLoading ? (
          <div>Loading Flower AI chat...</div>
        ) : isError ? (
          <div>Error loading Flower AI chat</div>
        ) : messages ? (
          <FlowerChat key={params.chatThreadId} id={params.chatThreadId} initialMessages={messages} saveMessages={saveMessages} />
        ) : (
          <div>Error loading Flower AI chat</div>
        )}
      </div>
    </>
  ) : (
    <div>No chat thread ID</div>
  )
}
