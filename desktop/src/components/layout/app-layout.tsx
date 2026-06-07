import { type ReactNode, useState, createContext, useContext } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useGatewayStore } from '@/stores/gateway-store'
import { SessionList } from '@/components/chat/session-list'

const SidebarContext = createContext<{ collapsed: boolean; toggle: () => void }>({ collapsed: false, toggle: () => {} })
export const useSidebar = () => useContext(SidebarContext)

const NAV_ITEMS = [
  { path: '/', label: 'Chat', icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
  { path: '/models', label: 'Models', icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
  { path: '/skills', label: 'Skills', icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z' },
  { path: '/config', label: 'Config', icon: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z' },
  { path: '/mcp', label: 'MCP', icon: 'M5 12h14M12 5l7 7-7 7' },
  { path: '/plugins', label: 'Plugins', icon: 'M12 2v6m0 8v6m-6-6H0m24 0h-6m-1.5-7.5L13 6m-2 12l-3.5-3.5M18 6l-3.5 3.5M6 18l3.5-3.5' },
  { path: '/profiles', label: 'Profiles', icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z' },
  { path: '/cron', label: 'Cron', icon: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6v6l4 2' },
  { path: '/analytics', label: 'Analytics', icon: 'M18 20V10M12 20V4M6 20v-6' },
  { path: '/logs', label: 'Logs', icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' },
  { path: '/env', label: 'Env', icon: 'M4 7V4h16v3M9 20h6M12 4v16' },
  { path: '/webhooks', label: 'Webhooks', icon: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71' },
  { path: '/pairing', label: 'Pairing', icon: 'M16.5 9.4l-9-5.19M21 16V8l-9-5.19L3 8v8l9 5.19L21 16z' },
  { path: '/channels', label: 'Channels', icon: 'M22 12h-4l-3 9L9 3l-3 9H2' },
  { path: '/system', label: 'System', icon: 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01' },
]

function CapsuleSwitch() {
  const { activeProvider, setProvider } = useGatewayStore()
  const isOC = activeProvider === 'openclaw'
  const toggle = () => setProvider(isOC ? 'hermes' : 'openclaw')
  return (
    <button onClick={toggle}
      className="relative flex items-center h-6 w-[120px] rounded-full bg-sidebar-accent border border-border cursor-pointer select-none"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
      <span className={`absolute left-1 text-[10px] px-1.5 transition-opacity text-muted-foreground ${isOC ? 'opacity-60' : 'opacity-0'}`}>Hermes</span>
      <span className={`absolute right-1 text-[10px] px-1.5 transition-opacity text-muted-foreground ${isOC ? 'opacity-0' : 'opacity-60'}`}>OpenClaw</span>
      <span className="absolute top-0.5 h-5 rounded-full bg-brand text-white text-[10px] font-medium flex items-center justify-center transition-all duration-200"
        style={{ left: isOC ? '54px' : '2px', width: isOC ? '62px' : '54px' }}>
        {isOC ? 'OpenClaw' : 'Hermes'}
      </span>
    </button>
  )
}

function AgentControls() {
  const { activeProvider, providerStatus, startAgent, stopAgent, connect } = useGatewayStore()
  const isElectron = !!window.electronAPI?.discoverAgents
  const pStatus = providerStatus[activeProvider]
  if (!isElectron || pStatus === 'unavailable') return null
  const handleStart = async () => {
    const ok = await startAgent(activeProvider)
    if (ok) setTimeout(() => connect(), 500)
  }
  return (
    <div className="px-4 py-1 flex items-center gap-2">
      {pStatus === 'stopped' && (
        <button onClick={handleStart} className="text-xs text-accent-teal hover:text-accent-teal/80 flex items-center gap-1 font-medium">&#9654; Start</button>
      )}
      {(pStatus === 'connected' || pStatus === 'connecting') && (
        <button onClick={() => stopAgent(activeProvider)} className="text-xs text-destructive hover:text-destructive/80 flex items-center gap-1 font-medium">&#9632; Stop</button>
      )}
    </div>
  )
}

function NavIcon({ d }: { d: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

function SidebarNav() {
  const location = useLocation()
  const isChat = location.pathname === '/'
  return (
    <nav className="flex-1 overflow-y-auto px-2 py-1">
      {isChat ? (
        <SessionList />
      ) : (
        <div className="space-y-0.5">
          {NAV_ITEMS.map(item => (
            <NavLink key={item.path} to={item.path}
              className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                isActive ? 'bg-sidebar-accent text-foreground' : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground'
              }`}>
              <NavIcon d={item.icon} />
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  )
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const toggle = () => setCollapsed(c => !c)
  const location = useLocation()
  const isChat = location.pathname === '/'

  return (
    <SidebarContext.Provider value={{ collapsed, toggle }}>
      <div className="flex w-full h-full bg-background">
        {!collapsed && (
          <aside className="w-[240px] h-full bg-sidebar border-r border-border flex flex-col shrink-0">
            <div className="h-12 flex items-center px-3 gap-2" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
              <div className="w-[52px] shrink-0" />
              <CapsuleSwitch />
              <div className="flex-1" />
              <button onClick={toggle}
                className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-sidebar-accent text-muted-foreground"
                style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M4 2v10" /><path d="M11 5l-3 2 3 2" />
                </svg>
              </button>
            </div>
            <AgentControls />
            {isChat && <div className="text-[11px] text-muted-foreground/60 uppercase tracking-wider font-medium px-5 py-1.5">Sessions</div>}
            {!isChat && (
              <div className="px-2 py-1">
                <NavLink to="/" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground font-medium">
                  <NavIcon d={NAV_ITEMS[0].icon} />
                  Back to Chat
                </NavLink>
              </div>
            )}
            <SidebarNav />
            {isChat && (
              <div className="border-t border-border px-2 py-2">
                <div className="text-[10px] text-muted-foreground/40 px-3 mb-1.5 uppercase tracking-wider font-medium">Manage</div>
                {NAV_ITEMS.slice(1, 8).map(item => (
                  <NavLink key={item.path} to={item.path}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[12px] text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground font-medium">
                    <NavIcon d={item.icon} />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            )}
          </aside>
        )}
        <main className="flex-1 h-full overflow-hidden">{children}</main>
      </div>
    </SidebarContext.Provider>
  )
}

