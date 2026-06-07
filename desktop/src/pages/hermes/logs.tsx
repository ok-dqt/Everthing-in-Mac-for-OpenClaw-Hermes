import { useState, useEffect, useRef } from 'react'
import { useGatewayStore } from '@/stores/gateway-store'
import { PageShell } from '@/components/shared'

interface LogEntry { level: string; message: string; timestamp: string }

export function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filter, setFilter] = useState('')
  const [level, setLevel] = useState<string>('all')
  const bottomRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const { providers } = useGatewayStore()

  useEffect(() => {
    const hermes = providers.hermes
    if (hermes.status !== 'connected') return

    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${proto}//${location.host}/hermes/api/ws/logs`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onmessage = (ev) => {
      try {
        const entry = JSON.parse(ev.data) as LogEntry
        setLogs(prev => [...prev.slice(-500), entry])
      } catch {}
    }

    return () => { ws.close() }
  }, [providers.hermes.status])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const filtered = logs.filter(l => {
    if (level !== 'all' && l.level !== level) return false
    if (filter && !l.message.toLowerCase().includes(filter.toLowerCase())) return false
    return true
  })

  const levelColor = (l: string) => {
    switch (l) {
      case 'error': return 'text-destructive'
      case 'warn': return 'text-warning'
      case 'info': return 'text-accent-teal'
      default: return 'text-muted-foreground'
    }
  }

  return (
    <PageShell title="Logs">
      <div className="flex gap-2 mb-4">
        <input placeholder="Filter..." value={filter} onChange={e => setFilter(e.target.value)}
          className="flex-1 bg-background border border-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-brand/40" />
        <select value={level} onChange={e => setLevel(e.target.value)}
          className="bg-background border border-border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:border-brand/40">
          <option value="all">All</option>
          <option value="error">Error</option>
          <option value="warn">Warn</option>
          <option value="info">Info</option>
          <option value="debug">Debug</option>
        </select>
        <button onClick={() => setLogs([])}
          className="text-xs px-3 py-1.5 rounded-md bg-card border border-border hover:border-brand/40 font-medium transition-colors">
          Clear
        </button>
      </div>
      <div className="font-mono text-xs space-y-0.5 max-h-[calc(100vh-12rem)] overflow-y-auto bg-surface-dark rounded-lg p-4 border border-border-dark">
        {filtered.map((l, i) => (
          <div key={i} className="flex gap-2">
            <span className="text-on-dark-soft/50 shrink-0">{l.timestamp?.slice(11, 19)}</span>
            <span className={`shrink-0 w-12 ${levelColor(l.level)}`}>{l.level}</span>
            <span className="text-on-dark break-all">{l.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </PageShell>
  )
}
