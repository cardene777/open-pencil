import * as awarenessProtocol from 'y-protocols/awareness'
import type { Awareness } from 'y-protocols/awareness'
import * as syncProtocol from 'y-protocols/sync'
import { createEncoder, length as encoderLength, toUint8Array } from 'lib0/encoding'
import { createDecoder } from 'lib0/decoding'
import type * as Y from 'yjs'

/**
 * server-mediated yjs sync provider。 server 上の `yjs-hub` と 1 board = 1 room で
 * 双方向 sync する。 message wire format は `packages/api/src/ws/yjs-message.ts` の
 * tag (0x00 sync / 0x01 awareness) に準拠。
 *
 * P2P (`webrtc-provider.ts`) と並行して動かしても safe (両 channel が同じ Y.Doc を
 * 観測するため update が重複適用されるが yjs CRDT が idempotent)。
 */

const YJS_TAG_SYNC = 0x00
const YJS_TAG_AWARENESS = 0x01

const RECONNECT_BACKOFFS_MS = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000, 60_000] as const

const REMOTE_HUB_ORIGIN = Symbol('inkly-hub-remote')

export type YjsHubReady = {
  /** initial syncStep1 を server から受信し、 syncStep2 で同期完了 */
  synced: boolean
}

export type YjsHubProviderConnection = {
  disconnect: () => void
  ready: Promise<YjsHubReady>
  /** test / debug 用 ... 内部 socket 状態 */
  isConnected: () => boolean
}

export interface YjsHubProviderOptions {
  boardId: string
  ydoc: Y.Doc
  awareness: Awareness
  /** default https → wss / http → ws */
  protocol?: 'ws:' | 'wss:'
  /** default `window.location.host` */
  host?: string
  /** 接続失敗時 P2P fallback を起動する callback (caller が webrtc-provider を呼ぶ) */
  onFallback?: () => void
  /** unit test 用に WebSocket factory を差し替える */
  webSocketFactory?: (url: string) => WebSocket
}

function defaultUrl(boardId: string, protocol?: 'ws:' | 'wss:', host?: string) {
  const proto = protocol ?? (window.location.protocol === 'https:' ? 'wss:' : 'ws:')
  const h = host ?? window.location.host
  return `${proto}//${h}/api/ws/yjs/${encodeURIComponent(boardId)}`
}

function wrap(tag: number, payload: Uint8Array): Uint8Array {
  const out = new Uint8Array(payload.length + 1)
  out[0] = tag
  out.set(payload, 1)
  return out
}

function decodeFrame(raw: ArrayBuffer | Uint8Array | string):
  | { tag: number; payload: Uint8Array }
  | null {
  let bytes: Uint8Array
  if (typeof raw === 'string') {
    // server-status text frame は debug 用、 sync には使わない
    return null
  } else if (raw instanceof Uint8Array) {
    bytes = raw
  } else {
    bytes = new Uint8Array(raw)
  }
  if (bytes.length === 0) return null
  const tag = bytes[0]
  if (typeof tag !== 'number') return null
  return { tag, payload: bytes.subarray(1) }
}

