import { describe, expect, test } from 'bun:test'
import * as Y from 'yjs'

import { createBoardDocumentStore } from '../../packages/api/src/boardDocumentStore.js'
import { createBoardDocumentUpdateStore } from '../../packages/api/src/boardDocumentUpdateStore.js'
import { createBoardDocumentVersionStore } from '../../packages/api/src/boardDocumentVersionStore.js'
import { createBoardStore } from '../../packages/api/src/boardStore.js'
import {
  createYjsHubServer,
  YJS_HUB_CLOSE_CODE
} from '../../packages/api/src/ws/yjs-hub.js'
import { decodeIncomingMessage, YJS_MESSAGE_TAG } from '../../packages/api/src/ws/yjs-message.js'
import { createTestApiDatabase } from '../helpers/api.js'
import { seedUserAndBoard } from '../helpers/seed-board-and-user.js'
import type { InklyAuth } from '../../packages/api/src/auth/index.js'

function buildAnonymousAuth(): InklyAuth {
  return {
    async handler() {
      return Response.json({ error: { code: 'not_found', message: 'Not found' } }, { status: 404 })
    },
    async getSession() {
      return null
    }
  }
}

describe('yjs-hub (server-mediated CRDT sync)', () => {
  test('handleRequest returns 404 for unknown board', async () => {
    const database = await createTestApiDatabase()
    const boardStore = await createBoardStore({ database })
    const hub = createYjsHubServer({
      auth: buildAnonymousAuth(),
      boardStore,
      boardDocumentStore: await createBoardDocumentStore({ database }),
      boardDocumentUpdateStore: await createBoardDocumentUpdateStore({ database }),
      boardDocumentVersionStore: await createBoardDocumentVersionStore({ database }),
      log: () => {}
    })

    const fakeServer = {
      upgrade: () => false
    }
    const response = await hub.handleRequest(
      new Request('http://localhost:0/api/ws/yjs/missing-board'),
      // @ts-expect-error mock subset
      fakeServer
    )
    expect(response).toBeInstanceOf(Response)
    if (!(response instanceof Response)) throw new Error('expected Response')
    expect(response.status).toBe(404)
  })

  test('handleRequest returns 403 when anonymous actor cannot access board', async () => {
    const database = await createTestApiDatabase()
    const { boardId } = await seedUserAndBoard(database, {
      userEmail: 'forbidden@jfet.co.jp'
    })
    const boardStore = await createBoardStore({ database })
    const hub = createYjsHubServer({
      auth: buildAnonymousAuth(),
      boardStore,
      boardDocumentStore: await createBoardDocumentStore({ database }),
      boardDocumentUpdateStore: await createBoardDocumentUpdateStore({ database }),
      boardDocumentVersionStore: await createBoardDocumentVersionStore({ database }),
      log: () => {}
    })

    const fakeServer = { upgrade: () => false }
    const response = await hub.handleRequest(
      new Request(`http://localhost:0/api/ws/yjs/${boardId}`),
      // @ts-expect-error mock subset
      fakeServer
    )
    expect(response).toBeInstanceOf(Response)
    if (!(response instanceof Response)) throw new Error('expected Response')
    expect(response.status).toBe(403)
  })

  test('decodeIncomingMessage correctly routes sync / awareness / unknown tags', () => {
    const payload = new Uint8Array([1, 2, 3])
    const syncFrame = new Uint8Array([YJS_MESSAGE_TAG.SYNC, ...payload])
    const decodedSync = decodeIncomingMessage(syncFrame)
    expect(decodedSync.tag).toBe(YJS_MESSAGE_TAG.SYNC)
    expect(Array.from(decodedSync.payload)).toEqual([1, 2, 3])

    const awarenessFrame = new Uint8Array([YJS_MESSAGE_TAG.AWARENESS, ...payload])
    const decodedAwareness = decodeIncomingMessage(awarenessFrame)
    expect(decodedAwareness.tag).toBe(YJS_MESSAGE_TAG.AWARENESS)

    const empty = decodeIncomingMessage(new Uint8Array(0))
    expect(empty.tag).toBe(null)

    const unknownTagFrame = new Uint8Array([0x42, ...payload])
    const decodedUnknown = decodeIncomingMessage(unknownTagFrame)
    expect(decodedUnknown.tag).toBe(null)
  })

  test('close codes for hub are stable constants', () => {
    expect(YJS_HUB_CLOSE_CODE.UNAUTHORIZED).toBe(4401)
    expect(YJS_HUB_CLOSE_CODE.FORBIDDEN).toBe(4403)
    expect(YJS_HUB_CLOSE_CODE.ROOM_FULL).toBe(4413)
  })

  test('Y.mergeUpdates correctly coalesces 2 yjs updates (persist throttle invariant)', () => {
    // 我々の persist throttle が mergeUpdates 経路に依存しているため、
    // 2 つの update を 1 update に merge して applyUpdate しても両方の変更が反映されることを検証する。
    const docA = new Y.Doc()
    docA.getMap('nodes').set('a', new Y.Map(Object.entries({ x: 1 })))
    const update1 = Y.encodeStateAsUpdate(docA)

    const docB = new Y.Doc()
    Y.applyUpdate(docB, update1)
    docB.getMap('nodes').set('b', new Y.Map(Object.entries({ y: 2 })))
    const update2 = Y.encodeStateAsUpdate(docB, Y.encodeStateVector(docA))

    const merged = Y.mergeUpdates([update1, update2])
    const restored = new Y.Doc()
    Y.applyUpdate(restored, merged)
    expect(restored.getMap('nodes').has('a')).toBe(true)
    expect(restored.getMap('nodes').has('b')).toBe(true)
  })
})
