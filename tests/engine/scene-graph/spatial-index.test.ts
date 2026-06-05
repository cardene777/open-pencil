import { describe, expect, test } from 'bun:test'

import { SceneGraph, SpatialIndex, type SpatialIndexBounds } from '@inkly/core/scene-graph'

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe('SpatialIndex', () => {
  test('grid build と query で point 周辺候補だけ返す', () => {
    const index = new SpatialIndex()
    const bounds = new Map<string, SpatialIndexBounds>([
      ['a', { minX: 0, minY: 0, maxX: 40, maxY: 40 }],
      ['b', { minX: 180, minY: 180, maxX: 240, maxY: 240 }]
    ])

    index.setViewport({ width: 800, height: 600, panX: 0, panY: 0, zoom: 1 })
    index.rebuild(bounds.keys(), (nodeId) => bounds.get(nodeId))

    expect(index.queryPoint(20, 20)).toEqual(new Set(['a']))
    expect(index.queryPoint(220, 220)).toEqual(new Set(['b']))
    expect(index.queryPoint(500, 500)).toEqual(new Set())
  })

  test('node update と remove が incremental に反映される', () => {
    const index = new SpatialIndex()

    index.setViewport({ width: 800, height: 600, panX: 0, panY: 0, zoom: 1 })
    index.add('rect', { minX: 0, minY: 0, maxX: 40, maxY: 40 })
    expect(index.queryPoint(20, 20)).toEqual(new Set(['rect']))

    index.update('rect', { minX: 240, minY: 240, maxX: 300, maxY: 300 })
    expect(index.queryPoint(20, 20)).toEqual(new Set())
    expect(index.queryPoint(260, 260)).toEqual(new Set(['rect']))

    index.remove('rect')
    expect(index.queryPoint(260, 260)).toEqual(new Set())
  })

  test('viewport 由来で cell size を再計算する', () => {
    const index = new SpatialIndex()

    index.setViewport({ width: 800, height: 600, panX: 0, panY: 0, zoom: 1 })
    expect(index.getCellSize()).toBe(100)

    index.setViewport({ width: 1600, height: 900, panX: 0, panY: 0, zoom: 2 })
    expect(index.getCellSize()).toBe(100)

    index.setViewport({ width: 1600, height: 900, panX: 0, panY: 0, zoom: 1 })
    expect(index.getCellSize()).toBe(200)
  })
})

describe('SceneGraph spatial index integration', () => {
  test('viewport change は debounced rebuild 後に candidate lookup を再開する', async () => {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const rect = graph.createNode('RECTANGLE', pageId, {
      x: 20,
      y: 20,
      width: 40,
      height: 40
    })

    const before = graph.getHitTestCandidateIds(30, 30, pageId)
    expect(before?.has(rect.id)).toBe(true)

    graph.setHitTestViewport({ width: 1600, height: 900, panX: 240, panY: 120, zoom: 1.5 })
    expect(graph.getHitTestCandidateIds(30, 30, pageId)).toBeNull()

    await wait(40)

    const after = graph.getHitTestCandidateIds(30, 30, pageId)
    expect(after?.has(rect.id)).toBe(true)
  })
})
