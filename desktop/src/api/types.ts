export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  toolCalls?: ToolCall[]
  isStreaming?: boolean
}

export interface ToolCall {
  id: string
  name: string
  status: 'running' | 'complete' | 'error'
  result?: string
}

export interface Session {
  id: string
  title: string
  createdAt: number
  lastMessageAt: number
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'unavailable' | 'stopped'

export interface GatewayEvent {
  method: string
  params?: Record<string, unknown>
}
