import type { ChatMessage } from '@/api/types'
import { MarkdownContent } from './markdown-content'
import { ToolCallCard } from './tool-call-card'

interface Props {
  message: ChatMessage
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${
        isUser
          ? 'bg-brand text-white rounded-2xl rounded-br-sm px-4 py-2.5'
          : 'bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3'
      }`}>
        {message.toolCalls?.map(tc => (
          <ToolCallCard key={tc.id} toolCall={tc} />
        ))}
        <div className={`text-sm leading-relaxed ${isUser ? 'text-white' : 'text-foreground'}`}>
          {isUser
            ? <p className="whitespace-pre-wrap">{message.content}</p>
            : <MarkdownContent content={message.content} />
          }
        </div>
        {message.isStreaming && (
          <span className="inline-block w-1.5 h-4 bg-brand animate-pulse ml-0.5 rounded-sm" />
        )}
      </div>
    </div>
  )
}
