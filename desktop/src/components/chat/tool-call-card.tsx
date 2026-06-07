import type { ToolCall } from '@/api/types'
import { Wrench, Check, Loader2 } from 'lucide-react'

interface Props {
  toolCall: ToolCall
}

export function ToolCallCard({ toolCall }: Props) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted border border-border rounded-lg px-3 py-1.5 mb-2">
      {toolCall.status === 'running'
        ? <Loader2 size={12} className="animate-spin text-brand" />
        : toolCall.status === 'complete'
        ? <Check size={12} className="text-success" />
        : <Wrench size={12} />
      }
      <span className="font-medium">{toolCall.name}</span>
    </div>
  )
}
