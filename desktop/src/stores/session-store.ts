import { create } from 'zustand'
import { useGatewayStore } from './gateway-store'
import { useChatStore } from './chat-store'
import type { ProviderType } from '@/api/provider'
import type { Session } from '@/api/types'

interface SessionState {
  sessionsByProvider: Record<ProviderType, Session[]>
  activeSessionByProvider: Record<ProviderType, string | null>
  loading: boolean
  sessions: Session[]
  activeSessionId: string | null
  fetchSessions: (providerId?: ProviderType) => Promise<void>
  selectSession: (sessionId: string) => Promise<void>
  createSession: () => Promise<void>
  deleteSession: (sessionId: string) => Promise<void>
  renameSession: (sessionId: string, title: string) => Promise<void>
}

export const useSessionStore = create<SessionState>((set, get) => {
  useGatewayStore.subscribe((state, prev) => {
    if (state.activeProvider !== prev.activeProvider) {
      const current = get()
      set({
        sessions: current.sessionsByProvider[state.activeProvider] || [],
        activeSessionId: current.activeSessionByProvider[state.activeProvider]
      })
    }
  })

  return {
    sessionsByProvider: { hermes: [], openclaw: [] },
    activeSessionByProvider: { hermes: null, openclaw: null },
    loading: false,
    sessions: [],
    activeSessionId: null,

    fetchSessions: async (providerId?: ProviderType) => {
      const pid = providerId || useGatewayStore.getState().activeProvider
      const provider = useGatewayStore.getState().providers[pid]
      if (provider.status !== 'connected') return

      set({ loading: true })
      try {
        const sessions = await provider.listSessions()
        const current = get()
        const active = useGatewayStore.getState().activeProvider
        set({
          sessionsByProvider: { ...current.sessionsByProvider, [pid]: sessions },
          loading: false,
          ...(pid === active ? { sessions } : {})
        })
      } catch (e) {
        console.warn(`[${pid}] fetchSessions failed:`, e)
        set({ loading: false })
      }
    },

    selectSession: async (sessionId: string) => {
      const active = useGatewayStore.getState().activeProvider
      const provider = useGatewayStore.getState().providers[active]
      if (provider.status !== 'connected') return

      set({ loading: true })
      try {
        const messages = await provider.loadHistory(sessionId)
        await provider.resumeSession(sessionId)
        const current = get()
        const chatStore = useChatStore.getState()

        set({
          activeSessionByProvider: { ...current.activeSessionByProvider, [active]: sessionId },
          activeSessionId: sessionId,
          loading: false
        })

        chatStore.setMessages(active, messages)
      } catch (e) {
        console.warn(`[${active}] selectSession failed:`, e)
        set({ loading: false })
      }
    },

    createSession: async () => {
      const active = useGatewayStore.getState().activeProvider
      const provider = useGatewayStore.getState().providers[active]
      if (provider.status !== 'connected') return

      try {
        const id = await provider.createSession()
        if (!id) return
        const newSession: Session = { id, title: 'New Chat', createdAt: Date.now(), lastMessageAt: Date.now() }
        const current = get()
        const updated = [newSession, ...current.sessionsByProvider[active]]
        set({
          sessionsByProvider: { ...current.sessionsByProvider, [active]: updated },
          sessions: updated,
          activeSessionByProvider: { ...current.activeSessionByProvider, [active]: id },
          activeSessionId: id
        })
        useChatStore.getState().setMessages(active, [])
      } catch (e) { console.warn('createSession failed:', e) }
    },

    deleteSession: async (sessionId: string) => {
      const active = useGatewayStore.getState().activeProvider
      const provider = useGatewayStore.getState().providers[active]
      if (provider.status !== 'connected') return

      try {
        await provider.deleteSession(sessionId)
        const current = get()
        const updated = current.sessionsByProvider[active].filter(s => s.id !== sessionId)
        const wasActive = current.activeSessionByProvider[active] === sessionId
        set({
          sessionsByProvider: { ...current.sessionsByProvider, [active]: updated },
          sessions: updated,
          ...(wasActive ? { activeSessionId: updated[0]?.id || null, activeSessionByProvider: { ...current.activeSessionByProvider, [active]: updated[0]?.id || null } } : {})
        })
        if (wasActive && updated[0]) {
          get().selectSession(updated[0].id)
        } else if (wasActive) {
          useChatStore.getState().setMessages(active, [])
        }
      } catch (e) { console.warn('deleteSession failed:', e) }
    },

    renameSession: async (sessionId: string, title: string) => {
      const active = useGatewayStore.getState().activeProvider
      const provider = useGatewayStore.getState().providers[active]
      if (provider.status !== 'connected') return

      try {
        await provider.renameSession(sessionId, title)
        const current = get()
        const updated = current.sessionsByProvider[active].map(s => s.id === sessionId ? { ...s, title } : s)
        set({
          sessionsByProvider: { ...current.sessionsByProvider, [active]: updated },
          sessions: updated
        })
      } catch (e) { console.warn('renameSession failed:', e) }
    }
  }
})
