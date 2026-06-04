import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@inkly/core/scene-graph'
import { hitTest } from '@inkly/core/scene-graph/hit-test'

function seedRects(graph: SceneGraph, count: number) {
  const pageId = graph.rootId
  const cols = Math.ceil(Math.sqrt(count))
  for (let i = 0; i < count; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    graph.createNode('RECT', pageId, {
      x: 20 + col * 30,
      y: 20 + row * 30,
      width: 26,
      height: 26
    })
  }
}

describe('hit-test AABB fast path', () => {
  test('rotation=0 の RECT は AABB fast path で命中する', () => {
    const graph = new SceneGraph()
    const node = graph.createNode('RECT', graph.rootId, {
      x: 100,
      y: 100,
      width: 50,
      height: 50
    })
    const hit = hitTest(graph, 125, 125)
    expect(hit?.id).toBe(node.id)
  })

  test('rotation=0 の RECT は AABB 外で reject される', () => {
    const graph = new SceneGraph()
    graph.createNode('RECT', graph.rootId, {
      x: 100,
      y: 100,
      width: 50,
      height: 50
    })
    const hit = hitTest(graph, 60, 60)
    expect(hit).toBeNull()
  })

  test('rotation 有り RECT は Matrix invert 経路で正しく判定する', () => {
    const graph = new SceneGraph()
    const node = graph.createNode('RECT', graph.rootId, {
      x: 100,
      y: 100,
      width: 50,
      height: 50,
      rotation: 45
    })
    const hit = hitTest(graph, 125, 125)
    expect(hit?.id).toBe(node.id)
  })

  test('1000 node で hit-test 100 回が 200ms 以下', () => {
    const graph = new SceneGraph()
    seedRects(graph, 1000)

    const start = performance.now()
    for (let i = 0; i < 100; i++) {
      hitTest(graph, 100 + i, 100 + i)
    }
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(200)
  })

  test('AABB reject が大半の miss ケースで O(N) 走査が高速', () => {
    const graph = new SceneGraph()
    seedRects(graph, 1000)

    const start = performance.now()
    for (let i = 0; i < 100; i++) {
      const result = hitTest(graph, 100000, 100000)
      expect(result).toBeNull()
    }
    const elapsed = performance.now() - start

    expect(elapsed).toBeLessThan(100)
  })
})
