import type { AgentProvider, AgentEvent, AgentEventHandler, StatusHandler } from './provider'
import type { ConnectionStatus, ChatMessage, Session } from './types'

class HermesProvider implements AgentProvider {
  readonly id = 'hermes'
  readonly name = 'Hermes'

  private ws: WebSocket | null = null
  private rpcId = 0
  private eventListeners: Set<AgentEventHandler> = new Set()
  private statusListeners: Set<StatusHandler> = new Set()
  private _status: ConnectionStatus = 'disconnected'
  private _sessionId: string | null = null
  private pendingRPC = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()
  private _port = 9119

  get status() { return this._status }

  configure(opts: { port: number; token?: string }) {
    this._port = opts.port
  }

  private setStatus(s: ConnectionStatus) {
    this._status = s
    this.statusListeners.forEach(fn => fn(s))
  }

  onStatus(fn: StatusHandler) {
    this.statusListeners.add(fn)
    return () => { this.statusListeners.delete(fn) }
  }

  onEvent(fn: AgentEventHandler) {
    this.eventListeners.add(fn)
    return () => { this.eventListeners.delete(fn) }
  }

  private async fetchSessionToken(baseUrl: string): Promise<string> {
    const res = await fetch(`${baseUrl}/hermes/`)
    const html = await res.text()
    const match = html.match(/window\.__HERMES_SESSION_TOKEN__="([^"]+)"/)
    if (!match) throw new Error('Cannot extract session token from gateway')
    return match[1]
  }

  async connect(baseUrl = '') {
    if (this._status === 'connected' || this._status === 'connecting') return
    if (this.ws) this.disconnect()
    this.setStatus('connecting')

    const token = await this.fetchSessionToken(baseUrl)
    const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${wsProtocol}//${location.host}/hermes/api/ws?token=${encodeURIComponent(token)}`

    return new Promise<void>((resolve, reject) => {
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        console.log('[hermes] connected')
      }

      this.ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data)
          this.handleMessage(msg, resolve)
        } catch (e) {
          console.warn('[hermes] parse error', e)
        }
      }

      this.ws.onerror = () => {
        this.setStatus('error')
        reject(new Error('WebSocket connection failed'))
      }

      this.ws.onclose = () => {
        this.setStatus('disconnected')
        this.ws = null
      }
    })
  }

  disconnect() {
    this.ws?.close()
    this.ws = null
    this._sessionId = null
    this.setStatus('disconnected')
  }

  sendMessage(text: string) {
    if (!this._sessionId) return
    this.sendRPC('prompt.submit', { session_id: this._sessionId, text })
  }

  abort() {
    if (!this._sessionId) return
    this.sendRPC('prompt.abort', { session_id: this._sessionId })
  }

  private handleMessage(msg: Record<string, unknown>, onReady?: (v: void) => void) {
    if (msg.method === 'event' && msg.params) {
      const params = msg.params as Record<string, unknown>
      const eventType = params.type as string
      if (eventType === 'gateway.ready') {
        this.setStatus('connected')
        onReady?.()
        this.initSession()
        return
      }
      const payload = (params.payload || {}) as Record<string, unknown>
      const mapped = this.mapEvent(eventType, payload)
      if (mapped) this.eventListeners.forEach(fn => fn(mapped))
      return
    }
    if (msg.id != null) {
      const id = typeof msg.id === 'number' ? msg.id : parseInt(msg.id as string)
      const pending = this.pendingRPC.get(id)
      if (pending) {
        this.pendingRPC.delete(id)
        if (msg.error) {
          pending.reject(new Error((msg.error as Record<string, unknown>).message as string || 'RPC error'))
        } else {
          pending.resolve(msg.result)
        }
        return
      }
      const result = msg.result as Record<string, unknown> | undefined
      if (result?.session_id) {
        this._sessionId = result.session_id as string
      }
    }
  }

  private mapEvent(type: string, payload: Record<string, unknown>): AgentEvent | null {
    switch (type) {
      case 'message.start':
      case 'message.delta':
      case 'message.complete':
      case 'tool.start':
      case 'tool.complete':
      case 'error':
        return { type: type as AgentEvent['type'], payload }
      default:
        return null
    }
  }

  private sendRPC(method: string, params: Record<string, unknown> = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    this.ws.send(JSON.stringify({ jsonrpc: '2.0', id: ++this.rpcId, method, params }))
  }

  private initSession() {
    this.sendRPC('session.create', {})
  }

  async listSessions(): Promise<Session[]> {
    const result = await this.sendRPCAsync('session.list', { limit: 200 }) as {
      sessions?: Array<{ id: string; title: string; started_at: number; message_count: number }>
    }
    if (!result?.sessions) return []
    return result.sessions.map(s => ({
      id: s.id,
      title: s.title || 'Untitled',
      createdAt: s.started_at * 1000,
      lastMessageAt: s.started_at * 1000
    }))
  }

  async loadHistory(sessionId: string): Promise<ChatMessage[]> {
    const result = await this.sendRPCAsync('session.resume', {
      session_id: sessionId,
      cols: 120
    }) as {
      session_id?: string
      messages?: Array<{ role: string; text: string }>
    }
    if (result?.session_id) {
      this._sessionId = result.session_id
    }
    if (!result?.messages) return []
    return result.messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        id: crypto.randomUUID(),
        role: m.role as 'user' | 'assistant',
        content: m.text || '',
        timestamp: Date.now()
      }))
  }

  async resumeSession(sessionId: string): Promise<void> {
    await this.loadHistory(sessionId)
  }

  async createSession(): Promise<string> {
    const result = await this.sendRPCAsync('session.create', {}) as { session_id?: string }
    const id = result?.session_id || ''
    if (id) this._sessionId = id
    return id
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.sendRPCAsync('session.delete', { session_id: sessionId })
  }

  async renameSession(sessionId: string, title: string): Promise<void> {
    await this.sendRPCAsync('session.rename', { session_id: sessionId, title })
  }

  rpc<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    return this.sendRPCAsync(method, params) as Promise<T>
  }

  get sessionId() { return this._sessionId }

  private sendRPCAsync(method: string, params: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return reject(new Error('Not connected'))
      }
      const id = ++this.rpcId
      this.pendingRPC.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ jsonrpc: '2.0', id, method, params }))
    })
  }
}

export const hermesProvider = new HermesProvider()
