import { describe, expect, test } from 'bun:test'
import * as Y from 'yjs'

import { decodeBoardDocumentBytes } from '@/app/collab/yjs-document-decode'

describe('decodeBoardDocumentBytes', () => {
  test('non-yjs binary returns null (旧 .fig 互換, applyUpdate throw)', () => {
    const figLike = new Uint8Array([0x46, 0x49, 0x47, 0x44, 0x49, 0x53, 0x4b])
    expect(decodeBoardDocumentBytes(figLike)).toBeNull()
  })

  test('empty yjs Doc returns null (ynodes が空なら復元不要)', () => {
    const ydoc = new Y.Doc()
    const bytes = Y.encodeStateAsUpdate(ydoc)
    expect(decodeBoardDocumentBytes(bytes)).toBeNull()
  })

  test('yjs Doc with root + one child reconstructs SceneGraph', () => {
    const ydoc = new Y.Doc()
    const ynodes = ydoc.getMap<Y.Map<unknown>>('nodes')

    const root = new Y.Map<unknown>()
    root.set('type', 'DOCUMENT')
    root.set('name', 'Document')
    ynodes.set('root-1', root)

    const child = new Y.Map<unknown>()
    child.set('type', 'CANVAS')
    child.set('name', 'Page 1')
    child.set('parentId', 'root-1')
    ynodes.set('page-1', child)

    const bytes = Y.encodeStateAsUpdate(ydoc)
    const graph = decodeBoardDocumentBytes(bytes)
    expect(graph).not.toBeNull()
    if (!graph) return
    expect(graph.rootId).toBe('root-1')
    expect(graph.nodes.size).toBe(2)
    expect(graph.nodes.get('page-1')?.parentId).toBe('root-1')
    expect(graph.nodes.get('root-1')?.childIds).toContain('page-1')
  })

  test('out-of-order entries still reconstruct via BFS (parent first 後付)', () => {
    const ydoc = new Y.Doc()
    const ynodes = ydoc.getMap<Y.Map<unknown>>('nodes')

    // child を先に insert、 parent を後で insert (yjs entry order が非決定的な前提)。
    const child = new Y.Map<unknown>()
    child.set('type', 'CANVAS')
    child.set('parentId', 'root-2')
    ynodes.set('page-2', child)

    const root = new Y.Map<unknown>()
    root.set('type', 'DOCUMENT')
    ynodes.set('root-2', root)

    const bytes = Y.encodeStateAsUpdate(ydoc)
    const graph = decodeBoardDocumentBytes(bytes)
    expect(graph).not.toBeNull()
    if (!graph) return
    expect(graph.nodes.has('root-2')).toBe(true)
    expect(graph.nodes.has('page-2')).toBe(true)
  })

  test('images map も SceneGraph.images に復元される (live collab と同じ仕様)', () => {
    const ydoc = new Y.Doc()
    const ynodes = ydoc.getMap<Y.Map<unknown>>('nodes')
    const yimages = ydoc.getMap<Uint8Array>('images')

    const root = new Y.Map<unknown>()
    root.set('type', 'DOCUMENT')
    ynodes.set('root-3', root)

    const imgA = new Uint8Array([1, 2, 3, 4])
    const imgB = new Uint8Array([9, 8, 7])
    yimages.set('hash-a', imgA)
    yimages.set('hash-b', imgB)

    const bytes = Y.encodeStateAsUpdate(ydoc)
    const graph = decodeBoardDocumentBytes(bytes)
    expect(graph).not.toBeNull()
    if (!graph) return
    expect(graph.images.size).toBe(2)
    expect(Array.from(graph.images.get('hash-a') ?? [])).toEqual([1, 2, 3, 4])
    expect(Array.from(graph.images.get('hash-b') ?? [])).toEqual([9, 8, 7])
  })

  test('visible field 未設定 (古い snapshot) は true で復元される (#205)', () => {
    const ydoc = new Y.Doc()
    const ynodes = ydoc.getMap<Y.Map<unknown>>('nodes')

    const root = new Y.Map<unknown>()
    root.set('type', 'DOCUMENT')
    ynodes.set('root-4', root)

    // visible を明示設定しない (古い board snapshot 想定)。
    const frame = new Y.Map<unknown>()
    frame.set('type', 'FRAME')
    frame.set('parentId', 'root-4')
    ynodes.set('frame-4', frame)

    // 明示 false の Frame は保持される。
    const hiddenFrame = new Y.Map<unknown>()
    hiddenFrame.set('type', 'FRAME')
    hiddenFrame.set('parentId', 'root-4')
    hiddenFrame.set('visible', false)
    ynodes.set('frame-4-hidden', hiddenFrame)

    const bytes = Y.encodeStateAsUpdate(ydoc)
    const graph = decodeBoardDocumentBytes(bytes)
    expect(graph).not.toBeNull()
    if (!graph) return
    expect(graph.nodes.get('frame-4')?.visible).toBe(true)
    expect(graph.nodes.get('frame-4-hidden')?.visible).toBe(false)
  })

  test('deep child-first chain でも O(N) で復元 (BFS 二乗化なし)', () => {
    const ydoc = new Y.Doc()
    const ynodes = ydoc.getMap<Y.Map<unknown>>('nodes')

    // child を先に詰めても adjacency map 経路では DFS 1 pass で復元できる。
    // BFS の時代は深さ N のチェーンで O(N^2)、 ここは性能 regression detector。
    const depth = 200
    for (let i = depth - 1; i >= 1; i -= 1) {
      const node = new Y.Map<unknown>()
      node.set('type', 'FRAME')
      node.set('parentId', `n${i - 1}`)
      ynodes.set(`n${i}`, node)
    }
    const root = new Y.Map<unknown>()
    root.set('type', 'DOCUMENT')
    ynodes.set('n0', root)

    const bytes = Y.encodeStateAsUpdate(ydoc)
    const graph = decodeBoardDocumentBytes(bytes)
    expect(graph).not.toBeNull()
    if (!graph) return
    expect(graph.nodes.size).toBe(depth)
    expect(graph.rootId).toBe('n0')
    expect(graph.nodes.get(`n${depth - 1}`)?.parentId).toBe(`n${depth - 2}`)
  })
})
