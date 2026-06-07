import { useState, useEffect } from 'react'
import { hermesAPI, type CronJob } from '@/api/hermes-api'
import { PageShell, Loading, EmptyState } from '@/components/shared'

export function CronPage() {
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', schedule: '', prompt: '', target: '' })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try { setJobs(await hermesAPI.getCronJobs()) }
      catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const create = async () => {
    try {
      const job = await hermesAPI.createCronJob(form)
      setJobs(j => [...j, job])
      setShowForm(false)
      setForm({ name: '', schedule: '', prompt: '', target: '' })
    } catch (e) { console.error(e) }
  }

  const remove = async (id: string) => {
    try {
      await hermesAPI.deleteCronJob(id)
      setJobs(j => j.filter(x => x.id !== id))
    } catch (e) { console.error(e) }
  }

  if (loading) return <PageShell title="Cron"><Loading /></PageShell>

  const actions = (
    <button onClick={() => setShowForm(!showForm)}
      className="text-xs px-3 py-1.5 rounded-md bg-brand text-white hover:bg-brand-active font-medium transition-colors">
      {showForm ? 'Cancel' : 'New Job'}
    </button>
  )

  return (
    <PageShell title="Cron Jobs" actions={actions}>
      <div className="max-w-2xl">
      {showForm && (
        <div className="mb-4 p-4 rounded-lg bg-card border border-border space-y-3">
          <input placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-brand/40" />
          <input placeholder="Target" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))}
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-brand/40" />
          <textarea placeholder="Prompt" value={form.prompt} onChange={e => setForm(f => ({ ...f, prompt: e.target.value }))}
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm h-20 resize-none focus:outline-none focus:border-brand/40" />
          <button onClick={create}
            className="text-xs px-3 py-1.5 rounded-md bg-brand text-white hover:bg-brand-active font-medium transition-colors">
            Create
          </button>
        </div>
      )}
      {jobs.length === 0 ? <EmptyState message="No cron jobs" /> : (
        <div className="space-y-2">
          {jobs.map(j => (
            <div key={j.id} className="p-4 rounded-lg bg-card border border-border flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">{j.name}</div>
                <div className="text-xs text-muted-foreground font-mono mt-0.5">{j.schedule}</div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[300px]">{j.prompt}</div>
              </div>
              <button onClick={() => remove(j.id)} className="text-xs text-destructive hover:text-destructive/80 font-medium">Delete</button>
            </div>
          ))}
        </div>
      )}
      </div>
    </PageShell>
  )
}
