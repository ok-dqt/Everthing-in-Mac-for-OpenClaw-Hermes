import { useState, useEffect } from 'react'
import { hermesAPI, type Webhook } from '@/api/hermes-api'
import { PageShell, Loading, EmptyState, Badge } from '@/components/shared'

export function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ url: '', events: '' })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try { setWebhooks(await hermesAPI.getWebhooks()) }
      catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const create = async () => {
    try {
      const wh = await hermesAPI.createWebhook({ url: form.url, events: form.events.split(',').map(s => s.trim()) })
      setWebhooks(w => [...w, wh])
      setShowForm(false)
      setForm({ url: '', events: '' })
    } catch (e) { console.error(e) }
  }

  const remove = async (id: string) => {
    try {
      await hermesAPI.deleteWebhook(id)
      setWebhooks(w => w.filter(x => x.id !== id))
    } catch (e) { console.error(e) }
  }

  if (loading) return <PageShell title="Webhooks"><Loading /></PageShell>

  const actions = (
    <button onClick={() => setShowForm(!showForm)}
      className="text-xs px-3 py-1.5 rounded-md bg-brand text-white hover:bg-brand-active font-medium transition-colors">
      {showForm ? 'Cancel' : 'New Webhook'}
    </button>
  )

  return (
    <PageShell title="Webhooks" actions={actions}>
      <div className="max-w-2xl">
      {showForm && (
        <div className="mb-4 p-4 rounded-lg bg-card border border-border space-y-3">
          <input placeholder="URL" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-brand/40" />
          <input placeholder="Events (comma-separated)" value={form.events}
            onChange={e => setForm(f => ({ ...f, events: e.target.value }))}
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-brand/40" />
          <button onClick={create}
            className="text-xs px-3 py-1.5 rounded-md bg-brand text-white hover:bg-brand-active font-medium transition-colors">
            Create
          </button>
        </div>
      )}
      {webhooks.length === 0 ? <EmptyState message="No webhooks configured" /> : (
        <div className="space-y-2">
          {webhooks.map(w => (
            <div key={w.id} className="p-4 rounded-lg bg-card border border-border flex items-center justify-between">
              <div>
                <div className="text-sm font-mono text-foreground">{w.url}</div>
                <div className="flex gap-1 mt-1.5">
                  {w.events.map(e => <Badge key={e}>{e}</Badge>)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={w.active ? 'success' : 'default'}>{w.active ? 'Active' : 'Inactive'}</Badge>
                <button onClick={() => remove(w.id)} className="text-xs text-destructive hover:text-destructive/80 font-medium">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </PageShell>
  )
}
