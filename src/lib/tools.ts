import * as tasksTools from '@/extensions/tasks/tools'
import { configs as googleConfigs } from '@/integrations/google/tools'
import { configs as microsoftConfigs } from '@/integrations/microsoft/tools'
import { configs as proConfigs } from '@/integrations/thunderbolt-pro/tools'
import { hasProAccess } from '@/integrations/thunderbolt-pro/utils'
import { getSetting } from '@/lib/dal'
import type { ToolConfig } from '@/types'
import { tool, type Tool } from 'ai'

export const getAvailableTools = async (): Promise<ToolConfig[]> => {
  const baseTools: ToolConfig[] = [...Object.values(tasksTools)]

  // Check Thunderbolt Pro access and integration enabled state
  const proEnabled = await hasProAccess()
  const proIntegrationEnabled = await getSetting('integrations_pro_is_enabled')
  const shouldIncludeProTools = proEnabled && (proIntegrationEnabled === null ? true : proIntegrationEnabled === 'true')

  if (shouldIncludeProTools) {
    baseTools.push(...proConfigs)
  }

  const googleEnabled = await getSetting('integrations_google_is_enabled')
  const microsoftEnabled = await getSetting('integrations_microsoft_is_enabled')

  if (googleEnabled === 'true') {
    baseTools.push(...googleConfigs)
  }

  if (microsoftEnabled === 'true') {
    baseTools.push(...microsoftConfigs)
  }

  return baseTools
}

export const tools = [...Object.values(tasksTools)]

export const createTool = (config: ToolConfig) => {
  return tool({
    description: config.description,
    parameters: config.parameters,
    execute: config.execute,
  })
}

export const createToolset = (tools: ToolConfig[]) => {
  return {
    ...tools.reduce(
      (acc, tool) => {
        acc[tool.name] = createTool(tool)
        return acc
      },
      {} as Record<string, Tool>,
    ),
  }
}
