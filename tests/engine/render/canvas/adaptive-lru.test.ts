import { describe, expect, mock, test } from 'bun:test'

import { SkiaRenderer } from '#core/canvas/renderer'

function createRenderer() {
  return Object.assign(Object.create(SkiaRenderer.prototype), {
    isDragInProgress: false,
    pendingSubtreePictureRecordQueue: [],
    subtreePictureCache: new Map(),
    subtreePictureCacheLruLimit: 2000,
    subtreePictureCachePageId: null,
    subtreePictureCacheSceneVersion: -1,
    surface: {
      flush: mock()
    }
  }) as SkiaRenderer
}

describe('adaptive subtree picture cache LRU limit', () => {
  test('viewport child count growth increases the effective limit immediately', () => {
    const renderer = createRenderer()

    expect(renderer.updateSubtreePictureCacheLruLimit(200)).toBe(500)
    expect(renderer.subtreePictureCacheLruLimit).toBe(500)

    expect(renderer.updateSubtreePictureCacheLruLimit(400)).toBe(600)
    expect(renderer.subtreePictureCacheLruLimit).toBe(600)
  })

  test('drag in-progress shrinks the limit to viewport children plus headroom', () => {
    const renderer = createRenderer()

    renderer.setDragInProgress(true)
    expect(renderer.updateSubtreePictureCacheLruLimit(120)).toBe(170)

    renderer.setDragInProgress(false, { flushSubtreePictureCacheOnEnd: true })
    expect(renderer.surface.flush).toHaveBeenCalledTimes(1)
  })
})
