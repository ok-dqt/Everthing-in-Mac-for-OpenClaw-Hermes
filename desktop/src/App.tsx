import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppLayout } from '@/components/layout/app-layout'
import { ChatPage } from '@/pages/chat'
import { ModelsPage } from '@/pages/hermes/models'
import { SkillsPage } from '@/pages/hermes/skills'
import { ConfigPage } from '@/pages/hermes/config'
import { McpPage } from '@/pages/hermes/mcp'
import { PluginsPage } from '@/pages/hermes/plugins'
import { ProfilesPage } from '@/pages/hermes/profiles'
import { CronPage } from '@/pages/hermes/cron'
import { AnalyticsPage } from '@/pages/hermes/analytics'
import { LogsPage } from '@/pages/hermes/logs'
import { EnvPage } from '@/pages/hermes/env'
import { WebhooksPage } from '@/pages/hermes/webhooks'
import { PairingPage } from '@/pages/hermes/pairing'
import { SystemPage } from '@/pages/hermes/system'
import { ChannelsPage } from '@/pages/hermes/channels'

export default function App() {
  return (
    <HashRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/models" element={<ModelsPage />} />
          <Route path="/skills" element={<SkillsPage />} />
          <Route path="/config" element={<ConfigPage />} />
          <Route path="/mcp" element={<McpPage />} />
          <Route path="/plugins" element={<PluginsPage />} />
          <Route path="/profiles" element={<ProfilesPage />} />
          <Route path="/cron" element={<CronPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/env" element={<EnvPage />} />
          <Route path="/webhooks" element={<WebhooksPage />} />
          <Route path="/pairing" element={<PairingPage />} />
          <Route path="/system" element={<SystemPage />} />
          <Route path="/channels" element={<ChannelsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </HashRouter>
  )
}
