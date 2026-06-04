import { describe, expect, mock, test } from 'bun:test'

import type { SkiaRenderer } from '#core/canvas/renderer'
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

function createRenderer(pageId: string) {
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
    subtreePictureCacheLruLimit: 3,
    subtreePictureCachePageId: pageId,
    subtreePictureCacheSceneVersion: 1,
    worldViewport: { x: 0, y: 0, w: 2000, h: 2000 }
  }

  return {
    recordedPictures,
    renderer: renderer as SkiaRenderer
  }
}

describe('subtree picture cache LRU eviction', () => {
  test('evicts the least recently used pictures and re-records evicted nodes on demand', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const nodes = Array.from({ length: 5 }, (_, index) =>
      graph.createNode('FRAME', page.id, {
        x: index * 120,
        y: 0,
        width: 100,
        height: 100
      })
    )
    const { recordedPictures, renderer } = createRenderer(page.id)

    const pictureA = cachedSubtreePicture(renderer, graph, nodes[0].id, 1)
    const pictureB = cachedSubtreePicture(renderer, graph, nodes[1].id, 1)
    const pictureC = cachedSubtreePicture(renderer, graph, nodes[2].id, 1)
    const pictureAHit = cachedSubtreePicture(renderer, graph, nodes[0].id, 1)
    cachedSubtreePicture(renderer, graph, nodes[3].id, 1)
    cachedSubtreePicture(renderer, graph, nodes[4].id, 1)

    expect(pictureAHit).toBe(pictureA)
    expect(recordedPictures).toHaveLength(5)
    expect(pictureA?.delete).not.toHaveBeenCalled()
    expect(pictureB?.delete).toHaveBeenCalledTimes(1)
    expect(pictureC?.delete).toHaveBeenCalledTimes(1)
    expect(renderer.subtreePictureCache.size).toBe(3)
    expect(renderer.subtreePictureCache.has(nodes[0].id)).toBe(true)
    expect(renderer.subtreePictureCache.has(nodes[3].id)).toBe(true)
    expect(renderer.subtreePictureCache.has(nodes[4].id)).toBe(true)

    const rerecordedB = cachedSubtreePicture(renderer, graph, nodes[1].id, 1)

    expect(rerecordedB).not.toBe(pictureB)
    expect(recordedPictures).toHaveLength(6)
  })
})
