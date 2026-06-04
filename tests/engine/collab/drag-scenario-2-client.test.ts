import { describe, expect, test } from 'bun:test'
import * as Y from 'yjs'

import type { SceneNode } from '@inkly/core/scene-graph'

import { syncNodePropsToYMap } from '@/app/collab/yjs-sync'

type PartialSceneNode = Partial<SceneNode> & { id: string; type: string }

function makeRect(id: string, x: number, y: number): PartialSceneNode {
  return {
    id,
    type: 'RECT',
    name: id,
    parentId: 'PAGE',
    x,
    y,
    width: 60,
    height: 40,
    rotation: 0,
    visible: true,
    locked: false,
    opacity: 1,
    fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 } }],
    strokes: [],
    strokeWeight: 0,
    effects: [],
    childIds: [],
    constraints: { horizontal: 'MIN', vertical: 'MIN' },
    layoutMode: 'NONE',
    primaryAxisSizing: 'AUTO',
    counterAxisSizing: 'AUTO'
  }
}

function asNode(node: PartialSceneNode): SceneNode {
  return node as PartialSceneNode as SceneNode
}

function applyHostUpdateToPeer(host: Y.Doc, peer: Y.Doc, prevPeerState: Uint8Array): Uint8Array {
  const update = Y.encodeStateAsUpdate(host, prevPeerState)
  Y.applyUpdate(peer, update)
  return update
}

describe('collab drag scenario (2-client partial sync)', () => {
  test('drag 60 step を partial sync で peer に伝搬し peer 側 graph が host と一致', () => {
    const host = new Y.Doc()
    const peer = new Y.Doc()
    const hostNodes = host.getMap<Y.Map<unknown>>('nodes')
    const peerNodes = peer.getMap<Y.Map<unknown>>('nodes')

    const rect = makeRect('r1', 100, 100)
    host.transact(() => {
      const ynode = new Y.Map<unknown>()
      hostNodes.set(rect.id, ynode)
      syncNodePropsToYMap(asNode(rect), ynode)
    })
    let peerState = Y.encodeStateVector(peer)
    applyHostUpdateToPeer(host, peer, peerState)
    peerState = Y.encodeStateVector(peer)
    expect(peerNodes.get(rect.id)?.get('x')).toBe(100)

    let totalWire = 0
    for (let step = 1; step <= 60; step++) {
      const updated = { ...rect, x: 100 + step * 2 }
      host.transact(() => {
        const ynode = hostNodes.get(rect.id)
        if (!ynode) return
        syncNodePropsToYMap(asNode(updated), ynode, ['x'])
      })
      const update = applyHostUpdateToPeer(host, peer, peerState)
      peerState = Y.encodeStateVector(peer)
      totalWire += update.byteLength
    }

    expect(peerNodes.get(rect.id)?.get('x')).toBe(100 + 60 * 2)
    expect(peerNodes.get(rect.id)?.get('y')).toBe(100)
    expect(totalWire).toBeLessThan(2000)
  })

  test('host が 10 node を同時 drag したときの peer 同期 latency と wire size', () => {
    const host = new Y.Doc()
    const peer = new Y.Doc()
    const hostNodes = host.getMap<Y.Map<unknown>>('nodes')
    const peerNodes = peer.getMap<Y.Map<unknown>>('nodes')

    const rects = Array.from({ length: 10 }, (_, i) => makeRect(`r${i}`, 100 + i * 80, 100))
    host.transact(() => {
      for (const r of rects) {
        const ynode = new Y.Map<unknown>()
        hostNodes.set(r.id, ynode)
        syncNodePropsToYMap(asNode(r), ynode)
      }
    })
    let peerState = Y.encodeStateVector(peer)
    applyHostUpdateToPeer(host, peer, peerState)
    peerState = Y.encodeStateVector(peer)

    const startApply = performance.now()
    let totalWire = 0
    for (let step = 1; step <= 30; step++) {
      host.transact(() => {
        for (const r of rects) {
          const ynode = hostNodes.get(r.id)
          if (!ynode) continue
          const updated = { ...r, x: (r.x ?? 0) + step }
          syncNodePropsToYMap(asNode(updated), ynode, ['x'])
        }
      })
      const update = applyHostUpdateToPeer(host, peer, peerState)
      peerState = Y.encodeStateVector(peer)
      totalWire += update.byteLength
    }
    const elapsedApply = performance.now() - startApply

    for (let i = 0; i < 10; i++) {
      expect(peerNodes.get(`r${i}`)?.get('x')).toBe((rects[i].x ?? 0) + 30)
    }
    expect(elapsedApply).toBeLessThan(500)
    expect(totalWire).toBeLessThan(20_000)
  })

  test('双方向編集 (host + peer 同時に異なる node を更新) で merge が成立', () => {
    const host = new Y.Doc()
    const peer = new Y.Doc()
    const hostNodes = host.getMap<Y.Map<unknown>>('nodes')
    const peerNodes = peer.getMap<Y.Map<unknown>>('nodes')

    const rectA = makeRect('a', 100, 100)
    const rectB = makeRect('b', 200, 200)
    host.transact(() => {
      const ynA = new Y.Map<unknown>()
      hostNodes.set('a', ynA)
      syncNodePropsToYMap(asNode(rectA), ynA)
      const ynB = new Y.Map<unknown>()
      hostNodes.set('b', ynB)
      syncNodePropsToYMap(asNode(rectB), ynB)
    })
    Y.applyUpdate(peer, Y.encodeStateAsUpdate(host))

    host.transact(() => {
      const ynA = hostNodes.get('a')
      if (ynA) syncNodePropsToYMap(asNode({ ...rectA, x: 500 }), ynA, ['x'])
    })
    peer.transact(() => {
      const ynB = peerNodes.get('b')
      if (ynB) syncNodePropsToYMap(asNode({ ...rectB, y: 700 }), ynB, ['y'])
    })

    Y.applyUpdate(host, Y.encodeStateAsUpdate(peer))
    Y.applyUpdate(peer, Y.encodeStateAsUpdate(host))

    expect(hostNodes.get('a')?.get('x')).toBe(500)
    expect(hostNodes.get('b')?.get('y')).toBe(700)
    expect(peerNodes.get('a')?.get('x')).toBe(500)
    expect(peerNodes.get('b')?.get('y')).toBe(700)
  })
})
