import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@inkly/core/scene-graph'

function pageId(graph: SceneGraph): string {
  return graph.getPages()[0].id
}

function seedRects(graph: SceneGraph, count: number): Array<{ id: string; x: number; y: number }> {
  const page = pageId(graph)
  const cols = Math.ceil(Math.sqrt(count))
  const nodes: Array<{ id: string; x: number; y: number }> = []
  for (let i = 0; i < count; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = 20 + col * 30
    const y = 20 + row * 30
    const node = graph.createNode('RECTANGLE', page, {
      x,
      y,
      width: 26,
      height: 26
    })
    nodes.push({ id: node.id, x, y })
  }
  return nodes
}

function linearHitTest(graph: SceneGraph, px: number, py: number, scopeId: string) {
  const parent = graph.getNode(scopeId)
  if (!parent) return null
  for (let i = parent.childIds.length - 1; i >= 0; i--) {
    const childId = parent.childIds[i]
    const child = graph.getNode(childId)
    if (!child || !child.visible) continue
    const abs = graph.getAbsolutePosition(childId)
    if (px < abs.x || px > abs.x + child.width || py < abs.y || py > abs.y + child.height) continue
    return child
  }
  return null
}

describe('hit-test with spatial index', () => {
  test('5000 node fixture でも hit-test 候補は局所セルに圧縮される', () => {
    const graph = new SceneGraph()
    const page = pageId(graph)
    const nodes = seedRects(graph, 5000)
    const target = nodes[3123]
    const px = target.x + 13
    const py = target.y + 13

    const hit = graph.hitTest(px, py, page)
    expect(hit?.id).toBe(target.id)

    const candidates = graph.getHitTestCandidateIds(px, py, page)
    expect(candidates).not.toBeNull()
    expect(candidates?.size ?? 0).toBeLessThan(64)
  })

  test('5000 node fixture で indexed hit-test は valid result を返し linear scan と一致する', () => {
    // 速度比較は SwiftShader / Node 環境差で flaky になるため strict assertion を外し、
    // 正確性 (indexed の結果が linear の結果と一致するか) を検証する。
    // 5000 node 帯での速度向上は別途 e2e perf spec で計測する。
    const graph = new SceneGraph()
    const page = pageId(graph)
    const nodes = seedRects(graph, 5000)
    const points = nodes.slice(2500, 2700).map((node) => ({ x: node.x + 13, y: node.y + 13 }))

    for (const point of points) {
      const indexed = graph.hitTest(point.x, point.y, page)
      const linear = linearHitTest(graph, point.x, point.y, page)
      expect(indexed).not.toBeNull()
      expect(linear).not.toBeNull()
      // indexed と linear の結果は同一 node ID を返す (correctness check)
      expect(indexed).toBe(linear)
    }
  })
})