export function connectYjsHubProvider(options: YjsHubProviderOptions): YjsHubProviderConnection {
  const url = defaultUrl(options.boardId, options.protocol, options.host)
  let socket: WebSocket | null = null
  let disposed = false
  let synced = false
  let reconnectAttempt = 0
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let fallbackTimer: ReturnType<typeof setTimeout> | null = null
  let fallbackInvoked = false
  let resolveReady: ((value: YjsHubReady) => void) | null = null
  let rejectReady: ((reason?: unknown) => void) | null = null

  const ready = new Promise<YjsHubReady>((resolve, reject) => {
    resolveReady = resolve
    rejectReady = reject
  })

  function scheduleFallback() {
    if (fallbackInvoked || !options.onFallback) return
    if (fallbackTimer) return
    fallbackTimer = setTimeout(() => {
      fallbackTimer = null
      if (fallbackInvoked || disposed) return
      if (synced) return
      fallbackInvoked = true
      options.onFallback?.()
    }, 1_000)
  }

  function clearFallback() {
    if (fallbackTimer) {
      clearTimeout(fallbackTimer)
      fallbackTimer = null
    }
  }

  function sendIfOpen(bytes: Uint8Array) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return
    // WebSocket.send は ArrayBuffer / Blob を期待する。 SharedArrayBuffer 由来の
    // Uint8Array を弾くためまっさらな ArrayBuffer に copy してから渡す。
    const copy = new Uint8Array(bytes.length)
    copy.set(bytes)
    socket.send(copy.buffer)
  }

  function broadcastUpdateToHub(update: Uint8Array, origin: unknown) {
    if (origin === REMOTE_HUB_ORIGIN) return
    const encoder = createEncoder()
    syncProtocol.writeUpdate(encoder, update)
    sendIfOpen(wrap(YJS_TAG_SYNC, toUint8Array(encoder)))
  }

  function broadcastAwarenessToHub(
    { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown
  ) {
    if (origin === REMOTE_HUB_ORIGIN) return
    const changedClients = [...added, ...updated, ...removed]
    if (changedClients.length === 0) return
    const update = awarenessProtocol.encodeAwarenessUpdate(options.awareness, changedClients)
    sendIfOpen(wrap(YJS_TAG_AWARENESS, update))
  }

  function handleMessage(event: MessageEvent<ArrayBuffer | Blob | string>) {
    if (event.data instanceof Blob) {
      void event.data.arrayBuffer().then((buffer) => {
        const decoded = decodeFrame(buffer)
        if (!decoded) return
        applyDecoded(decoded.tag, decoded.payload)
      })
      return
    }
    const decoded = decodeFrame(event.data)
    if (!decoded) return
    applyDecoded(decoded.tag, decoded.payload)
  }

  function applyDecoded(tag: number, payload: Uint8Array) {
    if (tag === YJS_TAG_SYNC) {
      const decoder = createDecoder(payload)
      const encoder = createEncoder()
      const messageType = syncProtocol.readSyncMessage(
        decoder,
        encoder,
        options.ydoc,
        REMOTE_HUB_ORIGIN
      )
      if (encoderLength(encoder) > 0) {
        sendIfOpen(wrap(YJS_TAG_SYNC, toUint8Array(encoder)))
      }
      if (messageType === syncProtocol.messageYjsSyncStep2 && !synced) {
        synced = true
        clearFallback()
        resolveReady?.({ synced: true })
        resolveReady = null
        rejectReady = null
      }
      return
    }

    if (tag === YJS_TAG_AWARENESS) {
      try {
        awarenessProtocol.applyAwarenessUpdate(options.awareness, payload, REMOTE_HUB_ORIGIN)
      } catch (error) {
        console.warn('[collab] hub awareness apply failed:', error)
      }
    }
  }

  function scheduleReconnect() {
    if (disposed) return
    const index = Math.min(reconnectAttempt, RECONNECT_BACKOFFS_MS.length - 1)
    const delay = RECONNECT_BACKOFFS_MS[index] ?? 60_000
    reconnectAttempt += 1
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      open()
    }, delay)
  }

  function open() {
    if (disposed) return
    try {
      socket = (options.webSocketFactory ?? ((u) => new WebSocket(u)))(url)
      socket.binaryType = 'arraybuffer'
    } catch (error) {
      console.warn('[collab] hub socket open failed:', error)
      scheduleFallback()
      scheduleReconnect()
      return
    }

    scheduleFallback()

    socket.addEventListener('open', () => {
      reconnectAttempt = 0
      // initial sync ... client から syncStep1 を送り server に state vector を要求
      const encoder = createEncoder()
      syncProtocol.writeSyncStep1(encoder, options.ydoc)
      sendIfOpen(wrap(YJS_TAG_SYNC, toUint8Array(encoder)))

      // awareness ... local state を broadcast
      const payload = awarenessProtocol.encodeAwarenessUpdate(options.awareness, [
        options.awareness.clientID
      ])
      sendIfOpen(wrap(YJS_TAG_AWARENESS, payload))
    })

    socket.addEventListener('message', handleMessage)
    socket.addEventListener('close', (event) => {
      socket = null
      if (event.code === 4401 || event.code === 4403) {
        // 認証エラーは再接続しても無駄、 fallback 起動
        disposed = true
        rejectReady?.(new Error(`hub closed code=${event.code}`))
        resolveReady = null
        rejectReady = null
        if (!fallbackInvoked) {
          fallbackInvoked = true
          options.onFallback?.()
        }
        return
      }
      if (!disposed) scheduleReconnect()
    })
    socket.addEventListener('error', () => {
      // close で fallback / reconnect は handle される
    })
  }

  options.ydoc.on('update', broadcastUpdateToHub)
  options.awareness.on('update', broadcastAwarenessToHub)

  open()

  function disconnect() {
    if (disposed) return
    disposed = true
    options.ydoc.off('update', broadcastUpdateToHub)
    options.awareness.off('update', broadcastAwarenessToHub)
    clearFallback()
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (socket) {
      try {
        socket.close()
      } catch (error) {
        console.warn('[collab] hub socket close failed:', error)
      }
      socket = null
    }
    rejectReady?.(new Error('disconnected'))
    resolveReady = null
    rejectReady = null
  }

  return {
    disconnect,
    ready,
    isConnected() {
      return socket?.readyState === WebSocket.OPEN
    }
  }
}
