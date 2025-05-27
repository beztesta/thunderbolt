import { SidebarFooter } from '@/components/sidebar-footer'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useDrizzle } from '@/db/provider'
import { chatMessagesTable, chatThreadsTable } from '@/db/tables'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { desc, eq, notExists } from 'drizzle-orm'
import { Flame, Loader2, MoreHorizontal, SquarePen } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { v7 as uuidv7 } from 'uuid'

export default function ChatSidebar() {
  const navigate = useNavigate()
  const { db } = useDrizzle()
  const queryClient = useQueryClient()

  const { chatThreadId: currentChatThreadId } = useParams()

  const { data: chatThreads = [] } = useQuery({
    queryKey: ['chatThreads'],
    queryFn: async () => {
      return db.select().from(chatThreadsTable).orderBy(desc(chatThreadsTable.id))
    },
  })

  const createChatMutation = useMutation({
    mutationFn: async () => {
      const chatThreadId = uuidv7()
      // @todo libsql will throw an error that "execute returned rows" if we try to do returning()
      await db.insert(chatThreadsTable).values({ id: chatThreadId, title: 'New Chat' })
      return chatThreadId
    },
    onSuccess: (chatThreadId) => {
      queryClient.invalidateQueries({ queryKey: ['chatThreads'] })
      navigate(`/chats/${chatThreadId}`)
    },
  })

  const deleteChatMutation = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      await db.delete(chatThreadsTable).where(eq(chatThreadsTable.id, id))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatThreads'] })
    },
  })

  const deleteAllChatsMutation = useMutation({
    mutationFn: async () => {
      await db.delete(chatThreadsTable)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatThreads'] })
    },
  })

  const createNewChat = async () => {
    try {
      const emptyThreads = await db
        .select({ id: chatThreadsTable.id })
        .from(chatThreadsTable)
        .where(notExists(db.select().from(chatMessagesTable).where(eq(chatMessagesTable.chatThreadId, chatThreadsTable.id))))
        .limit(1)

      if (emptyThreads.length > 0) {
        navigate(`/chats/${emptyThreads[0].id}`)
      } else {
        createChatMutation.mutate()
      }
    } catch (error) {
      console.error('Error checking for empty threads:', error)
      createChatMutation.mutate()
    }
  }

  return (
    <Sidebar>
      <SidebarContent className="flex flex-col h-full">
        <SidebarGroup>
          <SidebarGroupContent className="flex justify-between w-full flex-1">
            <SidebarTrigger className="cursor-pointer" />
            <SidebarMenuButton onClick={createNewChat} className="w-fit pr-0 pl-0 aspect-square items-center justify-center cursor-pointer" tooltip="New Chat">
              <SquarePen className="size-5" />
            </SidebarMenuButton>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/">
                    <span>Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/settings/preferences">
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="m-0" />

        <SidebarGroup className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-between">
            <SidebarGroupLabel>Recent Chats</SidebarGroupLabel>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarMenuButton
                    onClick={() => deleteAllChatsMutation.mutate()}
                    className="w-fit pr-0 pl-0 aspect-square items-center justify-center cursor-pointer"
                    disabled={deleteAllChatsMutation.isPending}
                  >
                    {deleteAllChatsMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Flame className="size-4" />}
                  </SidebarMenuButton>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Clear all chats</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <SidebarMenu>
            {chatThreads.map((thread) => (
              <DropdownMenu key={thread.id}>
                <SidebarMenuItem>
                  <Link to={`/chats/${thread.id}`}>
                    <SidebarMenuButton isActive={thread.id === currentChatThreadId} className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer">
                      <span className="truncate">{thread.title}</span>
                      <DropdownMenuTrigger asChild>
                        <MoreHorizontal className="ml-auto" />
                      </DropdownMenuTrigger>
                    </SidebarMenuButton>
                  </Link>
                  <DropdownMenuContent side="right" align="start" className="min-w-56 rounded-lg">
                    <DropdownMenuItem
                      onClick={() => {
                        deleteChatMutation.mutate({ id: thread.id })
                      }}
                      disabled={deleteChatMutation.isPending}
                    >
                      {deleteChatMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : 'Delete'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </SidebarMenuItem>
              </DropdownMenu>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarFooter />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
