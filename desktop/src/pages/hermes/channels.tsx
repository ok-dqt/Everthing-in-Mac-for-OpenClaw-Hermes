import { useState, useEffect } from 'react'
import { hermesAPI, type Channel } from '@/api/hermes-api'
import { PageShell, Loading, EmptyState, Badge } from '@/components/shared'

export function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try { setChannels(await hermesAPI.getChannels()) }
      catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  if (loading) return <PageShell title="Channels"><Loading /></PageShell>
  if (!channels.length) return <PageShell title="Channels"><EmptyState message="No channels configured" /></PageShell>

  return (
    <PageShell title="Channels">
      <div className="space-y-2 max-w-2xl">
        {channels.map(c => (
          <div key={c.id} className="p-4 rounded-lg bg-card border border-border flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-foreground">{c.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{c.type}</div>
            </div>
            <Badge variant={c.status === 'active' ? 'success' : 'default'}>{c.status}</Badge>
          </div>
        ))}
      </div>
    </PageShell>
  )
}
