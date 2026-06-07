import { create } from 'zustand'
import type { AgentProvider, ProviderType } from '@/api/provider'
import type { ConnectionStatus } from '@/api/types'
import { hermesProvider } from '@/api/hermes-provider'
import { openclawProvider } from '@/api/openclaw-provider'

interface GatewayState {
  status: ConnectionStatus
  activeProvider: ProviderType
  providers: Record<ProviderType, AgentProvider>
  providerStatus: Record<ProviderType, ConnectionStatus>
  setProvider: (type: ProviderType) => void
  connect: () => Promise<void>
  disconnect: () => void
  getProvider: () => AgentProvider
  discover: () => Promise<void>
  startAgent: (id: ProviderType) => Promise<boolean>
  stopAgent: (id: ProviderType) => Promise<boolean>
}

export const useGatewayStore = create<GatewayState>((set, get) => {
  const providers: Record<ProviderType, AgentProvider> = {
    hermes: hermesProvider,
    openclaw: openclawProvider
  }

  for (const p of Object.values(providers)) {
    p.onStatus((status) => {
      const state = get()
      set({
        providerStatus: { ...state.providerStatus, [p.id]: status },
        ...(state.activeProvider === p.id ? { status } : {})
      })
    })
  }

  return {
    status: 'disconnected',
    activeProvider: 'hermes',
    providers,
    providerStatus: { hermes: 'disconnected', openclaw: 'disconnected' },
    getProvider: () => providers[get().activeProvider],
    setProvider: (type: ProviderType) => {
      if (get().activeProvider === type) return
      set({
        activeProvider: type,
        status: get().providerStatus[type]
      })
    },
    connect: async () => {
      try {
        await get().getProvider().connect()
      } catch (e) {
        console.error('connect failed', e)
      }
    },
    disconnect: () => get().getProvider().disconnect(),

    discover: async () => {
      if (!window.electronAPI?.discoverAgents) return
      const info = await window.electronAPI.discoverAgents()

      const state = get()
      const newStatus = { ...state.providerStatus }

      if (!info.hermes.installed) {
        newStatus.hermes = 'unavailable'
      } else if (!info.hermes.running) {
        newStatus.hermes = 'stopped'
      }
      providers.hermes.configure({ port: info.hermes.port })

      if (!info.openclaw.installed) {
        newStatus.openclaw = 'unavailable'
      } else if (!info.openclaw.running) {
        newStatus.openclaw = 'stopped'
      }
      providers.openclaw.configure({
        port: info.openclaw.port,
        token: info.openclaw.token || undefined
      })

      set({
        providerStatus: newStatus,
        status: newStatus[state.activeProvider]
      })
    },

    startAgent: async (id: ProviderType) => {
      if (!window.electronAPI?.startAgent) return false
      const result = await window.electronAPI.startAgent(id)
      if (result.ok) {
        set(state => ({
          providerStatus: { ...state.providerStatus, [id]: 'disconnected' },
          ...(state.activeProvider === id ? { status: 'disconnected' } : {})
        }))
      }
      return result.ok
    },

    stopAgent: async (id: ProviderType) => {
      if (!window.electronAPI?.stopAgent) return false
      providers[id].disconnect()
      const result = await window.electronAPI.stopAgent(id)
      if (result.ok) {
        set(state => ({
          providerStatus: { ...state.providerStatus, [id]: 'stopped' },
          ...(state.activeProvider === id ? { status: 'stopped' } : {})
        }))
      }
      return result.ok
    }
  }
})
