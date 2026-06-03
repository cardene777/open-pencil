import { describe, expect, mock, test } from 'bun:test'

import type { Canvas } from 'canvaskit-wasm'

import type { RenderOverlays, SkiaRenderer } from '#core/canvas/renderer'
import { getRenderableChildRuns, renderNode } from '#core/canvas/scene'
import { SceneGraph } from '#core/scene-graph'

type DrawRecord = {
  nodeId: string
  clipped: boolean
}

type MockCanvas = Canvas & {
  __clipActive: boolean
  __clipStack: boolean[]
}

function pageId(graph: SceneGraph) {
  return graph.getPages()[0].id
}

function createCanvas(): MockCanvas {
  const canvas = {
    __clipActive: false,
    __clipStack: [],
    save: mock(function (this: MockCanvas) {
      this.__clipStack.push(this.__clipActive)
    }),
    restore: mock(function (this: MockCanvas) {
      this.__clipActive = this.__clipStack.pop() ?? false
    }),
    translate: mock(() => undefined),
    rotate: mock(() => undefined),
    scale: mock(() => undefined),
    saveLayer: mock(() => undefined),
    clipRect: mock(function (this: MockCanvas) {
      this.__clipActive = true
    }),
    clipRRect: mock(function (this: MockCanvas) {
      this.__clipActive = true
    }),
    clipPath: mock(function (this: MockCanvas) {
      this.__clipActive = true
    })
  }
  return canvas as MockCanvas
}

function createRenderer(records: DrawRecord[]) {
  const renderer = {
    _nodeCount: 0,
    _culledCount: 0,
    worldViewport: { x: -100, y: -100, w: 1000, h: 1000 },
    ck: {
      BlendMode: { SrcOver: 'SrcOver' },
      LTRBRect: mock(() => new Float32Array(4)),
      ClipOp: { Intersect: 'Intersect' }
    },
    opacityPaint: {
      setAlphaf: mock(() => undefined),
      setBlendMode: mock(() => undefined)
    },
    effectLayerPaint: {
      setImageFilter: mock(() => undefined),
      setColorFilter: mock(() => undefined),
      setBlendMode: mock(() => undefined)
    },
    getCachedBlur: mock(() => null),
    renderShape: mock((canvas: MockCanvas, node) => {
      records.push({ nodeId: node.id, clipped: canvas.__clipActive })
    }),
    renderSection: mock((canvas: MockCanvas, node) => {
      records.push({ nodeId: node.id, clipped: canvas.__clipActive })
    }),
    renderComponentSet: mock((canvas: MockCanvas, node) => {
      records.push({ nodeId: node.id, clipped: canvas.__clipActive })
    }),
    renderNode(canvas, graph, nodeId, overlays, parentAbsX, parentAbsY) {
      renderNode(this as SkiaRenderer, canvas, graph, nodeId, overlays, parentAbsX, parentAbsY)
    }
  }
  return renderer as SkiaRenderer
}

function createClippingFrame(graph: SceneGraph, name: string, x = 0) {
  return graph.createNode('FRAME', pageId(graph), {
    name,
    x,
    y: 0,
    width: 100,
    height: 100,
    clipsContent: true,
    layoutMode: 'HORIZONTAL'
  })
}

function getNodeOrThrow(graph: SceneGraph, id: string) {
  const node = graph.getNode(id)
  if (!node) throw new Error(`Expected node ${id}`)
  return node
}

function renderChildRecords(
  graph: SceneGraph,
  frameId: string,
  overlays: RenderOverlays = {}
): DrawRecord[] {
  const records: DrawRecord[] = []
  const renderer = createRenderer(records)
  const canvas = createCanvas()

  renderNode(renderer, canvas, graph, frameId, overlays)

  return records.filter((record) => record.nodeId !== frameId)
}

