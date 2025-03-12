import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router'

import ChatDetailPage from '@/chats/detail'
import ChatLayout from '@/chats/layout'
import AccountsSettingsPage from '@/settings/accounts'
import Settings from '@/settings/index'
import ModelsSettingsPage from '@/settings/models'
import { SqliteRemoteDatabase } from 'drizzle-orm/sqlite-proxy'
import { useEffect, useState } from 'react'
import ChatNewPage from './chats/new'
import { getSettings } from './dal'
import { initializeDrizzleDatabase } from './db/database'
import { migrate } from './db/migrate'
import { DrizzleProvider } from './db/provider'
import * as schema from './db/schema'
import Layout from './layout'
import { createAppDataDir } from './lib/fs'
import Database from './lib/libsql'
import { createTray } from './lib/tray'
import Loading from './loading'
import SettingsLayout from './settings/layout'
import { SettingsProvider } from './settings/provider'
import { Settings as SettingsType } from './types'
const queryClient = new QueryClient()

type InitData = {
  db: SqliteRemoteDatabase<typeof schema>
  sqlite: Database
  settings: SettingsType
}

const init = async (): Promise<InitData> => {
  createTray()
  createAppDataDir()

  const { db, sqlite } = await initializeDrizzleDatabase()

  await migrate({ sqlite })

  const settings = (await getSettings<SettingsType>(db, 'main')) || {}

  return {
    db,
    sqlite,
    settings,
  }
}

export const App = () => {
  const [initData, setInitData] = useState<InitData>()

  useEffect(() => {
    init().then(setInitData)
  }, [])

  if (!initData) {
    return <Loading />
  }

  return (
    <QueryClientProvider client={queryClient}>
      <DrizzleProvider context={{ db: initData.db, sqlite: initData.sqlite }}>
        <SettingsProvider initialSettings={initData.settings} section="main">
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                {/* Home routes with HomeLayout */}
                <Route element={<ChatLayout />}>
                  <Route index element={<ChatNewPage />} />
                  <Route path="chats/:chatThreadId" element={<ChatDetailPage />} />
                </Route>

                {/* Settings routes with SettingsLayout */}
                <Route path="settings" element={<SettingsLayout />}>
                  <Route index element={<Settings />} />
                  <Route path="accounts" element={<AccountsSettingsPage />} />
                  <Route path="models" element={<ModelsSettingsPage />} />
                </Route>

                {/* <Route path="ui-kit" element={<UiKitPage />} /> */}
              </Route>
            </Routes>
          </BrowserRouter>
        </SettingsProvider>
      </DrizzleProvider>
    </QueryClientProvider>
  )
}
