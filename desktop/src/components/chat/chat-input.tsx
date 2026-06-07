import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send } from 'lucide-react'
import { hermesProvider } from '@/api/hermes-provider'
import { CLIENT_COMMANDS, getNavPath, type SlashCommand } from './slash-commands'

interface Props {
  onSend: (text: string) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState('')
  const [showPalette, setShowPalette] = useState(false)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [sysOutput, setSysOutput] = useState<string | null>(null)
  const [gatewayCmds, setGatewayCmds] = useState<SlashCommand[]>([])
  const [catalogLoaded, setCatalogLoaded] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const navigate = useNavigate()

  // Fetch command catalog from gateway on first `/` press
  useEffect(() => {
    if (!showPalette || catalogLoaded) return
    if (hermesProvider.status !== 'connected') return
    hermesProvider.rpc<{ pairs?: [string, string][] }>('commands.catalog', {})
      .then(r => {
        if (!r?.pairs) return
        const cmds: SlashCommand[] = r.pairs.map(([name, help]) => ({
          id: `gw-${name}`,
          label: `/${name}`,
          description: help,
          category: 'gateway' as const
        }))
        setGatewayCmds(cmds)
        setCatalogLoaded(true)
      })
      .catch(() => setCatalogLoaded(true))
  }, [showPalette, catalogLoaded])

  // Merge gateway commands with client navigation commands (dedup by name)
  const allCommands = (() => {
    const gwNames = new Set(gatewayCmds.map(c => c.label))
    const clientOnly = CLIENT_COMMANDS.filter(c => !gwNames.has(c.label))
    return [...gatewayCmds, ...clientOnly]
  })()

  const query = showPalette ? text.slice(1).toLowerCase() : ''
  const filtered = showPalette
    ? allCommands.filter(c =>
        c.label.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query)
      ).slice(0, 20)
    : []

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px'
    }
  }, [text])

  useEffect(() => { setSelectedIdx(0) }, [query])

  useEffect(() => {
    if (sysOutput) {
      const t = setTimeout(() => setSysOutput(null), 6000)
      return () => clearTimeout(t)
    }
  }, [sysOutput])

  const executeSlashViaGateway = useCallback(async (command: string) => {
    const sessionId = hermesProvider.sessionId || ''
    try {
      const r = await hermesProvider.rpc<{ output?: string; warning?: string }>(
        'slash.exec',
        { command: command.replace(/^\/+/, ''), session_id: sessionId }
      )
      const body = r?.output || `/${command}: done`
      const msg = r?.warning ? `⚠ ${r.warning}\n${body}` : body
      setSysOutput(msg)
    } catch {
      // Fallback: try command.dispatch
      try {
        const name = command.replace(/^\/+/, '').split(/\s+/)[0]
        const arg = command.replace(/^\/+\S*\s*/, '')
        const d = await hermesProvider.rpc<{ type: string; output?: string; message?: string }>(
          'command.dispatch',
          { name, arg, session_id: sessionId }
        )
        if (d?.type === 'send' && d.message) {
          onSend(d.message)
        } else if (d?.type === 'exec' || d?.type === 'plugin') {
          setSysOutput(d.output || '(done)')
        } else {
          // Send raw to agent as fallback
          onSend(command)
        }
      } catch {
        onSend(command)
      }
    }
  }, [onSend])

  const executeCommand = useCallback((cmd: SlashCommand) => {
    setShowPalette(false)
    setText('')

    // Client-side navigation commands
    const navPath = getNavPath(cmd.id.replace('gw-', ''))
    if (cmd.category === 'navigate' && navPath) {
      navigate(navPath)
      return
    }

    // Gateway commands via slash.exec RPC
    if (hermesProvider.status === 'connected') {
      executeSlashViaGateway(cmd.label)
    } else {
      onSend(cmd.label)
    }
  }, [navigate, executeSlashViaGateway, onSend])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setText(val)
    if (val.startsWith('/') && val.indexOf('\n') === -1) {
      setShowPalette(true)
    } else {
      setShowPalette(false)
    }
  }

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return

    if (showPalette && filtered.length > 0) {
      executeCommand(filtered[selectedIdx])
      return
    }

    // If it looks like a slash command, execute via gateway
    if (trimmed.startsWith('/') && hermesProvider.status === 'connected') {
      setShowPalette(false)
      setText('')
      executeSlashViaGateway(trimmed)
      return
    }

    onSend(trimmed)
    setText('')
    setShowPalette(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showPalette && filtered.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIdx(i => (i + 1) % filtered.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIdx(i => (i - 1 + filtered.length) % filtered.length)
        return
      }
      if (e.key === 'Tab') {
        e.preventDefault()
        const cmd = filtered[selectedIdx]
        setText(cmd.label + ' ')
        setShowPalette(false)
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowPalette(false)
        return
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const categoryTag = (c: string) =>
    c === 'gateway' ? 'GW' : c === 'navigate' ? 'NAV' : 'CLI'

  return (
    <div className="border-t border-border p-4 shrink-0 relative">
      {sysOutput && (
        <div className="absolute bottom-full left-4 right-4 mb-2 bg-card border border-border rounded-lg px-4 py-3 text-xs text-foreground whitespace-pre-wrap shadow-lg max-h-[200px] overflow-y-auto font-mono">
          {sysOutput}
        </div>
      )}
      {showPalette && filtered.length > 0 && (
        <div className="absolute bottom-full left-4 right-4 mb-2 bg-card border border-border rounded-xl shadow-xl max-h-[320px] overflow-y-auto">
          <div className="px-3 py-2 text-[10px] text-muted-foreground uppercase tracking-wider border-b border-border flex items-center justify-between">
            <span>Commands — {filtered.length} matches</span>
            <span className="text-[9px] opacity-60">↑↓ navigate · Enter exec · Tab complete · Esc close</span>
          </div>
          {filtered.map((cmd, i) => (
            <button key={cmd.id}
              onMouseDown={e => { e.preventDefault(); executeCommand(cmd) }}
              onMouseEnter={() => setSelectedIdx(i)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                i === selectedIdx ? 'bg-muted' : 'hover:bg-muted/50'
              }`}>
              <span className="text-xs font-mono text-brand min-w-[100px] shrink-0">{cmd.label}</span>
              <span className="text-xs text-foreground/80 flex-1 truncate">{cmd.description}</span>
              <span className="text-[9px] font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-muted">{categoryTag(cmd.category)}</span>
            </button>
          ))}
        </div>
      )}
      <div className="flex items-end gap-3 bg-muted border border-border rounded-xl px-4 py-3">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="输入消息... (/ 打开命令面板)"
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none max-h-[160px]"
        />
        <button
          onClick={handleSubmit}
          disabled={disabled || !text.trim()}
          className="p-2 rounded-lg bg-brand text-white hover:bg-brand-active disabled:opacity-30 disabled:bg-muted-foreground transition-colors"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}
