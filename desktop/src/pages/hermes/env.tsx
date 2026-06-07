import { useState, useEffect } from 'react'
import { hermesAPI, type EnvVar } from '@/api/hermes-api'
import { PageShell, Loading, EmptyState } from '@/components/shared'

export function EnvPage() {
  const [vars, setVars] = useState<EnvVar[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ key: '', value: '' })
  const [revealed, setRevealed] = useState<Record<string, string>>({})

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try { setVars(await hermesAPI.getEnv()) }
      catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const add = async () => {
    try {
      await hermesAPI.setEnv(form.key, form.value)
      setVars(v => [...v, { key: form.key, value: '••••', masked: true }])
      setShowForm(false)
      setForm({ key: '', value: '' })
    } catch (e) { console.error(e) }
  }

  const remove = async (key: string) => {
    try {
      await hermesAPI.deleteEnv(key)
      setVars(v => v.filter(x => x.key !== key))
    } catch (e) { console.error(e) }
  }

  const reveal = async (key: string) => {
    try {
      const { value } = await hermesAPI.revealEnv(key)
      setRevealed(r => ({ ...r, [key]: value }))
    } catch (e) { console.error(e) }
  }

  if (loading) return <PageShell title="Environment"><Loading /></PageShell>

  const actions = (
    <button onClick={() => setShowForm(!showForm)}
      className="text-xs px-3 py-1.5 rounded-md bg-brand text-white hover:bg-brand-active font-medium transition-colors">
      {showForm ? 'Cancel' : 'Add Variable'}
    </button>
  )

  return (
    <PageShell title="Environment Variables" actions={actions}>
      <div className="max-w-2xl">
      {showForm && (
        <div className="mb-4 p-4 rounded-lg bg-card border border-border space-y-3">
          <input placeholder="KEY" value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value }))}
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-brand/40" />
          <input placeholder="value" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-brand/40" type="password" />
          <button onClick={add}
            className="text-xs px-3 py-1.5 rounded-md bg-brand text-white hover:bg-brand-active font-medium transition-colors">
            Save
          </button>
        </div>
      )}
      {vars.length === 0 ? <EmptyState message="No environment variables" /> : (
        <div className="space-y-2">
          {vars.map(v => (
            <div key={v.key} className="p-4 rounded-lg bg-card border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono font-medium text-foreground">{v.key}</span>
                <span className="text-xs text-muted-foreground font-mono">
                  {revealed[v.key] ?? (v.masked ? '••••••••' : v.value)}
                </span>
              </div>
              <div className="flex gap-2">
                {v.masked && !revealed[v.key] && (
                  <button onClick={() => reveal(v.key)} className="text-xs text-brand hover:text-brand-active font-medium">Reveal</button>
                )}
                <button onClick={() => remove(v.key)} className="text-xs text-destructive hover:text-destructive/80 font-medium">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </PageShell>
  )
}
