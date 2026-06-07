import { useState, useEffect } from 'react'
import { hermesAPI, type SystemStats, type DoctorResult } from '@/api/hermes-api'
import { PageShell, Loading, Badge } from '@/components/shared'

export function SystemPage() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [doctor, setDoctor] = useState<DoctorResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try { setStats(await hermesAPI.getSystemStats()) }
      catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const runDiag = async () => {
    setRunning(true)
    try { setDoctor(await hermesAPI.runDoctor()) }
    catch (e) { console.error(e) }
    finally { setRunning(false) }
  }

  const backup = async () => {
    try {
      const { path } = await hermesAPI.createBackup()
      alert(`Backup saved to: ${path}`)
    } catch (e) { console.error(e) }
  }

  const restart = async () => {
    if (!confirm('Restart the gateway?')) return
    try { await hermesAPI.restartGateway() }
    catch (e) { console.error(e) }
  }

  if (loading) return <PageShell title="System"><Loading /></PageShell>

  return (
    <PageShell title="System">
      <div className="space-y-6 max-w-2xl">
        {stats && (
          <div className="grid grid-cols-2 gap-4">
            <InfoCard label="Version" value={stats.version} />
            <InfoCard label="Uptime" value={formatUptime(stats.uptime)} />
            <InfoCard label="Memory" value={`${stats.memory_mb} MB`} />
            <InfoCard label="Active Sessions" value={String(stats.sessions_active)} />
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={runDiag} disabled={running}
            className="text-xs px-3 py-1.5 rounded-md bg-card border border-border hover:border-brand/40 font-medium disabled:opacity-50 transition-colors">
            {running ? 'Running...' : 'Run Doctor'}
          </button>
          <button onClick={backup}
            className="text-xs px-3 py-1.5 rounded-md bg-card border border-border hover:border-brand/40 font-medium transition-colors">
            Backup
          </button>
          <button onClick={restart}
            className="text-xs px-3 py-1.5 rounded-md bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 font-medium transition-colors">
            Restart Gateway
          </button>
        </div>

        {doctor && (
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Doctor Results</h3>
            {doctor.checks.map((c, i) => (
              <div key={i} className="p-3 rounded-lg bg-card border border-border flex items-center gap-2">
                <Badge variant={c.status === 'ok' ? 'success' : c.status === 'warn' ? 'warning' : 'error'}>
                  {c.status}
                </Badge>
                <span className="text-sm text-foreground">{c.name}</span>
                {c.message && <span className="text-xs text-muted-foreground ml-auto">{c.message}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-lg bg-card border border-border">
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="text-sm font-medium mt-1.5 text-foreground">{value}</div>
    </div>
  )
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}
