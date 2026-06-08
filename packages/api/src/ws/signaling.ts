import type { Server, ServerWebSocket } from 'bun'

import { isBoardCollaborator, resolveRequestActor } from '../auth/actor.js'
import type { InklyAuth } from '../auth/index.js'
import type { BoardStore } from '../types.js'

const SIGNALING_PATH = '/api/ws/signaling'

export type SignalingPeerData = {
  boardId: string
  peerId: string
  userId: string | null
  anonymousId: string | null
}

type SignalingForwardMessage =
  | {
      type: 'offer'
      targetPeerId: string
      payload: RTCSessionDescriptionInit
    }
  | {
      type: 'answer'
      targetPeerId: string
      payload: RTCSessionDescriptionInit
    }
  | {
      type: 'ice-candidate'
      targetPeerId: string
      payload: RTCIceCandidateInit
    }

type SignalingServerMessage =
  | {
      type: 'welcome'
      peerId: string
      peers: string[]
    }
  | {
      type: 'peer-joined'
      peerId: string
    }
  | {
      type: 'peer-left'
      peerId: string
    }
  | {
      type: 'offer' | 'answer' | 'ice-candidate'
      peerId: string
      payload: RTCSessionDescriptionInit | RTCIceCandidateInit
    }
  | {
      type: 'error'
      message: string
    }

type SignalingSocket = ServerWebSocket<SignalingPeerData>

export interface SignalingServerOptions {
  log?: (message: string) => void
  auth: InklyAuth
  boardStore: BoardStore
  resolveAnonymousId: (request: Request) => string | null
}

export interface SignalingServer {
  handleRequest: (
    request: Request,
    server: Server<SignalingPeerData>
  ) => Promise<Response | undefined | null>
  websocket: Bun.WebSocketHandler<SignalingPeerData>
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  })
}

function send(socket: SignalingSocket, message: SignalingServerMessage) {
  socket.send(JSON.stringify(message))
}

function parseForwardMessage(raw: string): SignalingForwardMessage | null {
  try {
    const message = JSON.parse(raw) as Partial<SignalingForwardMessage>
    const validType =
      message.type === 'offer' || message.type === 'answer' || message.type === 'ice-candidate'
    if (!validType) return null
    if (typeof message.targetPeerId !== 'string' || message.targetPeerId.length === 0) return null
    if (!message.payload || typeof message.payload !== 'object') return null
    return message as SignalingForwardMessage
  } catch {
    return null
  }
}

function roomPeers(rooms: Map<string, Map<string, SignalingSocket>>, boardId: string) {
  let peers = rooms.get(boardId)
  if (!peers) {
    peers = new Map()
    rooms.set(boardId, peers)
  }
  return peers
}

export function createSignalingServer(options: SignalingServerOptions): SignalingServer {
  const log = options.log ?? ((message) => process.stderr.write(`${message}\n`))
  const rooms = new Map<string, Map<string, SignalingSocket>>()

  function broadcast(boardId: string, message: SignalingServerMessage, exceptPeerId?: string) {
    const peers = rooms.get(boardId)
    if (!peers) return
    for (const [peerId, socket] of peers) {
      if (peerId === exceptPeerId) continue
      send(socket, message)
    }
  }

  return {
    async handleRequest(request, server) {
      const url = new URL(request.url)
      if (url.pathname !== SIGNALING_PATH) return null

      const boardId = url.searchParams.get('room')?.trim()
      if (!boardId) {
        return json(
          {
            error: {
              code: 'missing_room',
              message: 'room query parameter is required'
            }
          },
          400
        )
      }

      const board = await options.boardStore.findBoard(boardId)
      if (!board) {
        return json(
          {
            error: {
              code: 'board_not_found',
              message: 'Board not found'
            }
          },
          404
        )
      }

      const actor = await resolveRequestActor(options.auth, request, () =>
        options.resolveAnonymousId(request)
      )
      if (!isBoardCollaborator(board, actor)) {
        return json(
          {
            error: {
              code: 'forbidden',
              message: 'Board collaboration access denied'
            }
          },
          403
        )
      }

      const peerId = crypto.randomUUID()
      const upgraded = server.upgrade(request, {
        data: {
          boardId: board.id,
          peerId,
          userId: actor.userId,
          anonymousId: actor.anonymousId
        }
      })

      if (upgraded) return undefined

      return json(
        {
          error: {
            code: 'upgrade_failed',
            message: 'WebSocket upgrade failed'
          }
        },
        426
      )
    },
    websocket: {
      open(socket) {
        const { boardId, peerId } = socket.data
        const peers = roomPeers(rooms, boardId)
        const existingPeerIds = [...peers.keys()]
        peers.set(peerId, socket)

        send(socket, {
          type: 'welcome',
          peerId,
          peers: existingPeerIds
        })
        broadcast(boardId, { type: 'peer-joined', peerId }, peerId)

        log(
          `[inkly-api] signaling connected board=${boardId} peer=${peerId} user=${socket.data.userId ?? '-'} anonymous=${socket.data.anonymousId ?? '-'} peers=${peers.size}`
        )
      },
      message(socket, message) {
        if (typeof message !== 'string') {
          send(socket, { type: 'error', message: 'Expected JSON text message' })
          return
        }

        const parsed = parseForwardMessage(message)
        if (!parsed) {
          send(socket, { type: 'error', message: 'Invalid signaling message' })
          return
        }

        const peers = rooms.get(socket.data.boardId)
        const target = peers?.get(parsed.targetPeerId)
        if (!target) {
          send(socket, { type: 'error', message: 'Target peer not found' })
          return
        }

        send(target, {
          type: parsed.type,
          peerId: socket.data.peerId,
          payload: parsed.payload
        })
      },
      close(socket) {
        const { boardId, peerId } = socket.data
        const peers = rooms.get(boardId)
        if (!peers) return

        peers.delete(peerId)
        if (peers.size === 0) rooms.delete(boardId)
        else broadcast(boardId, { type: 'peer-left', peerId }, peerId)

        log(
          `[inkly-api] signaling disconnected board=${boardId} peer=${peerId} user=${socket.data.userId ?? '-'} anonymous=${socket.data.anonymousId ?? '-'} peers=${peers.size}`
        )
      }
    }
  }
}
