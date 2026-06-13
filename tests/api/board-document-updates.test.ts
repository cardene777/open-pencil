import { describe, expect, test } from 'bun:test'
import * as Y from 'yjs'

import { createBoardDocumentStore } from '../../packages/api/src/boardDocumentStore.js'
import { createBoardDocumentUpdateStore } from '../../packages/api/src/boardDocumentUpdateStore.js'
import { createBoardDocumentVersionStore } from '../../packages/api/src/boardDocumentVersionStore.js'
import { createBoardStore } from '../../packages/api/src/boardStore.js'
import { createTestApiDatabase } from '../helpers/api.js'
import { seedUserAndBoard } from '../helpers/seed-board-and-user.js'

describe('board document update / version stores (yjs replay)', () => {
  test('append + replay reconstructs the Y.Doc state', async () => {
    const database = await createTestApiDatabase()
    const { boardId } = await seedUserAndBoard(database, {
      userEmail: 'replay@jfet.co.jp'
    })
    void (await createBoardStore({ database }))
    const updateStore = await createBoardDocumentUpdateStore({ database })

    // 2 つの client が並列に編集した想定で update vector を 2 件 append する
    const docA = new Y.Doc()
    const docB = new Y.Doc()
    const seenUpdates: Uint8Array[] = []
    docA.on('update', (update: Uint8Array) => seenUpdates.push(update))
    docB.on('update', (update: Uint8Array) => seenUpdates.push(update))

    docA.getMap('nodes').set('node-1', new Y.Map(Object.entries({ x: 10, y: 20 })))
    docB.getMap('nodes').set('node-2', new Y.Map(Object.entries({ x: 30, y: 40 })))

    for (const update of seenUpdates) {
      await updateStore.appendUpdate({ boardId, update, createdByUserId: null })
    }

    const stored = await updateStore.listUpdatesSince(boardId, 0)
    expect(stored.length).toBe(seenUpdates.length)

    // replay して新しい docC を構築、 docA + docB のマージ後と同じ key を持つことを確認
    const docC = new Y.Doc()
    for (const record of stored) {
      Y.applyUpdate(docC, record.update)
    }
    const nodes = docC.getMap('nodes')
    expect(nodes.has('node-1')).toBe(true)
    expect(nodes.has('node-2')).toBe(true)
  })

  test('pruneOldVersions is deterministic even when createdAt values collide on same ms', async () => {
    // Date.now() を固定して全 5 件を同一タイムスタンプで作る。 旧経路は cutoff
    // = "keepCount 個飛ばし行の createdAt" を読んで `<= cutoff` で消すロジック
    // だったため、 全行が同 ms なら keep したい行も含めて全削除されていた
    // (flaky の根本原因)。 新経路は id 集合差分で削除するので衝突に依らず確定的。
    const database = await createTestApiDatabase()
    const { boardId } = await seedUserAndBoard(database, {
      userEmail: 'collision@jfet.co.jp'
    })
    const fixedTimestamp = 1_700_000_000_000
    const versionStore = await createBoardDocumentVersionStore({
      database,
      now: () => fixedTimestamp
    })

    for (let i = 0; i < 5; i += 1) {
      const doc = new Y.Doc()
      doc.getMap('nodes').set(`node-${i}`, new Y.Map(Object.entries({ x: i })))
      await versionStore.createVersion({
        boardId,
        state: Y.encodeStateAsUpdate(doc),
        label: null
      })
    }

    const versions = await versionStore.listVersionsForBoard(boardId)
    expect(versions.length).toBe(5)
    expect(versions.every((v) => v.createdAt === fixedTimestamp)).toBe(true)

    const removed = await versionStore.pruneOldVersions(boardId, 3)
    expect(removed).toBe(2)
    const remaining = await versionStore.listVersionsForBoard(boardId)
    expect(remaining.length).toBe(3)
  })

  test('version store keeps history and prunes old snapshots', async () => {
    const database = await createTestApiDatabase()
    const { boardId } = await seedUserAndBoard(database, {
      userEmail: 'version@jfet.co.jp'
    })
    const versionStore = await createBoardDocumentVersionStore({ database })

    for (let i = 0; i < 5; i += 1) {
      const doc = new Y.Doc()
      doc.getMap('nodes').set(`node-${i}`, new Y.Map(Object.entries({ x: i })))
      await versionStore.createVersion({
        boardId,
        state: Y.encodeStateAsUpdate(doc),
        label: i === 0 ? 'manual-label' : null
      })
    }

    const versions = await versionStore.listVersionsForBoard(boardId)
    expect(versions.length).toBe(5)
    expect(versions[0]?.createdAt).toBeGreaterThanOrEqual(versions[1]?.createdAt ?? 0)

    const removed = await versionStore.pruneOldVersions(boardId, 3)
    expect(removed).toBeGreaterThan(0)
    const remaining = await versionStore.listVersionsForBoard(boardId)
    expect(remaining.length).toBe(3)
  })

  test('document store + update store roundtrips snapshot through Y.Doc', async () => {
    const database = await createTestApiDatabase()
    const { boardId } = await seedUserAndBoard(database, {
      userEmail: 'roundtrip@jfet.co.jp'
    })
    const documentStore = await createBoardDocumentStore({ database })
    const updateStore = await createBoardDocumentUpdateStore({ database })

    const docA = new Y.Doc()
    docA.getMap('nodes').set('node-X', new Y.Map(Object.entries({ x: 100 })))

    // snapshot 永続化 (board_documents) + update vector 永続化を server hub の動作に
    // 近い経路で書き、 別 Y.Doc に load + replay して整合性を確認する。
    await documentStore.upsertDocument({
      boardId,
      bytes: Y.encodeStateAsUpdate(docA),
      updatedByUserId: null
    })

    const docB = new Y.Doc()
    docB.getMap('nodes').set('node-X', new Y.Map(Object.entries({ y: 200 })))
    const update = Y.encodeStateAsUpdate(docB)
    await updateStore.appendUpdate({ boardId, update, createdByUserId: null })

    // 復元 ... board_documents の snapshot を base にし、 board_document_updates を applyUpdate
    const restored = new Y.Doc()
    const snapshot = await documentStore.findDocument(boardId)
    if (snapshot?.bytes) Y.applyUpdate(restored, snapshot.bytes)
    for (const record of await updateStore.listUpdatesSince(boardId, 0)) {
      Y.applyUpdate(restored, record.update)
    }
    const restoredNodes = restored.getMap('nodes')
    expect(restoredNodes.has('node-X')).toBe(true)
  })
})
