export interface AgentInfo {
  installed: boolean
  running: boolean
  port: number
  token?: string
}

export interface ElectronAPI {
  platform: string
  discoverAgents: () => Promise<{ hermes: AgentInfo; openclaw: AgentInfo }>
  startAgent: (id: 'hermes' | 'openclaw') => Promise<{ ok: boolean; error?: string }>
  stopAgent: (id: 'hermes' | 'openclaw') => Promise<{ ok: boolean; error?: string }>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
