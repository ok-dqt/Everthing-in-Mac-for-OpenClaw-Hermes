import { useState, useEffect } from 'react'
import { hermesAPI, type ModelOptions } from '@/api/hermes-api'
import { PageShell, Loading } from '@/components/shared'

export function ModelsPage() {
  const [data, setData] = useState<ModelOptions | null>(null)
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState(false)

  const load = async () => {
    setLoading(true)
    try { setData(await hermesAPI.getModelOptions()) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const switchModel = async (model: string, provider: string) => {
    setSwitching(true)
    try {
      await hermesAPI.setModel(model, provider)
      await load()
    } finally { setSwitching(false) }
  }

  if (loading) return <PageShell title="Models"><Loading /></PageShell>

  return (
    <PageShell title="Models">
      <div className="space-y-6 max-w-2xl">
        {data?.current && (
          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Current Model</div>
            <div className="text-sm font-medium text-foreground">{data.current.model}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{data.current.provider}</div>
          </div>
        )}
        {data?.providers.map(p => (
          <div key={p.id} className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{p.name}</h3>
            <div className="grid gap-2">
              {p.models.map(m => {
                const active = data.current.model === m.id && data.current.provider === p.id
                return (
                  <button key={m.id} disabled={active || switching}
                    onClick={() => switchModel(m.id, p.id)}
                    className={`text-left p-3 rounded-lg border transition-colors ${
                      active ? 'border-brand bg-brand-soft' : 'border-border hover:border-brand/40 bg-background'
                    } disabled:opacity-50`}>
                    <div className="text-sm font-medium">{m.name}</div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  )
}
