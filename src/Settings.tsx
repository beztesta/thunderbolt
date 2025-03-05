import { useChat } from '@ai-sdk/solid'
import ChatUI from './ChatUI'
import { aiFetchStreamingResponse } from './lib/ai'

export default function Settings() {
  const chatHelpers = useChat({
    fetch: aiFetchStreamingResponse,
    maxSteps: 5,
  })

  // console.log('messages', chatHelpers.messages())

  return <ChatUI chatHelpers={chatHelpers} />
}
