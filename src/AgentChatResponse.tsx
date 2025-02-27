import { ToolInvocationUIPart } from '@ai-sdk/ui-utils'
import { ErrorBoundary, Match, Switch } from 'solid-js'

export type AgentToolResponseProps = {
  part: ToolInvocationUIPart
}

export const AgentToolResponse = ({ part }: AgentToolResponseProps) => {
  return (
    <ErrorBoundary
      fallback={
        <div class="space-y-2">
          <div class="bg-red-50 border border-red-200 p-2 rounded-md text-red-700 leading-relaxed">Error processing tool invocation</div>
        </div>
      }
    >
      <Switch
        fallback={
          <div class="space-y-2">
            <div class="text-gray-700 leading-relaxed">Unknown tool: {part.toolInvocation.toolName}</div>
          </div>
        }
      >
        <Match when={part.toolInvocation.toolName === 'answer' && part.toolInvocation.args?.text}>
          <div class="space-y-2">
            <div class="text-gray-700 leading-relaxed">{part.toolInvocation.args.text}</div>
          </div>
        </Match>
        <Match when={part.toolInvocation.toolName === 'search' && part.toolInvocation.args?.query}>
          <div class="space-y-2">
            <div class="bg-blue-50 border border-blue-200 p-2 rounded-md text-gray-700 leading-relaxed italic flex items-center">Searching for "{part.toolInvocation.args.query}"...</div>
          </div>
        </Match>
      </Switch>
    </ErrorBoundary>
  )
}
