import { useState, useRef, useEffect } from 'react'
import { useSessionStore } from '@/stores/session-store'
import { useGatewayStore } from '@/stores/gateway-store'

export function SessionList() {
  const sessions = useSessionStore(s => s.sessions)
  const activeSessionId = useSessionStore(s => s.activeSessionId)
  const selectSession = useSessionStore(s => s.selectSession)
  const createSession = useSessionStore(s => s.createSession)
  const deleteSession = useSessionStore(s => s.deleteSession)
  const renameSession = useSessionStore(s => s.renameSession)
  const loading = useSessionStore(s => s.loading)
  const status = useGatewayStore(s => s.status)

  const [menuId, setMenuId] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingId && inputRef.current) inputRef.current.focus()
  }, [editingId])

  useEffect(() => {
    const close = () => setMenuId(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  const handleContext = (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    setMenuId(id)
    setMenuPos({ x: e.clientX, y: e.clientY })
  }

  const startRename = (id: string) => {
    const s = sessions.find(x => x.id === id)
    setEditingId(id)
    setEditTitle(s?.title || '')
    setMenuId(null)
  }

  const commitRename = () => {
    if (editingId && editTitle.trim()) {
      renameSession(editingId, editTitle.trim())
    }
    setEditingId(null)
  }

  const handleDelete = (id: string) => {
    setMenuId(null)
    deleteSession(id)
  }

  if (status !== 'connected') {
    return <div className="p-3 text-xs text-muted-foreground">Not connected</div>
  }

  return (
    <div className="flex flex-col gap-0.5 px-2 overflow-y-auto">
      <button onClick={createSession}
        className="flex items-center gap-2 px-3 py-1.5 mb-1 rounded-lg text-xs text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground transition-colors font-medium">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        New Chat
      </button>

      {sessions.map(session => (
        <div key={session.id} className="relative group">
          {editingId === session.id ? (
            <input ref={inputRef} value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingId(null) }}
              className="w-full px-3 py-1.5 rounded-lg text-sm bg-sidebar-accent border border-border text-foreground outline-none" />
          ) : (
            <button
              onClick={() => selectSession(session.id)}
              onContextMenu={e => handleContext(e, session.id)}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-[13px] truncate transition-colors ${
                session.id === activeSessionId
                  ? 'bg-sidebar-accent text-foreground font-medium'
                  : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground'
              }`}>
              {session.title}
            </button>
          )}
          {editingId !== session.id && (
            <button
              onClick={e => handleContext(e, session.id)}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 hover:bg-sidebar-accent text-muted-foreground text-xs">
              ···
            </button>
          )}
        </div>
      ))}

      {loading && <div className="px-3 py-2 text-xs text-muted-foreground">Loading...</div>}
      {sessions.length === 0 && !loading && <div className="px-3 py-2 text-xs text-muted-foreground">No sessions</div>}

      {menuId && (
        <div className="fixed z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[140px]"
          style={{ left: menuPos.x, top: menuPos.y }}
          onClick={e => e.stopPropagation()}>
          <button onClick={() => startRename(menuId)}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-sidebar-accent text-foreground">
            Rename
          </button>
          <button onClick={() => handleDelete(menuId)}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-sidebar-accent text-destructive">
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
