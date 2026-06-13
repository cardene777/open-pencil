import type { Server, ServerWebSocket } from 'bun'
import * as awarenessProtocol from 'y-protocols/awareness'
import * as syncProtocol from 'y-protocols/sync'
import { createEncoder, length as encoderLength, toUint8Array } from 'lib0/encoding'
import { createDecoder } from 'lib0/decoding'
import * as Y from 'yjs'

import { canAccessBoard, resolveRequestActor } from '../auth/actor.js'
import { getAuthSession, type InklyAuth } from '../auth/index.js'
import { INKLY_ANONYMOUS_ID_HEADER } from '../anonymousId.js'
import type {
  BoardDocumentStore,
  BoardDocumentUpdateStore,
  BoardDocumentVersionStore,
  BoardStore
} from '../types.js'
import { decodeIncomingMessage, encodeServerStatus, wrap, YJS_MESSAGE_TAG } from './yjs-message.js'

const YJS_HUB_PATH_PREFIX = '/api/ws/yjs/'

/**
 * 1 board あたり 50 client (運用上限)。 hub map 内 set size で enforce する。
 */
const MAX_CLIENTS_PER_ROOM = 50

/**
 * compaction 起動条件。 N 件 update or N ms 経過のどちらかで snapshot 化。
 */
const COMPACTION_UPDATE_THRESHOLD = 500
const COMPACTION_INTERVAL_MS = 60 * 60 * 1000
const VERSION_KEEP_COUNT = 50

/**
 * persist throttle ... DB への append-only insert は連続 drag 中に大量発火する。
 * 100ms 単位で yjs `mergeUpdates` で coalesce してから 1 insert に集約する。
 * broadcast (client → client) は throttle しない (latency 最優先)。
 */
const PERSIST_THROTTLE_MS = 100

/**
 * close codes (RFC 4400-4500 域を独自用途で利用)
 */
export const YJS_HUB_CLOSE_CODE = {
  UNAUTHORIZED: 4401,
  FORBIDDEN: 4403,
  ROOM_FULL: 4413,
  INTERNAL: 4500
} as const

export interface YjsSocketData {
  boardId: string
  clientId: string
  userId: string | null
}

type YjsSocket = ServerWebSocket<YjsSocketData>

interface BoardRoom {
  boardId: string
  ydoc: Y.Doc
  awareness: awarenessProtocol.Awareness
  clients: Set<YjsSocket>
  pendingUpdateCount: number
  lastSnapshotAt: number
  /**
   * persist 用 coalesce buffer ... (update bytes, userId) を 100ms 単位で 1 insert に集約。
   */
  persistBuffer: { updates: Uint8Array[]; userId: string | null }
  persistTimer: ReturnType<typeof setTimeout> | null
  /**
   * board_documents.bytes が yjs update format で読めなかったかどうか。
   * 旧 .fig binary が DB に入っている board では true になり、 client 由来の
   * 編集が一切来ないまま room を閉じても snapshot で上書きしない (元 .fig 保護)。
   */
  initialSnapshotWasIncompatible: boolean
  /**
   * room を作成してから client 由来の編集 (`ydoc.on('update')` で origin が socket)
   * が 1 件以上あったかどうか。 false のまま room を閉じる場合は yjs 経由で
   * 一切の編集がないので snapshot 書き戻し不要 (空 Y.Doc 上書き事故防止)。
   */
  mutatedByClient: boolean
}

export interface YjsHubServer {
  handleRequest: (
    request: Request,
    server: Server<YjsSocketData>
  ) => Promise<Response | undefined | null>
  open: (socket: YjsSocket) => Promise<void>
  message: (socket: YjsSocket, message: ArrayBuffer | Uint8Array | string) => Promise<void>
  close: (socket: YjsSocket) => Promise<void>
  /**
   * 全 room を破棄し最新 snapshot を flush する (テスト / shutdown 用)。
   */
  destroy: () => Promise<void>
  /**
   * test fixture 用 ... 内部状態確認のため room 数を返す。
   */
  getRoomCount: () => number
  /**
   * test fixture 用 ... room を強制的に load して内部状態を 1 回読む。
   * `mutatedByClient` / `initialSnapshotWasIncompatible` の guard 経路を
   * unit test で検査するための窓口、 本番経路 (`open`) は使わない。
   */
  __testLoadRoomState: (boardId: string) => Promise<{
    mutatedByClient: boolean
    initialSnapshotWasIncompatible: boolean
  }>
}

export interface CreateYjsHubServerOptions {
  auth: InklyAuth
  boardStore: BoardStore
  boardDocumentStore: BoardDocumentStore
  boardDocumentUpdateStore: BoardDocumentUpdateStore
  boardDocumentVersionStore: BoardDocumentVersionStore
  log?: (message: string) => void
  now?: () => number
  randomId?: () => string
}

