import { useState, useEffect } from 'react'
import { hermesAPI, type Skill } from '@/api/hermes-api'
import { PageShell, Loading, EmptyState } from '@/components/shared'

export function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try { setSkills(await hermesAPI.getSkills()) }
    catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const toggle = async (name: string, enabled: boolean) => {
    try {
      await hermesAPI.toggleSkill(name, !enabled)
      setSkills(s => s.map(sk => sk.name === name ? { ...sk, enabled: !enabled } : sk))
    } catch (e) { console.error(e) }
  }

  if (loading) return <PageShell title="Skills"><Loading /></PageShell>
  if (!skills.length) return <PageShell title="Skills"><EmptyState message="No skills installed" /></PageShell>

  return (
    <PageShell title="Skills">
      <div className="space-y-2 max-w-2xl">
        {skills.map(s => (
          <div key={s.name} className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
            <div>
              <div className="text-sm font-medium text-foreground">{s.name}</div>
              {s.description && <div className="text-xs text-muted-foreground mt-0.5">{s.description}</div>}
              {s.source && <div className="text-xs text-muted-foreground/60 mt-0.5">{s.source}</div>}
            </div>
            <button onClick={() => toggle(s.name, s.enabled)}
              className={`w-9 h-5 rounded-full transition-colors relative ${s.enabled ? 'bg-brand' : 'bg-border'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${s.enabled ? 'left-[18px]' : 'left-0.5'}`} />
            </button>
          </div>
        ))}
      </div>
    </PageShell>
  )
}
