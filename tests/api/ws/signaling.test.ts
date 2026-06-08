import { afterEach, describe, expect, test } from 'bun:test'

import { startApiServer } from '../../../packages/api/src/server.js'
import { TEST_USER_HEADER, createHeaderAuth, createSession } from '../../helpers/api-auth.js'
import { TEST_API_SECRET } from '../../helpers/api.js'

const TEST_SIGNALING_PORT = 18_101
const SKIP_NON_TTY_WEBSOCKET_TESTS = !process.stdout.isTTY

type SignalingMessage = {
  type: string
  peerId?: string
  peers?: string[]
  payload?: Record<string, unknown>
}

type TestSocket = {
  socket: WebSocket
  nextMessage: () => Promise<SignalingMessage>
}

const sockets = new Set<WebSocket>()
const servers: Array<{ stop: () => void }> = []
const databases: Array<{ close: () => void } | null> = []

afterEach(() => {
  for (const socket of sockets) {
    socket.close()
  }
  sockets.clear()

  for (const server of servers.splice(0)) {
    server.stop()
  }

  for (const database of databases.splice(0)) {
    database?.close()
  }
})

function buildSignalingHttpUrl(port: number, roomId: string) {
  return `http://127.0.0.1:${port}/api/ws/signaling?room=${encodeURIComponent(roomId)}`
}

function buildSignalingWsUrl(port: number, roomId: string) {
  return `ws://127.0.0.1:${port}/api/ws/signaling?room=${encodeURIComponent(roomId)}`
}

function connect(url: string, headers: Record<string, string> = {}): Promise<TestSocket> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url, { headers } as never)
    const queue: SignalingMessage[] = []
    const waiters: Array<(message: SignalingMessage) => void> = []
    sockets.add(socket)

    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data)) as SignalingMessage
      const waiter = waiters.shift()
      if (waiter) waiter(message)
      else queue.push(message)
    })
    socket.addEventListener(
      'open',
      () =>
        resolve({
          socket,
          nextMessage: () =>
            new Promise((nextResolve) => {
              const queued = queue.shift()
              if (queued) {
                nextResolve(queued)
                return
              }
              waiters.push(nextResolve)
            })
        }),
      { once: true }
    )
    socket.addEventListener('error', () => reject(new Error('WebSocket connection failed')), {
      once: true
    })
  })
}

describe('signaling websocket authorization', () => {
  test
    .skipIf(SKIP_NON_TTY_WEBSOCKET_TESTS)
    .serial(
      'allows the board owner and accepted collaborator to join and exchange signals',
      async () => {
        const invitee = createSession('user-invitee', 'Invitee User', 'invitee@example.com')
        const outsider = createSession('user-outsider', 'Outsider User', 'outsider@example.com')
        const { server, database, boardStore } = await startApiServer({
          secret: TEST_API_SECRET,
          host: '127.0.0.1',
          port: TEST_SIGNALING_PORT,
          env: {
            ...process.env,
            INKLY_API_DB_MODE: 'memory'
          },
          auth: createHeaderAuth([invitee, outsider])
        })
        servers.push(server)
        databases.push(database)

        const board = await boardStore.createBoard({
          name: 'Roadmap board',
          creatorAnonymousId: 'anon-owner'
        })
        await boardStore.addCollaborator(board.id, {
          anonymousId: 'anon-invitee',
          role: 'editor',
          invitationId: 'invite-123'
        })

        const owner = await connect(buildSignalingWsUrl(server.port, board.id), {
          'X-Inkly-Anonymous-Id': 'anon-owner'
        })
        const welcomeOwner = await owner.nextMessage()
        expect(welcomeOwner).toMatchObject({
          type: 'welcome',
          peers: []
        })
        expect(welcomeOwner.peerId).toBeString()

        const collaborator = await connect(buildSignalingWsUrl(server.port, board.id), {
          [TEST_USER_HEADER]: invitee.user.id,
          'X-Inkly-Anonymous-Id': 'anon-invitee'
        })
        const [joinedOwner, welcomeCollaborator] = await Promise.all([
          owner.nextMessage(),
          collaborator.nextMessage()
        ])

        expect(joinedOwner).toMatchObject({
          type: 'peer-joined',
          peerId: welcomeCollaborator.peerId
        })
        expect(welcomeCollaborator).toMatchObject({
          type: 'welcome',
          peers: [welcomeOwner.peerId]
        })
        expect(welcomeCollaborator.peerId).toBeString()

        owner.socket.send(
          JSON.stringify({
            type: 'offer',
            targetPeerId: welcomeCollaborator.peerId,
            payload: { type: 'offer', sdp: 'offer-sdp' }
          })
        )
        expect(await collaborator.nextMessage()).toEqual({
          type: 'offer',
          peerId: welcomeOwner.peerId,
          payload: { type: 'offer', sdp: 'offer-sdp' }
        })
      }
    )

  test.serial(
    'denies outsiders, anonymous requests without identity, and unknown boards',
    async () => {
      const outsider = createSession('user-outsider', 'Outsider User', 'outsider@example.com')
      const { server, database, boardStore } = await startApiServer({
        secret: TEST_API_SECRET,
        host: '127.0.0.1',
        port: TEST_SIGNALING_PORT,
        env: {
          ...process.env,
          INKLY_API_DB_MODE: 'memory'
        },
        auth: createHeaderAuth([outsider])
      })
      servers.push(server)
      databases.push(database)

      const board = await boardStore.createBoard({
        name: 'Private board',
        creatorAnonymousId: 'anon-owner'
      })

      const outsiderResponse = await fetch(buildSignalingHttpUrl(server.port, board.id), {
        headers: {
          [TEST_USER_HEADER]: outsider.user.id,
          'X-Inkly-Anonymous-Id': 'anon-outsider'
        }
      })
      expect(outsiderResponse.status).toBe(403)
      expect(await outsiderResponse.json()).toEqual({
        error: {
          code: 'forbidden',
          message: 'Board collaboration access denied'
        }
      })

      const missingIdentityResponse = await fetch(buildSignalingHttpUrl(server.port, board.id))
      expect(missingIdentityResponse.status).toBe(403)
      expect(await missingIdentityResponse.json()).toEqual({
        error: {
          code: 'forbidden',
          message: 'Board collaboration access denied'
        }
      })

      const missingBoardResponse = await fetch(
        buildSignalingHttpUrl(server.port, 'missing-board'),
        {
          headers: {
            'X-Inkly-Anonymous-Id': 'anon-owner'
          }
        }
      )
      expect(missingBoardResponse.status).toBe(404)
      expect(await missingBoardResponse.json()).toEqual({
        error: {
          code: 'board_not_found',
          message: 'Board not found'
        }
      })
    }
  )
})
