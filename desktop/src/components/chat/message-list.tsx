import { useRef, useEffect } from 'react'
import type { ChatMessage } from '@/api/types'
import { MessageBubble } from './message-bubble'
import { useGatewayStore } from '@/stores/gateway-store'

interface Props {
  messages: ChatMessage[]
  isStreaming: boolean
}

export function MessageList({ messages, isStreaming }: Props) {
  const endRef = useRef<HTMLDivElement>(null)
  const providerName = useGatewayStore(s => s.getProvider().name)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, messages[messages.length - 1]?.content])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-medium text-foreground mb-1">{providerName}</p>
          <p className="text-sm text-muted-foreground">发送消息开始对话</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
      {messages.map(msg => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      <div ref={endRef} />
    </div>
  )
}
