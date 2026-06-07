import { useState, useEffect } from 'react'
import { hermesAPI, type McpServer, type McpCatalogItem } from '@/api/hermes-api'
import { PageShell, Loading, Badge, EmptyState } from '@/components/shared'

export function McpPage() {
  const [servers, setServers] = useState<McpServer[]>([])
  const [catalog, setCatalog] = useState<McpCatalogItem[]>([])
  const [tab, setTab] = useState<'servers' | 'catalog'>('servers')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [s, c] = await Promise.all([hermesAPI.getMcpServers(), hermesAPI.getMcpCatalog()])
        setServers(s)
        setCatalog(c)
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const install = async (id: string) => {
    try {
      await hermesAPI.installMcpServer(id)
      setCatalog(c => c.map(i => i.id === id ? { ...i, installed: true } : i))
    } catch (e) { console.error(e) }
  }

  if (loading) return <PageShell title="MCP Servers"><Loading /></PageShell>

  const actions = (
    <div className="flex gap-1">
      {(['servers', 'catalog'] as const).map(t => (
        <button key={t} onClick={() => setTab(t)}
          className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
            tab === t ? 'bg-card border border-border text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}>
          {t === 'servers' ? 'Servers' : 'Catalog'}
        </button>
      ))}
    </div>
  )

  return (
    <PageShell title="MCP Servers" actions={actions}>
      <div className="max-w-2xl">
      {tab === 'servers' ? (
        servers.length === 0 ? <EmptyState message="No MCP servers configured" /> : (
          <div className="space-y-2">
            {servers.map(s => (
              <div key={s.id} className="p-4 rounded-lg bg-card border border-border flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-foreground">{s.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.transport}{s.url ? ` · ${s.url}` : ''}</div>
                </div>
                <Badge variant={s.status === 'running' ? 'success' : 'default'}>{s.status}</Badge>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-2">
          {catalog.map(item => (
            <div key={item.id} className="p-4 rounded-lg bg-card border border-border flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">{item.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>
              </div>
              {item.installed ? (
                <Badge variant="success">Installed</Badge>
              ) : (
                <button onClick={() => install(item.id)}
                  className="text-xs px-3 py-1.5 rounded-md bg-brand text-white hover:bg-brand-active font-medium transition-colors">
                  Install
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      </div>
    </PageShell>
  )
}
