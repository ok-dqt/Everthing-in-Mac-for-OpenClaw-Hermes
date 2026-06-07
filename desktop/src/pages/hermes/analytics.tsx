import { useState, useEffect } from 'react'
import { hermesAPI, type SessionStats } from '@/api/hermes-api'
import { PageShell, Loading } from '@/components/shared'

export function AnalyticsPage() {
  const [stats, setStats] = useState<SessionStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try { setStats(await hermesAPI.getSessionStats()) }
      catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  if (loading) return <PageShell title="Analytics"><Loading /></PageShell>

  return (
    <PageShell title="Analytics">
      <div className="grid grid-cols-2 gap-4 max-w-2xl">
        <StatCard label="Total Sessions" value={stats?.total ?? 0} />
        <StatCard label="Today" value={stats?.today ?? 0} />
        <StatCard label="This Week" value={stats?.thisWeek ?? 0} />
        {stats?.totalTokens != null && <StatCard label="Total Tokens" value={stats.totalTokens.toLocaleString()} />}
      </div>
      <div className="mt-6 flex gap-3">
        <PruneButton />
      </div>
    </PageShell>
  )
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="p-4 rounded-lg bg-card border border-border">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="text-2xl font-semibold mt-1.5 text-foreground">{value}</div>
    </div>
  )
}

function PruneButton() {
  const [days, setDays] = useState(30)
  const prune = async () => {
    if (!confirm(`Delete sessions older than ${days} days?`)) return
    try { await hermesAPI.pruneSessions(days) }
    catch (e) { console.error(e) }
  }
  return (
    <div className="flex items-center gap-2">
      <input type="number" value={days} onChange={e => setDays(Number(e.target.value))}
        className="w-16 bg-background border border-border rounded-md px-2 py-1.5 text-sm focus:outline-none focus:border-brand/40" />
      <button onClick={prune}
        className="text-xs px-3 py-1.5 rounded-md bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 font-medium transition-colors">
        Prune older than {days}d
      </button>
    </div>
  )
}