describe('clipsContent rendering', () => {
  test('renders absolute children outside the parent clip while auto-layout children stay clipped', () => {
    const graph = new SceneGraph()
    const frame = createClippingFrame(graph, 'Frame')
    const autoChild = graph.createNode('RECTANGLE', frame.id, {
      x: 0,
      y: 0,
      width: 40,
      height: 40
    })
    const absoluteChild = graph.createNode('RECTANGLE', frame.id, {
      x: 140,
      y: 0,
      width: 40,
      height: 40,
      layoutPositioning: 'ABSOLUTE'
    })

    const records = renderChildRecords(graph, frame.id)

    expect(records).toEqual([
      { nodeId: autoChild.id, clipped: true },
      { nodeId: absoluteChild.id, clipped: false }
    ])
  })

  test('limits drag clip bypass to the targeted frame', () => {
    const graph = new SceneGraph()
    const bypassFrame = createClippingFrame(graph, 'BypassFrame')
    const normalFrame = createClippingFrame(graph, 'NormalFrame', 200)
    const bypassChild = graph.createNode('RECTANGLE', bypassFrame.id, {
      x: 120,
      y: 0,
      width: 40,
      height: 40
    })
    const normalChild = graph.createNode('RECTANGLE', normalFrame.id, {
      x: 120,
      y: 0,
      width: 40,
      height: 40
    })

    const bypassRecords = renderChildRecords(graph, bypassFrame.id, {
      draggingClipBypassFrameId: bypassFrame.id
    })
    const normalRecords = renderChildRecords(graph, normalFrame.id, {
      draggingClipBypassFrameId: bypassFrame.id
    })

    expect(bypassRecords).toEqual([{ nodeId: bypassChild.id, clipped: false }])
    expect(normalRecords).toEqual([{ nodeId: normalChild.id, clipped: true }])
  })

  test('keeps a mask and its absolute target in the same clipped auto-layout run', () => {
    const graph = new SceneGraph()
    const frame = createClippingFrame(graph, 'MaskedFrame')
    const mask = graph.createNode('RECTANGLE', frame.id, {
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      isMask: true
    })
    const target = graph.createNode('RECTANGLE', frame.id, {
      x: 120,
      y: 0,
      width: 40,
      height: 40,
      layoutPositioning: 'ABSOLUTE'
    })

    const parent = getNodeOrThrow(graph, frame.id)

    expect(getRenderableChildRuns(graph, parent, parent.childIds)).toEqual([
      { childIds: [mask.id, target.id], shouldClip: true }
    ])
  })

  test('keeps an all-absolute mask group outside the clip in auto-layout frames', () => {
    const graph = new SceneGraph()
    const frame = createClippingFrame(graph, 'AbsoluteMaskedFrame')
    const mask = graph.createNode('RECTANGLE', frame.id, {
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      isMask: true,
      layoutPositioning: 'ABSOLUTE'
    })
    const target = graph.createNode('RECTANGLE', frame.id, {
      x: 120,
      y: 0,
      width: 40,
      height: 40,
      layoutPositioning: 'ABSOLUTE'
    })

    const parent = getNodeOrThrow(graph, frame.id)

    expect(getRenderableChildRuns(graph, parent, parent.childIds)).toEqual([
      { childIds: [mask.id, target.id], shouldClip: false }
    ])
  })

  test('keeps absolute children clipped for layoutMode NONE frames', () => {
    const graph = new SceneGraph()
    const frame = graph.createNode('FRAME', pageId(graph), {
      name: 'RegularFrame',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      clipsContent: true,
      layoutMode: 'NONE'
    })
    const absoluteChild = graph.createNode('RECTANGLE', frame.id, {
      x: 140,
      y: 0,
      width: 40,
      height: 40,
      layoutPositioning: 'ABSOLUTE'
    })

    const parent = getNodeOrThrow(graph, frame.id)

    expect(getRenderableChildRuns(graph, parent, parent.childIds)).toEqual([
      { childIds: [absoluteChild.id], shouldClip: true }
    ])
    expect(renderChildRecords(graph, frame.id)).toEqual([
      { nodeId: absoluteChild.id, clipped: true }
    ])
  })
})
