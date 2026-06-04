import { describe, expect, mock, test } from 'bun:test'

import type { SkiaRenderer } from '#core/canvas/renderer'
import { render } from '#core/canvas/renderer/pipeline'
import { cachedSubtreePicture } from '#core/canvas/renderer/retained-backing'
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

function createSceneRenderer(pageId: string) {
  const recordedPictures: TestPicture[] = []
  const canvas = {
    clear: mock(),
    drawPicture: mock(),
    restore: mock(),
    save: mock(),
    scale: mock(),
    translate: mock()
  }
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
    labelCache: {
      update: mock()
    } as SkiaRenderer['labelCache'],
    pageColor: { r: 1, g: 1, b: 1, a: 1 },
    pageId,
    panX: 0,
    panY: 0,
    profiler: profiler as SkiaRenderer['profiler'],
    renderNode: mock(),
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
      getCanvas: mock(() => canvas),
      makeSurface: mock(() => null)
    } as SkiaRenderer['surface'],
    viewportHeight: 200,
    viewportWidth: 500,
    worldViewport: { x: 0, y: 0, w: 500, h: 200 },
    zoom: 1,
    _culledCount: 0,
    _nodeCount: 0
  }

  return {
    canvas,
    recordedPictures,
    renderer: renderer as SkiaRenderer
  }
}

function createCacheRenderer(pageId: string) {
  const recordedPictures: TestPicture[] = []
  const renderer: Partial<SkiaRenderer> = {
    ck: {
      LTRBRect: mock((left: number, top: number, right: number, bottom: number) => [
        left,
        top,
        right,
        bottom
      ]),
      PictureRecorder: createPictureRecorder(recordedPictures)
    } as SkiaRenderer['ck'],
    pageId,
    renderNode: mock(),
    subtreePictureCache: new Map(),
    subtreePictureCacheLruLimit: 2000,
    subtreePictureCachePageId: pageId,
    subtreePictureCacheSceneVersion: 1,
    worldViewport: { x: 0, y: 0, w: 100, h: 100 }
  }

  return {
    recordedPictures,
    renderer: renderer as SkiaRenderer
  }
}

describe('viewport culling', () => {
  test('render skips picture recording for page children outside the viewport', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    for (let i = 0; i < 10; i++) {
      graph.createNode('FRAME', page.id, {
        x: i * 180,
        y: 0,
        width: 100,
        height: 100
      })
    }

    const { canvas, recordedPictures, renderer } = createSceneRenderer(page.id)

    render(renderer, graph, new Set(), {}, 1, 'scene')

    expect(recordedPictures).toHaveLength(3)
    expect(canvas.drawPicture).toHaveBeenCalledTimes(3)
    expect(renderer.renderNode).toHaveBeenCalledTimes(3)
    expect(renderer._culledCount).toBe(7)
  })

  test('cachedSubtreePicture returns early outside the viewport without recording', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const frame = graph.createNode('FRAME', page.id, {
      x: 1000,
      y: 1000,
      width: 120,
      height: 120
    })

    const { recordedPictures, renderer } = createCacheRenderer(page.id)
    const picture = cachedSubtreePicture(renderer, graph, frame.id, 1)

    expect(picture).toBeNull()
    expect(recordedPictures).toHaveLength(0)
    expect(renderer.renderNode).not.toHaveBeenCalled()
    expect(renderer.subtreePictureCache.size).toBe(0)
  })
})
