import { describe, expect, test } from 'bun:test'

import { SceneGraph } from '@inkly/core/scene-graph'

import { executeReaction, type PrototypeRuntimeState } from '@/app/prototype/runtime'

function makeGraph() {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0]?.id ?? graph.rootId
  const frameA = graph.createNode('FRAME', pageId, { name: 'A', width: 300, height: 200 })
  const frameB = graph.createNode('FRAME', pageId, {
    name: 'B',
    x: 360,
    width: 300,
    height: 200
  })
  const overlay = graph.createNode('FRAME', pageId, {
    name: 'Overlay',
    x: 80,
    y: 40,
    width: 180,
    height: 120
  })
  return { graph, frameA, frameB, overlay }
}

function runtimeState(currentFrameId: string): PrototypeRuntimeState {
  return {
    currentFrameId,
    overlayFrameId: null,
    history: []
  }
}

describe('executeReaction', () => {
  test('navigate moves to the target frame and records history', () => {
    const { graph, frameA, frameB } = makeGraph()
    const next = executeReaction(
      runtimeState(frameA.id),
      { trigger: 'onClick', action: 'navigate', targetFrameId: frameB.id },
      graph
    )

    expect(next.currentFrameId).toBe(frameB.id)
    expect(next.overlayFrameId).toBeNull()
    expect(next.history).toEqual([frameA.id])
  })

  test('openOverlay sets overlayFrameId without changing the current frame', () => {
    const { graph, frameA, overlay } = makeGraph()
    const next = executeReaction(
      runtimeState(frameA.id),
      { trigger: 'onClick', action: 'openOverlay', targetFrameId: overlay.id },
      graph
    )

    expect(next.currentFrameId).toBe(frameA.id)
    expect(next.overlayFrameId).toBe(overlay.id)
    expect(next.history).toEqual([])
  })

  test('closeOverlay clears the overlay frame', () => {
    const { graph, frameA, overlay } = makeGraph()
    const next = executeReaction(
      { currentFrameId: frameA.id, overlayFrameId: overlay.id, history: [] },
      { trigger: 'onClick', action: 'closeOverlay' },
      graph
    )

    expect(next.overlayFrameId).toBeNull()
    expect(next.currentFrameId).toBe(frameA.id)
  })

  test('back closes the overlay before walking history', () => {
    const { graph, frameA, frameB, overlay } = makeGraph()
    const next = executeReaction(
      { currentFrameId: frameB.id, overlayFrameId: overlay.id, history: [frameA.id] },
      { trigger: 'onClick', action: 'back' },
      graph
    )

    expect(next.currentFrameId).toBe(frameB.id)
    expect(next.overlayFrameId).toBeNull()
    expect(next.history).toEqual([frameA.id])
  })

  test('back pops to the previous frame when no overlay is open', () => {
    const { graph, frameA, frameB } = makeGraph()
    const next = executeReaction(
      { currentFrameId: frameB.id, overlayFrameId: null, history: [frameA.id] },
      { trigger: 'onClick', action: 'back' },
      graph
    )

    expect(next.currentFrameId).toBe(frameA.id)
    expect(next.history).toEqual([])
  })

  test('invalid target frames leave state unchanged', () => {
    const { graph, frameA } = makeGraph()
    const current = runtimeState(frameA.id)
    const next = executeReaction(
      current,
      { trigger: 'onClick', action: 'navigate', targetFrameId: 'missing-frame' },
      graph
    )

    expect(next).toBe(current)
  })

  test('externalUrl does not change runtime state', () => {
    const { graph, frameA } = makeGraph()
    const current = runtimeState(frameA.id)
    const next = executeReaction(
      current,
      { trigger: 'onClick', action: 'externalUrl', externalUrl: 'https://example.com' },
      graph
    )

    expect(next).toBe(current)
  })
})
