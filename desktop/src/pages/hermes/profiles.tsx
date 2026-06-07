import { useState, useEffect } from 'react'
import { hermesAPI, type Profile } from '@/api/hermes-api'
import { PageShell, Loading, EmptyState } from '@/components/shared'

export function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try { setProfiles(await hermesAPI.getProfiles()) }
      catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const activate = async (name: string) => {
    try {
      await hermesAPI.setActiveProfile(name)
      setProfiles(p => p.map(pr => ({ ...pr, active: pr.name === name })))
    } catch (e) { console.error(e) }
  }

  if (loading) return <PageShell title="Profiles"><Loading /></PageShell>
  if (!profiles.length) return <PageShell title="Profiles"><EmptyState message="No profiles configured" /></PageShell>

  return (
    <PageShell title="Profiles">
      <div className="space-y-2 max-w-2xl">
        {profiles.map(p => (
          <div key={p.name}
            className={`p-4 rounded-lg border flex items-center justify-between ${
              p.active ? 'bg-brand-soft border-brand/30' : 'bg-card border-border'
            }`}>
            <div>
              <div className="text-sm font-medium text-foreground">{p.name}</div>
              {p.description && <div className="text-xs text-muted-foreground mt-0.5">{p.description}</div>}
            </div>
            {p.active ? (
              <span className="text-xs text-brand font-medium">Active</span>
            ) : (
              <button onClick={() => activate(p.name)}
                className="text-xs px-3 py-1.5 rounded-md bg-card border border-border hover:border-brand/40 font-medium transition-colors">
                Activate
              </button>
            )}
          </div>
        ))}
      </div>
    </PageShell>
  )
}
