import { useState, useEffect } from 'react'
import { hermesAPI, type Pairing } from '@/api/hermes-api'
import { PageShell, Loading, EmptyState, Badge } from '@/components/shared'

export function PairingPage() {
  const [pairings, setPairings] = useState<Pairing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try { setPairings(await hermesAPI.getPairings()) }
      catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const approve = async (id: string) => {
    try {
      await hermesAPI.approvePairing(id)
      setPairings(p => p.map(x => x.id === id ? { ...x, status: 'approved' } : x))
    } catch (e) { console.error(e) }
  }

  const revoke = async (id: string) => {
    try {
      await hermesAPI.revokePairing(id)
      setPairings(p => p.filter(x => x.id !== id))
    } catch (e) { console.error(e) }
  }

  if (loading) return <PageShell title="Pairing"><Loading /></PageShell>
  if (!pairings.length) return <PageShell title="Pairing"><EmptyState message="No paired devices" /></PageShell>

  return (
    <PageShell title="Device Pairing">
      <div className="space-y-2 max-w-2xl">
        {pairings.map(p => (
          <div key={p.id} className="p-4 rounded-lg bg-card border border-border flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-foreground">{p.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{p.device}</div>
              <div className="text-xs text-muted-foreground/60 mt-0.5">{new Date(p.paired_at * 1000).toLocaleDateString()}</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={p.status === 'approved' ? 'success' : p.status === 'pending' ? 'warning' : 'default'}>
                {p.status}
              </Badge>
              {p.status === 'pending' && (
                <button onClick={() => approve(p.id)}
                  className="text-xs px-3 py-1.5 rounded-md bg-success/10 text-success border border-success/20 hover:bg-success/20 font-medium transition-colors">
                  Approve
                </button>
              )}
              <button onClick={() => revoke(p.id)} className="text-xs text-destructive hover:text-destructive/80 font-medium">Revoke</button>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  )
}
