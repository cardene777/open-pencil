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

  test('loadRoom marks initialSnapshotWasIncompatible=true for .fig binary stored in board_documents', async () => {
    // 旧 .fig binary が board_documents.bytes に入っている board を hub が load した
    // とき、 initialSnapshotWasIncompatible が立ち、 mutatedByClient は false のまま、
    // destroy() を呼んでも upsertDocument は走らない (元 .fig が温存される)。
    const database = await createTestApiDatabase()
    const { boardId } = await seedUserAndBoard(database, { userEmail: 'fig-owner@jfet.co.jp' })
    const boardDocumentStore = await createBoardDocumentStore({ database })
    const boardDocumentUpdateStore = await createBoardDocumentUpdateStore({ database })
    const boardDocumentVersionStore = await createBoardDocumentVersionStore({ database })

    // .fig 風 magic byte を事前に board_documents に書き込む。
    const figLikeBytes = new Uint8Array([
      0x46, 0x49, 0x47, 0x44, 0x49, 0x53, 0x4b, 0x01, 0x02, 0x03, 0x04, 0x05
    ])
    await boardDocumentStore.upsertDocument({
      boardId,
      bytes: figLikeBytes,
      updatedByUserId: null
    })

    let upsertCalled = 0
    const spyDocumentStore: typeof boardDocumentStore = {
      ...boardDocumentStore,
      async upsertDocument(input) {
        upsertCalled += 1
        return boardDocumentStore.upsertDocument(input)
      }
    }

    const boardStore = await createBoardStore({ database })
    const hub = createYjsHubServer({
      auth: buildAnonymousAuth(),
      boardStore,
      boardDocumentStore: spyDocumentStore,
      boardDocumentUpdateStore,
      boardDocumentVersionStore,
      log: () => {}
    })

    const state = await hub.__testLoadRoomState(boardId)
    expect(state.initialSnapshotWasIncompatible).toBe(true)
    expect(state.mutatedByClient).toBe(false)

    await hub.destroy()
    // mutatedByClient=false なので persistSnapshot は早期 return、 元 .fig は温存される。
    expect(upsertCalled).toBe(0)

    const after = await boardDocumentStore.findDocument(boardId)
    expect(after?.bytes).toEqual(figLikeBytes)
  })

  test('applyUpdate to .fig binary fails so Y.Doc stays empty (regression for #210)', () => {
    // 旧 .fig binary は yjs update format ではないので applyUpdate が throw する
    // (もしくは applyUpdate しても doc が空のまま)。
    // この場合 encodeStateAsUpdate しても元 .fig は復元できないため、
    // 空 yjs state で board_documents.bytes を上書きしてしまうと旧アップロード
    // document を破壊する。 これを hub 側 (`mutatedByClient` guard) で防ぐ前提として、
    // 「applyUpdate 試行 → throw or 空のまま → encodeStateAsUpdate は元 binary と完全に
    // 別物」 を確認する。
    const figLikeMagic = new Uint8Array([0x46, 0x49, 0x47, 0x44, 0x49, 0x53, 0x4b]) // "FIGDISK"
    const ydoc = new Y.Doc({ gc: true })
    let didThrow = false
    try {
      Y.applyUpdate(ydoc, figLikeMagic, 'initial-snapshot')
    } catch {
      didThrow = true
    }
    const encoded = Y.encodeStateAsUpdate(ydoc)
    // 例外が出るか出ないかに関わらず、 元 byte は失われている (encode 結果 ≠ figLikeMagic)。
    expect(encoded).not.toEqual(figLikeMagic)
    // throw しなかった場合でも yjs state はほぼ空 (頭の version byte 程度)。
    if (!didThrow) {
      expect(encoded.length).toBeLessThan(figLikeMagic.length + 5)
    }
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
