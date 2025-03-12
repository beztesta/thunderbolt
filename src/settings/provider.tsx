import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, ReactNode, useContext } from 'react'

import { getSettings as dalGetSettings, setSettings as dalSetSettings } from '@/dal'
import { useDrizzle } from '@/db/provider'
import { Settings } from '@/types'

type SettingsContextType = {
  settings: Settings
  setSettings: (updatedSettings: Settings) => Promise<void>
  isLoading: boolean
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider(props: { initialSettings: Settings; section: string; children: ReactNode }) {
  const drizzleContext = useDrizzle()
  const queryClient = useQueryClient()

  const settingsQueryKey = ['settings', props.section]

  const { data: settings, isLoading } = useQuery({
    queryKey: settingsQueryKey,
    queryFn: async () => {
      return (await dalGetSettings<Settings>(drizzleContext.db, props.section)) || {}
    },
    initialData: props.initialSettings,
  })

  const { mutateAsync } = useMutation({
    mutationFn: async (updatedSettings: Settings) => {
      await dalSetSettings(drizzleContext.db, props.section, updatedSettings)
      return updatedSettings
    },
    onMutate: async (updatedSettings) => {
      await queryClient.cancelQueries({ queryKey: settingsQueryKey })
      const previousSettings = queryClient.getQueryData(settingsQueryKey)
      queryClient.setQueryData(settingsQueryKey, updatedSettings)
      return { previousSettings }
    },
    onError: (err, newSettings, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(settingsQueryKey, context.previousSettings)
      }
      console.error(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: settingsQueryKey })
    },
  })

  const setSettings = async (updatedSettings: Settings): Promise<void> => {
    await mutateAsync(updatedSettings)
  }

  if (isLoading || !settings) {
    return null
  }

  return (
    <SettingsContext.Provider
      value={{
        settings,
        setSettings,
        isLoading,
      }}
    >
      {props.children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)

  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }

  return context
}
