export interface ModelOptions {
  providers: Array<{ id: string; name: string; models: Array<{ id: string; name: string }> }>
  current: { model: string; provider: string }
}
export interface ModelInfo { model: string; provider: string; context_window?: number }
export interface AuxiliaryModels { [role: string]: string }
export interface Skill { name: string; enabled: boolean; description?: string; source?: string }
export interface SkillHubSource { name: string; url: string; skills: Array<{ name: string; description: string }> }
export interface McpServer { id: string; name: string; status: string; transport: string; url?: string }
export interface McpCatalogItem { id: string; name: string; description: string; installed: boolean }
export interface Plugin { id: string; name: string; enabled: boolean; description?: string }
export interface PluginHubItem { id: string; name: string; description: string; installed: boolean }
export interface Profile { name: string; description?: string; active: boolean }
export interface CronJob { id: string; name: string; schedule: string; target: string; prompt: string; enabled: boolean }
export interface SessionStats { total: number; today: number; thisWeek: number; totalTokens?: number }
export interface EnvVar { key: string; value: string; masked: boolean }
export interface Webhook { id: string; url: string; events: string[]; active: boolean }
export interface Pairing { id: string; name: string; device: string; status: string; paired_at: number }
export interface SystemStats { uptime: number; version: string; memory_mb: number; sessions_active: number }
export interface DoctorResult { checks: Array<{ name: string; status: string; message?: string }> }
export interface MemoryEntry { id: string; content: string; created_at: number }
export interface Channel { id: string; name: string; type: string; status: string }

export class HermesAPI {
  private baseUrl = 'http://127.0.0.1:9119'
  private token = ''

  configure(port: number) {
    this.baseUrl = `http://127.0.0.1:${port}`
  }

  async fetchToken(): Promise<string> {
    const res = await fetch(`${this.baseUrl}/hermes/`)
    const html = await res.text()
    const m = html.match(/window\.__HERMES_SESSION_TOKEN__="([^"]+)"/)
    if (!m) throw new Error('Cannot extract session token')
    this.token = m[1]
    return this.token
  }

  private async request<T>(path: string, opts?: RequestInit): Promise<T> {
    if (!this.token) await this.fetchToken()
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...opts,
      headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json', ...opts?.headers }
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
    return res.json()
  }

  private get<T>(path: string) { return this.request<T>(path) }
  private post<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined })
  }
  private put<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined })
  }
  private del<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined })
  }

  // Models
  getModelOptions() { return this.get<ModelOptions>('/api/model/options') }
  getModelInfo() { return this.get<ModelInfo>('/api/model/info') }
  setModel(model: string, provider?: string) { return this.post('/api/model/set', { model, provider }) }
  getAuxiliaryModels() { return this.get<AuxiliaryModels>('/api/model/auxiliary') }
  setAuxiliaryModel(role: string, model: string) { return this.post('/api/model/auxiliary', { role, model }) }

  // Config
  getConfig() { return this.get<Record<string, unknown>>('/api/config') }
  getConfigRaw() { return this.get<string>('/api/config/raw') }
  getConfigSchema() { return this.get<Record<string, unknown>>('/api/config/schema') }
  getConfigDefaults() { return this.get<Record<string, unknown>>('/api/config/defaults') }
  updateConfig(config: Record<string, unknown>) { return this.put('/api/config', config) }

  // Skills
  getSkills() { return this.get<Skill[]>('/api/skills') }
  toggleSkill(name: string, enabled: boolean) { return this.post('/api/skills/toggle', { name, enabled }) }
  getSkillHubSources() { return this.get<SkillHubSource[]>('/api/skills/hub/sources') }
  installSkill(source: string, name: string) { return this.post('/api/skills/hub/install', { source, name }) }

  // MCP
  getMcpServers() { return this.get<McpServer[]>('/api/mcp/servers') }
  getMcpCatalog() { return this.get<McpCatalogItem[]>('/api/mcp/catalog') }
  installMcpServer(id: string) { return this.post('/api/mcp/catalog/install', { id }) }

  // Plugins
  getPlugins() { return this.get<Plugin[]>('/api/plugins') }
  getPluginHub() { return this.get<PluginHubItem[]>('/api/dashboard/plugins/hub') }
  installPlugin(id: string) { return this.post('/api/plugins', { id }) }
  removePlugin(id: string) { return this.del('/api/plugins', { id }) }

  // Profiles
  getProfiles() { return this.get<Profile[]>('/api/profiles') }
  getActiveProfile() { return this.get<{ name: string }>('/api/profiles/active') }
  setActiveProfile(name: string) { return this.post('/api/profiles/active', { name }) }

  // Cron
  getCronJobs() { return this.get<CronJob[]>('/api/cron') }
  createCronJob(job: Partial<CronJob>) { return this.post<CronJob>('/api/cron', job) }
  deleteCronJob(id: string) { return this.del('/api/cron', { id }) }
  getCronTargets() { return this.get<string[]>('/api/cron/delivery-targets') }

  // Sessions / Analytics
  getSessionStats() { return this.get<SessionStats>('/api/sessions/stats') }
  bulkDeleteSessions(ids: string[]) { return this.post('/api/sessions/bulk-delete', { ids }) }
  pruneSessions(olderThanDays: number) { return this.post('/api/sessions/prune', { older_than_days: olderThanDays }) }

  // Env
  getEnv() { return this.get<EnvVar[]>('/api/env') }
  setEnv(key: string, value: string) { return this.post('/api/env', { key, value }) }
  deleteEnv(key: string) { return this.del('/api/env', { key }) }
  revealEnv(key: string) { return this.post<{ value: string }>('/api/env/reveal', { key }) }

  // Webhooks
  getWebhooks() { return this.get<Webhook[]>('/api/webhooks') }
  createWebhook(wh: Partial<Webhook>) { return this.post<Webhook>('/api/webhooks', wh) }
  deleteWebhook(id: string) { return this.del('/api/webhooks', { id }) }

  // Pairing
  getPairings() { return this.get<Pairing[]>('/api/pairing') }
  approvePairing(id: string) { return this.post('/api/pairing/approve', { id }) }
  revokePairing(id: string) { return this.post('/api/pairing/revoke', { id }) }

  // System
  getSystemStats() { return this.get<SystemStats>('/api/system/stats') }
  runDoctor() { return this.post<DoctorResult>('/api/ops/doctor', {}) }
  createBackup() { return this.post<{ path: string }>('/api/ops/backup', {}) }
  restartGateway() { return this.post('/api/gateway/restart', {}) }

  // Memory
  getMemory() { return this.get<MemoryEntry[]>('/api/memory') }
  getMemoryProvider() { return this.get<{ provider: string }>('/api/memory/provider') }
  resetMemory() { return this.post('/api/memory/reset', {}) }

  // Channels
  getChannels() { return this.get<Channel[]>('/api/channels') }
}

export const hermesAPI = new HermesAPI()
