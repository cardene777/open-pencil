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
})
