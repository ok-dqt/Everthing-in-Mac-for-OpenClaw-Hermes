import { useChatStore } from '@/stores/chat-store'
import { useGatewayStore } from '@/stores/gateway-store'
import { useSessionStore } from '@/stores/session-store'
import { useSidebar } from '@/components/layout/app-layout'
import { useEffect } from 'react'
import { MessageList } from '@/components/chat/message-list'
import { ChatInput } from '@/components/chat/chat-input'

function ChatHeader() {
  const { status, activeProvider } = useGatewayStore()
  const { collapsed, toggle } = useSidebar()
  const providerLabel = activeProvider === 'hermes' ? 'Hermes' : 'OpenClaw'

  return (
    <header className="h-12 flex items-center px-4 border-b border-border shrink-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
      {collapsed && (
        <button onClick={toggle}
          className="ml-16 mr-3 w-6 h-6 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          title="Expand sidebar">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M4 2v10" /><path d="M8 5l3 2-3 2" />
          </svg>
        </button>
      )}
      <div className="flex items-center gap-2.5">
        <div className={`w-2 h-2 rounded-full ${
          status === 'connected' ? 'bg-success' :
          status === 'connecting' ? 'bg-warning' : 'bg-destructive'
        }`} />
        <span className="text-sm font-medium text-muted-foreground">
          {status === 'connected' ? providerLabel : status}
        </span>
      </div>
    </header>
  )
}

export function ChatPage() {
  const { status } = useGatewayStore()
  const { messages, isStreaming, sendMessage } = useChatStore()
  const fetchSessions = useSessionStore(s => s.fetchSessions)

  useEffect(() => {
    const init = async () => {
      const { discover } = useGatewayStore.getState()
      await discover()
      const { providers, providerStatus } = useGatewayStore.getState()
      for (const p of Object.values(providers)) {
        const ps = providerStatus[p.id as 'hermes' | 'openclaw']
        if (ps === 'unavailable' || ps === 'stopped') continue
        if (p.status === 'disconnected') {
          p.connect()
            .then(async () => {
              const pid = p.id as 'hermes' | 'openclaw'
              await fetchSessions(pid)
              const sessions = useSessionStore.getState().sessionsByProvider[pid]
              if (sessions.length > 0) {
                const { selectSession } = useSessionStore.getState()
                const currentActive = useGatewayStore.getState().activeProvider
                if (currentActive === pid) selectSession(sessions[0].id)
              }
            })
            .catch(e => console.error(`[${p.id}] connect failed`, e))
        }
      }
    }
    init()
  }, [])

  return (
    <div className="flex flex-col h-full bg-background">
      <ChatHeader />
      <MessageList messages={messages} isStreaming={isStreaming} />
      <ChatInput onSend={sendMessage} disabled={isStreaming || status !== 'connected'} />
    </div>
  )
}