function jsonError(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { 'content-type': 'application/json' }
  })
}

function extractBoardId(pathname: string): string | null {
  if (!pathname.startsWith(YJS_HUB_PATH_PREFIX)) return null
  const rest = pathname.slice(YJS_HUB_PATH_PREFIX.length)
  if (rest.length === 0) return null
  // 余分な segment が来た場合は拒否 (path injection / 想定外 client 対策)
  if (rest.includes('/')) return null
  return decodeURIComponent(rest)
}

export function createYjsHubServer(options: CreateYjsHubServerOptions): YjsHubServer {
  const log =
    options.log ?? ((message: string) => process.stderr.write(`[inkly-yjs-hub] ${message}\n`))
  const now = options.now ?? Date.now
  const randomId = options.randomId ?? (() => crypto.randomUUID())
  const rooms = new Map<string, BoardRoom>()

  async function flushPersistBuffer(room: BoardRoom) {
    room.persistTimer = null
    const { updates, userId } = room.persistBuffer
    if (updates.length === 0) return
    room.persistBuffer = { updates: [], userId: null }
    const merged = updates.length === 1 ? updates[0] : Y.mergeUpdates(updates)
    try {
      await options.boardDocumentUpdateStore.appendUpdate({
        boardId: room.boardId,
        update: merged,
        createdByUserId: userId
      })
      room.pendingUpdateCount += 1
    } catch (error) {
      log(`persist update failed board=${room.boardId}: ${stringifyError(error)}`)
    }
    await maybeCompact(room)
  }

  function schedulePersist(room: BoardRoom, update: Uint8Array, userId: string | null) {
    room.persistBuffer.updates.push(update)
    // user 単位の trace を残したいが coalesce 内で複数 user が混在する場合は null に倒す
    if (room.persistBuffer.updates.length === 1) {
      room.persistBuffer.userId = userId
    } else if (room.persistBuffer.userId !== userId) {
      room.persistBuffer.userId = null
    }
    if (room.persistTimer) return
    room.persistTimer = setTimeout(() => {
      void flushPersistBuffer(room)
    }, PERSIST_THROTTLE_MS)
  }

  async function persistSnapshot(room: BoardRoom) {
    // client 由来の編集が一度も来ていない場合は空 Y.Doc を書き戻さない。
    // 1) 旧 .fig binary が DB に入っている board ... yjs 形式でないので initial
    //    load で applyUpdate が失敗し空 Y.Doc になる、 そのまま snapshot を書くと
    //    元 .fig binary を空 yjs state で上書きしてしまい「アップロードした
    //    document が再アクセス時に消える」事故になる。
    // 2) 空 board に閲覧者だけが入室してすぐ抜けたケース ... 編集ゼロなので
    //    pendingUpdateCount === 0、 何も書き戻すべきものがない。
    if (!room.mutatedByClient) return

    const state = Y.encodeStateAsUpdate(room.ydoc)
    try {
      await options.boardDocumentVersionStore.createVersion({
        boardId: room.boardId,
        state,
        label: null
      })
      await options.boardDocumentVersionStore.pruneOldVersions(room.boardId, VERSION_KEEP_COUNT)

      // 最新 yjs snapshot として保持。 旧 GET /document 経路と互換。
      await options.boardDocumentStore.upsertDocument({
        boardId: room.boardId,
        bytes: state,
        updatedByUserId: null
      })

      const cutoff = now()
      await options.boardDocumentUpdateStore.deleteUpdatesOlderThan(room.boardId, cutoff)
      room.pendingUpdateCount = 0
      room.lastSnapshotAt = cutoff
    } catch (error) {
      log(`persist snapshot failed board=${room.boardId}: ${stringifyError(error)}`)
    }
  }

  async function maybeCompact(room: BoardRoom) {
    const exceeded = room.pendingUpdateCount >= COMPACTION_UPDATE_THRESHOLD
    const elapsed = now() - room.lastSnapshotAt >= COMPACTION_INTERVAL_MS
    if (!exceeded && !elapsed) return
    await persistSnapshot(room)
  }

  async function loadRoom(boardId: string): Promise<BoardRoom> {
    const existing = rooms.get(boardId)
    if (existing) return existing

    // gc: true (default) で削除済 struct を回収させる。 update size と memory が縮む。
    const ydoc = new Y.Doc({ gc: true })
    const awareness = new awarenessProtocol.Awareness(ydoc)

    // 既存 snapshot を Y.Doc にロードする経路。 board_documents (最新 snapshot 1 行) を
    // base にし、 以降の board_document_updates を applyUpdate する。
    let initialSnapshotWasIncompatible = false
    try {
      const documentRow = await options.boardDocumentStore.findDocument(boardId)
      if (documentRow?.bytes && documentRow.bytes.length > 0) {
        try {
          Y.applyUpdate(ydoc, documentRow.bytes, 'initial-snapshot')
        } catch (error) {
          // 旧 .fig binary は yjs update 形式ではないため applyUpdate が失敗する。
          // その場合は Y.Doc を空のまま使い (新 board と同じ挙動)、 編集が始まると
          // 新規 update が積まれる。 既存 .fig content は別経路 GET /document で
          // 引き続き読めるので互換性に影響しない。
          // initialSnapshotWasIncompatible を立てて、 close 時の上書き保存を抑止する
          // (mutatedByClient が立たない限り空 Y.Doc で上書きしない方針)。
          initialSnapshotWasIncompatible = true
          log(
            `board=${boardId} snapshot was not yjs format, starting empty Y.Doc (${stringifyError(error)})`
          )
        }
      }

      const updates = await options.boardDocumentUpdateStore.listUpdatesSince(boardId, 0)
      for (const record of updates) {
        try {
          Y.applyUpdate(ydoc, record.update, 'update-replay')
        } catch (error) {
          log(`board=${boardId} update replay failed id=${record.id}: ${stringifyError(error)}`)
        }
      }
    } catch (error) {
      log(`board=${boardId} initial load failed: ${stringifyError(error)}`)
    }

    const room: BoardRoom = {
      boardId,
      ydoc,
      awareness,
      clients: new Set<YjsSocket>(),
      pendingUpdateCount: 0,
      lastSnapshotAt: now(),
      persistBuffer: { updates: [], userId: null },
      persistTimer: null,
      initialSnapshotWasIncompatible,
      mutatedByClient: false
    }

    awareness.on(
      'update',
      (
        { added, updated, removed }: { added: number[]; updated: number[]; removed: number[] },
        origin: unknown
      ) => {
        const changedClients = [...added, ...updated, ...removed]
        const payload = awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
        const message = wrap(YJS_MESSAGE_TAG.AWARENESS, payload)
        for (const socket of room.clients) {
          if (socket === origin) continue
          if (socket.readyState !== 1) continue
          try {
            socket.send(message)
          } catch (error) {
            log(`broadcast awareness failed board=${boardId}: ${stringifyError(error)}`)
          }
        }
      }
    )

    ydoc.on('update', (update: Uint8Array, origin: unknown) => {
      const encoder = createEncoder()
      syncProtocol.writeUpdate(encoder, update)
      const message = wrap(YJS_MESSAGE_TAG.SYNC, toUint8Array(encoder))
      for (const socket of room.clients) {
        if (socket === origin) continue
        if (socket.readyState !== 1) continue
        try {
          socket.send(message)
        } catch (error) {
          log(`broadcast update failed board=${boardId}: ${stringifyError(error)}`)
        }
      }

      // origin が socket の場合 = client 由来の編集。 server 起動時の initial
      // applyUpdate (origin = 'initial-snapshot' / 'update-replay' という文字列)
      // と区別したいので socket reference 一致で判定する。 これで snapshot 書き戻し
      // 判定 (`mutatedByClient`) が「ユーザーが本当に編集したか」と一致する。
      // initial / replay 経路の update は appendUpdate しない (既に DB にあるので
      // 二重保存になりかつ再起動のたびに同 update を積み増す事故を防ぐ)。
      const originSocket = room.clients.has(origin as YjsSocket)
        ? (origin as YjsSocket)
        : null
      if (originSocket == null) return

      room.mutatedByClient = true
      schedulePersist(room, update, originSocket.data.userId)
    })

    rooms.set(boardId, room)
    return room
  }

  async function disposeRoom(room: BoardRoom) {
    if (room.clients.size > 0) return
    if (room.persistTimer) {
      clearTimeout(room.persistTimer)
      room.persistTimer = null
    }
    await flushPersistBuffer(room)
    await persistSnapshot(room)
    room.awareness.destroy()
    room.ydoc.destroy()
    rooms.delete(room.boardId)
  }

  return {
    async handleRequest(request, server) {
      const url = new URL(request.url)
      const boardId = extractBoardId(url.pathname)
      if (!boardId) return null

      const board = await options.boardStore.findBoard(boardId)
      if (!board) {
        return jsonError(404, 'board_not_found', 'Board not found')
      }

      const session = await getAuthSession(options.auth, request)
      const headerAnonymousId = request.headers.get(INKLY_ANONYMOUS_ID_HEADER)?.trim() ?? null
      const actor = await resolveRequestActor(options.auth, request, () =>
        headerAnonymousId && headerAnonymousId.length > 0 ? headerAnonymousId : crypto.randomUUID()
      )

      if (!canAccessBoard(board, actor)) {
        return jsonError(403, 'forbidden', 'You do not have access to this board')
      }

      const existingRoom = rooms.get(boardId)
      if (existingRoom && existingRoom.clients.size >= MAX_CLIENTS_PER_ROOM) {
        return jsonError(429, 'room_full', 'Too many clients in this board room')
      }

      const upgraded = server.upgrade(request, {
        data: {
          boardId,
          clientId: randomId(),
          userId: session?.user.id ?? null
        } satisfies YjsSocketData
      })
      if (upgraded) return undefined

      return jsonError(426, 'upgrade_failed', 'WebSocket upgrade failed')
    },
    async open(socket) {
      const room = await loadRoom(socket.data.boardId)
      if (room.clients.size >= MAX_CLIENTS_PER_ROOM) {
        socket.send(encodeServerStatus('room_full'))
        socket.close(YJS_HUB_CLOSE_CODE.ROOM_FULL, 'room_full')
        return
      }
      room.clients.add(socket)
      log(
        `joined board=${socket.data.boardId} client=${socket.data.clientId} total=${room.clients.size}`
      )

      // initial sync ... server から syncStep1 を送って client の state vector を要求する。
      try {
        const encoder = createEncoder()
        syncProtocol.writeSyncStep1(encoder, room.ydoc)
        socket.send(wrap(YJS_MESSAGE_TAG.SYNC, toUint8Array(encoder)))
      } catch (error) {
        log(`send syncStep1 failed board=${socket.data.boardId}: ${stringifyError(error)}`)
      }

      // 既存 awareness を新 client にまとめて送る。
      const awarenessClients = Array.from(room.awareness.getStates().keys())
      if (awarenessClients.length > 0) {
        const payload = awarenessProtocol.encodeAwarenessUpdate(room.awareness, awarenessClients)
        socket.send(wrap(YJS_MESSAGE_TAG.AWARENESS, payload))
      }
    },
    async message(socket, raw) {
      const room = rooms.get(socket.data.boardId)
      if (!room) return

      const bytes = toUint8ArrayInput(raw)
      const { tag, payload } = decodeIncomingMessage(bytes)
      if (tag == null) return

      if (tag === YJS_MESSAGE_TAG.SYNC) {
        try {
          const decoder = createDecoder(payload)
          const encoder = createEncoder()
          // readSyncMessage は syncStep1 / syncStep2 / update のいずれにも応答する。
          syncProtocol.readSyncMessage(decoder, encoder, room.ydoc, socket)
          if (encoderLength(encoder) > 0) {
            socket.send(wrap(YJS_MESSAGE_TAG.SYNC, toUint8Array(encoder)))
          }
        } catch (error) {
          log(`handle sync failed board=${socket.data.boardId}: ${stringifyError(error)}`)
        }
        return
      }

      if (tag === YJS_MESSAGE_TAG.AWARENESS) {
        try {
          awarenessProtocol.applyAwarenessUpdate(room.awareness, payload, socket)
        } catch (error) {
          log(`handle awareness failed board=${socket.data.boardId}: ${stringifyError(error)}`)
        }
      }

      // server-status は client → server では使わない (debug 用予約)
    },
    async close(socket) {
      const room = rooms.get(socket.data.boardId)
      if (!room) return
      room.clients.delete(socket)
      awarenessProtocol.removeAwarenessStates(
        room.awareness,
        [room.awareness.clientID],
        socket
      )
      log(
        `left board=${socket.data.boardId} client=${socket.data.clientId} remaining=${room.clients.size}`
      )
      if (room.clients.size === 0) {
        // 0 client なら snapshot を必ず flush し room を解放する。
        await disposeRoom(room)
      }
    },
    async destroy() {
      for (const room of rooms.values()) {
        room.clients.clear()
        if (room.persistTimer) {
          clearTimeout(room.persistTimer)
          room.persistTimer = null
        }
        await flushPersistBuffer(room)
        await persistSnapshot(room)
        room.awareness.destroy()
        room.ydoc.destroy()
      }
      rooms.clear()
    },
    getRoomCount() {
      return rooms.size
    },
    async __testLoadRoomState(boardId: string) {
      const room = await loadRoom(boardId)
      return {
        mutatedByClient: room.mutatedByClient,
        initialSnapshotWasIncompatible: room.initialSnapshotWasIncompatible
      }
    }
  }
}

function toUint8ArrayInput(raw: ArrayBuffer | Uint8Array | string): Uint8Array {
  if (raw instanceof Uint8Array) return raw
  if (raw instanceof ArrayBuffer) return new Uint8Array(raw)
  return new TextEncoder().encode(raw)
}

function stringifyError(error: unknown): string {
  if (error instanceof Error) return error.stack ?? error.message
  return String(error)
}
