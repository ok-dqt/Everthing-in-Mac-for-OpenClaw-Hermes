import { useState, useEffect } from 'react'
import { hermesAPI, type Plugin, type PluginHubItem } from '@/api/hermes-api'
import { PageShell, Loading, EmptyState } from '@/components/shared'

export function PluginsPage() {
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [hub, setHub] = useState<PluginHubItem[]>([])
  const [tab, setTab] = useState<'installed' | 'hub'>('installed')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [p, h] = await Promise.all([hermesAPI.getPlugins(), hermesAPI.getPluginHub()])
        setPlugins(p)
        setHub(h)
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const install = async (id: string) => {
    try {
      await hermesAPI.installPlugin(id)
      setHub(h => h.map(i => i.id === id ? { ...i, installed: true } : i))
    } catch (e) { console.error(e) }
  }

  const remove = async (id: string) => {
    try {
      await hermesAPI.removePlugin(id)
      setPlugins(p => p.filter(i => i.id !== id))
    } catch (e) { console.error(e) }
  }

  if (loading) return <PageShell title="Plugins"><Loading /></PageShell>

  const actions = (
    <div className="flex gap-1">
      {(['installed', 'hub'] as const).map(t => (
        <button key={t} onClick={() => setTab(t)}
          className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
            tab === t ? 'bg-card border border-border text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}>
          {t === 'installed' ? 'Installed' : 'Hub'}
        </button>
      ))}
    </div>
  )

  return (
    <PageShell title="Plugins" actions={actions}>
      <div className="max-w-2xl">
      {tab === 'installed' ? (
        plugins.length === 0 ? <EmptyState message="No plugins installed" /> : (
          <div className="space-y-2">
            {plugins.map(p => (
              <div key={p.id} className="p-4 rounded-lg bg-card border border-border flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-foreground">{p.name}</div>
                  {p.description && <div className="text-xs text-muted-foreground mt-0.5">{p.description}</div>}
                </div>
                <button onClick={() => remove(p.id)} className="text-xs text-destructive hover:text-destructive/80 font-medium">Remove</button>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-2">
          {hub.map(item => (
            <div key={item.id} className="p-4 rounded-lg bg-card border border-border flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">{item.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>
              </div>
              {item.installed ? (
                <span className="text-xs text-success font-medium">Installed</span>
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
