import type { ConnectionStatus, ChatMessage, Session } from './types'

export type AgentEventType =
  | 'message.start'
  | 'message.delta'
  | 'message.complete'
  | 'tool.start'
  | 'tool.complete'
  | 'error'

export interface AgentEvent {
  type: AgentEventType
  payload: Record<string, unknown>
}

export type AgentEventHandler = (event: AgentEvent) => void
export type StatusHandler = (status: ConnectionStatus) => void

export interface AgentProvider {
  readonly id: string
  readonly name: string
  readonly status: ConnectionStatus

  configure(opts: { port: number; token?: string }): void
  connect(): Promise<void>
  disconnect(): void
  sendMessage(text: string): void
  abort(): void

  listSessions(): Promise<Session[]>
  loadHistory(sessionId: string): Promise<ChatMessage[]>
  resumeSession(sessionId: string): Promise<void>
  createSession(): Promise<string>
  deleteSession(sessionId: string): Promise<void>
  renameSession(sessionId: string, title: string): Promise<void>

  onEvent(handler: AgentEventHandler): () => void
  onStatus(handler: StatusHandler): () => void
}

export type ProviderType = 'hermes' | 'openclaw'
