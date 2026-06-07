import { create } from 'zustand'
import { useGatewayStore } from './gateway-store'
import type { AgentEvent, ProviderType } from '@/api/provider'
import type { ChatMessage, ToolCall } from '@/api/types'

interface ChatState {
  messagesByProvider: Record<ProviderType, ChatMessage[]>
  streamingByProvider: Record<ProviderType, boolean>
  messages: ChatMessage[]
  isStreaming: boolean
  sendMessage: (text: string) => void
  clearMessages: () => void
  setMessages: (providerId: ProviderType, messages: ChatMessage[]) => void
}

function handleEvent(
  providerId: ProviderType,
  event: AgentEvent,
  get: () => ChatState,
  set: (s: Partial<ChatState>) => void
) {
  const state = get()
  const msgs = [...(state.messagesByProvider[providerId] || [])]
  const payload = event.payload
  const active = useGatewayStore.getState().activeProvider

  switch (event.type) {
    case 'message.start':
      msgs.push({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true
      })
      break
    case 'message.delta': {
      const last = msgs[msgs.length - 1]
      if (last?.role === 'assistant') {
        last.content += (payload.text as string) || ''
      }
      break
    }
    case 'message.complete': {
      const last = msgs[msgs.length - 1]
      if (last) last.isStreaming = false
      break
    }
    case 'tool.start': {
      const last = msgs[msgs.length - 1]
      if (last) {
        const tc: ToolCall = { id: crypto.randomUUID(), name: payload.name as string, status: 'running' }
        last.toolCalls = [...(last.toolCalls || []), tc]
      }
      break
    }
    case 'tool.complete': {
      const last = msgs[msgs.length - 1]
      if (last?.toolCalls) {
        const tc = last.toolCalls.find(t => t.name === payload.name && t.status === 'running')
        if (tc) tc.status = 'complete'
      }
      break
    }
    case 'error': {
      const last = msgs[msgs.length - 1]
      if (last?.role === 'assistant') {
        last.content += `\n\n**Error:** ${payload.message || 'Unknown error'}`
        last.isStreaming = false
      }
      break
    }
  }

  const streaming = event.type === 'message.start' || event.type === 'message.delta'
  const newByProvider = { ...state.messagesByProvider, [providerId]: msgs }
  const newStreamingBy = { ...state.streamingByProvider, [providerId]: streaming }

  set({
    messagesByProvider: newByProvider,
    streamingByProvider: newStreamingBy,
    ...(providerId === active ? { messages: msgs, isStreaming: streaming } : {})
  })
}

export const useChatStore = create<ChatState>((set, get) => {
  const gwStore = useGatewayStore.getState()

  for (const provider of Object.values(gwStore.providers)) {
    provider.onEvent((event) => handleEvent(provider.id as ProviderType, event, get, set))
  }

  useGatewayStore.subscribe((state, prev) => {
    if (state.activeProvider !== prev.activeProvider) {
      const current = get()
      set({
        messages: current.messagesByProvider[state.activeProvider] || [],
        isStreaming: current.streamingByProvider[state.activeProvider] || false
      })
    }
  })

  return {
    messagesByProvider: { hermes: [], openclaw: [] },
    streamingByProvider: { hermes: false, openclaw: false },
    messages: [],
    isStreaming: false,
    sendMessage: (text: string) => {
      const active = useGatewayStore.getState().activeProvider
      const current = get()
      const msgs = [...(current.messagesByProvider[active] || []), {
        id: crypto.randomUUID(),
        role: 'user' as const,
        content: text,
        timestamp: Date.now()
      }]
      set({
        messagesByProvider: { ...current.messagesByProvider, [active]: msgs },
        messages: msgs
      })
      useGatewayStore.getState().getProvider().sendMessage(text)
    },
    clearMessages: () => {
      const active = useGatewayStore.getState().activeProvider
      const current = get()
      set({
        messagesByProvider: { ...current.messagesByProvider, [active]: [] },
        streamingByProvider: { ...current.streamingByProvider, [active]: false },
        messages: [],
        isStreaming: false
      })
    },
    setMessages: (providerId: ProviderType, messages: ChatMessage[]) => {
      const current = get()
      const active = useGatewayStore.getState().activeProvider
      set({
        messagesByProvider: { ...current.messagesByProvider, [providerId]: messages },
        ...(providerId === active ? { messages } : {})
      })
    }
  }
})
