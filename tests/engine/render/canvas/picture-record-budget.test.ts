import { describe, expect, mock, test } from 'bun:test'

import type { SkiaRenderer } from '#core/canvas/renderer'
import { render } from '#core/canvas/renderer/pipeline'
import { SceneGraph } from '#core/scene-graph'

type TestPicture = {
  delete: ReturnType<typeof mock>
}

function createPictureRecorder(recordedPictures: TestPicture[]) {
  return mock(function PictureRecorder() {
    const picture: TestPicture = {
      delete: mock()
    }
    recordedPictures.push(picture)

    return {
      beginRecording: mock(() => ({})),
      finishRecordingAsPicture: mock(() => picture),
      delete: mock()
    }
  })
}

function createGraph(nodeCount: number) {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  for (let i = 0; i < nodeCount; i++) {
    graph.createNode('FRAME', page.id, {
      x: (i % 20) * 120,
      y: Math.floor(i / 20) * 120,
      width: 100,
      height: 100
    })
  }
  return { graph, page }
}

function createRenderer(pageId: string, maxPictureRecordsPerFrame: number) {
  const recordedPictures: TestPicture[] = []
  const liveCanvas = {
    clear: mock(),
    drawPicture: mock(),
    restore: mock(),
    save: mock(),
    scale: mock(),
    translate: mock()
  }
  const recordedNodeIds: string[] = []
  const liveDrawNodeIds: string[] = []
  const profiler = {
    beginFrame: mock(),
    endFrame: mock(),
    beginPhase: mock(),
    endPhase: mock(),
    setFlushTime: mock(),
    setNodeCounts: mock(),
    setScenePictureDrawTime: mock(),
    setScenePictureMode: mock(),
    setScenePictureRecordTime: mock()
  }

  const renderer: Partial<SkiaRenderer> = {
    ck: {
      AlphaType: { Premul: 'Premul' },
      Color4f: mock((r: number, g: number, b: number, a: number) => [r, g, b, a]),
      ColorSpace: { SRGB: 'SRGB' },
      ColorType: { RGBA_8888: 'RGBA_8888' },
      LTRBRect: mock((left: number, top: number, right: number, bottom: number) => [
        left,
        top,
        right,
        bottom
      ]),
      PictureRecorder: createPictureRecorder(recordedPictures)
    } as SkiaRenderer['ck'],
    dpr: 1,
    isDragInProgress: false,
    labelCache: {
      update: mock()
    } as SkiaRenderer['labelCache'],
    maxPictureRecordsPerFrame,
    pageColor: { r: 1, g: 1, b: 1, a: 1 },
    pageId,
    panX: 0,
    panY: 0,
    pendingSubtreePictureRecordQueue: [],
    profiler: profiler as SkiaRenderer['profiler'],
    renderNode: mock((canvas: object, _graph: SceneGraph, nodeId: string) => {
      if (canvas === liveCanvas) liveDrawNodeIds.push(nodeId)
      else recordedNodeIds.push(nodeId)
    }),
    sceneBacking: null,
    sceneBackingAverageRecordMs: 40,
    sceneBackingAverageViewportIntervalMs: 80,
    sceneBackingBuild: null,
    sceneBackingLastViewportEventAt: 0,
    sceneBackingNeedsCrispRender: false,
    sceneBackingPreviewUntil: 0,
    scenePicture: null,
    scenePicturePageId: null,
    scenePicturePositionPreviewVersion: -1,
    scenePictureVersion: -1,
    showRulers: false,
    subtreePictureCache: new Map(),
    subtreePictureCacheLruLimit: 2000,
    subtreePictureCachePageId: null,
    subtreePictureCacheSceneVersion: -1,
    surface: {
      flush: mock(),
      getCanvas: mock(() => liveCanvas),
      makeSurface: mock(() => null)
    } as SkiaRenderer['surface'],
    viewportHeight: 3000,
    viewportWidth: 3000,
    worldViewport: { x: 0, y: 0, w: 3000, h: 3000 },
    zoom: 1,
    _culledCount: 0,
    _nodeCount: 0
  }

  return {
    liveCanvas,
    liveDrawNodeIds,
    recordedNodeIds,
    recordedPictures,
    renderer: renderer as SkiaRenderer
  }
}

describe('picture record budget', () => {
  test('records at most 100 pictures in a frame and carries the rest forward', () => {
    const { graph, page } = createGraph(200)
    const { liveCanvas, liveDrawNodeIds, recordedNodeIds, recordedPictures, renderer } =
      createRenderer(page.id, 100)

    render(renderer, graph, new Set(), { draggingClipBypassAll: true }, 1, 'scene')

    expect(recordedPictures).toHaveLength(100)
    expect(recordedNodeIds).toHaveLength(100)
    expect(liveCanvas.drawPicture).toHaveBeenCalledTimes(100)
    expect(liveDrawNodeIds).toHaveLength(100)
    expect(renderer.pendingSubtreePictureRecordQueue).toHaveLength(100)
    expect(renderer.pendingSubtreePictureRecordQueue).toEqual(page.childIds.slice(100))
  })

  test('carryover queue is consumed in FIFO order on the next frame', () => {
    const { graph, page } = createGraph(3)
    const { recordedNodeIds, renderer } = createRenderer(page.id, 1)

    render(renderer, graph, new Set(), { draggingClipBypassAll: true }, 1, 'scene')
    expect(recordedNodeIds).toEqual([page.childIds[0]])
    expect(renderer.pendingSubtreePictureRecordQueue).toEqual(page.childIds.slice(1))

    recordedNodeIds.length = 0

    render(renderer, graph, new Set(), { draggingClipBypassAll: true }, 1, 'scene')
    expect(recordedNodeIds).toEqual([page.childIds[1]])
    expect(renderer.pendingSubtreePictureRecordQueue).toEqual([page.childIds[2]])
  })
})
