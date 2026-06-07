import { useState, useEffect } from 'react'
import { hermesAPI } from '@/api/hermes-api'
import { PageShell, Loading } from '@/components/shared'

export function ConfigPage() {
  const [config, setConfig] = useState<Record<string, unknown> | null>(null)
  const [raw, setRaw] = useState('')
  const [mode, setMode] = useState<'tree' | 'raw'>('tree')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [c, r] = await Promise.all([hermesAPI.getConfig(), hermesAPI.getConfigRaw()])
        setConfig(c)
        setRaw(typeof r === 'string' ? r : JSON.stringify(r, null, 2))
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const parsed = JSON.parse(raw)
      await hermesAPI.updateConfig(parsed)
      setConfig(parsed)
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  if (loading) return <PageShell title="Config"><Loading /></PageShell>

  const actions = (
    <div className="flex items-center gap-2">
      <button onClick={() => setMode(mode === 'tree' ? 'raw' : 'tree')}
        className="text-xs px-3 py-1.5 rounded-md bg-card border border-border hover:border-brand/40 font-medium transition-colors">
        {mode === 'tree' ? 'Raw' : 'Tree'}
      </button>
      {mode === 'raw' && (
        <button onClick={save} disabled={saving}
          className="text-xs px-3 py-1.5 rounded-md bg-brand text-white hover:bg-brand-active disabled:opacity-50 font-medium transition-colors">
          Save
        </button>
      )}
    </div>
  )

  return (
    <PageShell title="Config" actions={actions}>
      {mode === 'raw' ? (
        <textarea value={raw} onChange={e => setRaw(e.target.value)}
          className="w-full h-[calc(100vh-10rem)] bg-surface-dark border border-border-dark rounded-lg p-4 text-xs font-mono text-on-dark resize-none focus:outline-none focus:border-brand/40"
          spellCheck={false} />
      ) : (
        <div className="space-y-2 max-w-2xl">
          {config && Object.entries(config).map(([key, value]) => (
            <div key={key} className="p-4 rounded-lg bg-card border border-border">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{key}</div>
              <pre className="text-sm mt-1.5 font-mono break-all whitespace-pre-wrap text-foreground">
                {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  )
}
