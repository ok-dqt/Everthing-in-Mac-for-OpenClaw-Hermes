import type { AgentProvider, AgentEvent, AgentEventHandler, StatusHandler } from './provider'
import type { ConnectionStatus, ChatMessage, Session } from './types'

class OpenClawProvider implements AgentProvider {
  readonly id = 'openclaw'
  readonly name = 'OpenClaw'

  private ws: WebSocket | null = null
  private reqId = 0
  private eventListeners: Set<AgentEventHandler> = new Set()
  private statusListeners: Set<StatusHandler> = new Set()
  private _status: ConnectionStatus = 'disconnected'
  private pendingRequests = new Map<string, {
    resolve: (v: unknown) => void
    reject: (e: Error) => void
  }>()
  private sessionKey: string | null = null
  private streaming = false
  private token = ''
  private _port = 18789

  get status() { return this._status }

  configure(opts: { port: number; token?: string }) {
    this._port = opts.port
    if (opts.token) this.token = opts.token
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

  async connect() {
    if (this._status === 'connected' || this._status === 'connecting') return
    if (this.ws) this.disconnect()
    this.setStatus('connecting')

    const wsProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${wsProtocol}//${location.host}/openclaw-ws`

    return new Promise<void>((resolve, reject) => {
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        console.log('[openclaw] socket opened, waiting for challenge...')
      }

      this.ws.onmessage = (ev) => {
        try {
          const frame = JSON.parse(ev.data)
          this.handleFrame(frame, resolve)
        } catch (e) {
          console.warn('[openclaw] parse error', e)
        }
      }

      this.ws.onerror = () => {
        this.setStatus('error')
        reject(new Error('OpenClaw WebSocket connection failed'))
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
    this.sessionKey = null
    this.setStatus('disconnected')
  }

  sendMessage(text: string) {
    const key = this.sessionKey || 'default'
    this.streaming = false
    this.sendRequest('chat.send', {
      sessionKey: key,
      message: text,
      idempotencyKey: crypto.randomUUID()
    }).catch(e => console.warn('[openclaw] chat.send failed:', e))
  }

  abort() {
    const key = this.sessionKey || 'default'
    this.sendRequest('chat.abort', { sessionKey: key }).catch(() => {})
  }

  private handleFrame(
    frame: Record<string, unknown>,
    onConnected?: (v: void) => void
  ) {
    const type = frame.type as string

    if (type === 'event') {
      this.handleEvent(frame, onConnected)
      return
    }

    if (type === 'res') {
      this.handleResponse(frame)
      return
    }
  }

  private handleEvent(
    frame: Record<string, unknown>,
    onConnected?: (v: void) => void
  ) {
    const event = frame.event as string
    const payload = (frame.payload || {}) as Record<string, unknown>

    if (event === 'connect.challenge') {
      const nonce = payload.nonce as string
      if (!nonce) {
        console.error('[openclaw] challenge missing nonce')
        return
      }
      this.sendConnectWithToken(nonce, onConnected)
      return
    }

    if (event === 'chat') {
      this.handleChatEvent(payload)
      return
    }
  }

  private handleChatEvent(payload: Record<string, unknown>) {
    const state = payload.state as string
    switch (state) {
      case 'delta': {
        if (!this.streaming) {
          this.streaming = true
          this.emit({ type: 'message.start', payload: {} })
        }
        const deltaText = (payload.deltaText || '') as string
        if (deltaText) {
          this.emit({ type: 'message.delta', payload: { text: deltaText } })
        }
        break
      }
      case 'final':
        this.emit({ type: 'message.complete', payload })
        break
      case 'error':
        this.emit({ type: 'error', payload: { message: payload.errorMessage || 'Unknown error' } })
        break
      case 'aborted':
        this.emit({ type: 'message.complete', payload })
        break
    }
  }

  private handleResponse(frame: Record<string, unknown>) {
    const id = frame.id as string
    const pending = this.pendingRequests.get(id)
    if (!pending) return

    this.pendingRequests.delete(id)
    if (frame.ok) {
      pending.resolve(frame.payload)
    } else {
      const error = frame.error as Record<string, unknown> | undefined
      pending.reject(new Error(error?.message as string || 'Request failed'))
    }
  }

  private sendConnectWithToken(nonce: string, onConnected?: (v: void) => void) {
    const id = this.nextId()
    const connectParams = {
      minProtocol: 4,
      maxProtocol: 4,
      client: {
        id: 'openclaw-tui',
        version: '1.0.0',
        platform: 'darwin',
        mode: 'cli'
      },
      auth: { token: this.token },
      role: 'operator',
      scopes: ['operator.admin', 'operator.read', 'operator.write', 'operator.approvals']
    }

    this.pendingRequests.set(id, {
      resolve: () => {
        console.log('[openclaw] connected, hello-ok received')
        this.sessionKey = `desktop-${crypto.randomUUID().slice(0, 8)}`
        this.subscribeMessages()
        this.setStatus('connected')
        onConnected?.()
      },
      reject: (err) => {
        console.error('[openclaw] connect failed:', err)
        this.setStatus('error')
      }
    })

    this.sendFrame({ type: 'req', id, method: 'connect', params: connectParams })
  }

  private subscribeMessages() {
    if (!this.sessionKey) return
    this.sendRequest('sessions.messages.subscribe', { key: this.sessionKey }).catch(() => {})
  }

  private emit(event: AgentEvent) {
    this.eventListeners.forEach(fn => fn(event))
  }

  private sendRequest(method: string, params: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = this.nextId()
      this.pendingRequests.set(id, { resolve, reject })
      this.sendFrame({ type: 'req', id, method, params })
    })
  }

  async listSessions(): Promise<Session[]> {
    const result = await this.sendRequest('sessions.list', {
      includeGlobal: true,
      limit: 50
    }) as { sessions?: Array<{ key: string; title?: string; label?: string; createdAt?: number; lastActivity?: number }> }
    if (!result?.sessions) return []
    return result.sessions.map(s => ({
      id: s.key,
      title: s.title || s.label || s.key,
      createdAt: s.createdAt || Date.now(),
      lastMessageAt: s.lastActivity || s.createdAt || Date.now()
    }))
  }

  async loadHistory(sessionKey: string): Promise<ChatMessage[]> {
    const result = await this.sendRequest('chat.history', {
      sessionKey,
      limit: 200,
      agentId: null
    }) as { messages?: Array<{ role: string; content: string; id?: string }> }
    if (!result?.messages) return []
    return result.messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        id: m.id || crypto.randomUUID(),
        role: m.role as 'user' | 'assistant',
        content: m.content || '',
        timestamp: Date.now()
      }))
  }

  async resumeSession(sessionKey: string): Promise<void> {
    this.sessionKey = sessionKey
    await this.sendRequest('sessions.messages.subscribe', { key: sessionKey })
  }

  async createSession(): Promise<string> {
    const result = await this.sendRequest('sessions.create', {}) as { key?: string }
    const key = result?.key || ''
    if (key) this.sessionKey = key
    return key
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.sendRequest('sessions.delete', { key: sessionId })
  }

  async renameSession(sessionId: string, title: string): Promise<void> {
    await this.sendRequest('sessions.rename', { key: sessionId, title })
  }

  private sendFrame(frame: Record<string, unknown>) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    this.ws.send(JSON.stringify(frame))
  }

  private nextId(): string {
    return `req-${++this.reqId}`
  }
}

export const openclawProvider = new OpenClawProvider()
