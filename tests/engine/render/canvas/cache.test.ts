import { beforeAll, describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

import {
  computeAllLayouts,
  createEditor,
  initCodec,
  parseFigFile,
  renderNodesToImage,
  SceneGraph,
  SkiaRenderer,
  type SceneNode
} from '@inkly/core'

import { initCanvasKit } from '#cli/headless'

import { expectDefined } from '#tests/helpers/assert'
import { repoPath } from '#tests/helpers/paths'

let graph: SceneGraph
let movingNodeId: string
let ck: Awaited<ReturnType<typeof initCanvasKit>>

beforeAll(async () => {
  ck = await initCanvasKit()
  await initCodec()
  const buf = readFileSync(repoPath('tests/fixtures/gold-preview.fig'))
  graph = await parseFigFile(buf.buffer as ArrayBuffer)
  computeAllLayouts(graph)
  const preview = [...graph.getAllNodes()].find((node) => node.name === 'Preview Thumbnail')
  const input = preview
    ? graph.getChildren(preview.id).find((node) => node.name === 'Input')
    : undefined
  if (!input) throw new Error('gold-preview Input fixture node not found')
  movingNodeId = input.id
})

function renderPreview(renderer: SkiaRenderer, sceneVersion: number): Uint8Array {
  renderer.render(graph, new Set(), {}, sceneVersion)
  const image = renderer.surface.makeImageSnapshot()
  const pixels = image.readPixels(0, 0, {
    width: 900,
    height: 700,
    colorType: ck.ColorType.RGBA_8888,
    alphaType: ck.AlphaType.Unpremul,
    colorSpace: ck.ColorSpace.SRGB
  })
  image.delete()
  return expectDefined(pixels, 'rendered pixels')
}

function childNamed(parent: SceneNode | undefined, name: string): SceneNode | undefined {
  return parent ? graph.getChildren(parent.id).find((node) => node.name === name) : undefined
}

function fixtureInputBadge(): SceneNode {
  const preview = [...graph.getAllNodes()].find((node) => node.name === 'Preview Thumbnail')
  const input = childNamed(preview, 'Input')
  const inputRoot = childNamed(input, '_input')
  const inputFrame = childNamed(inputRoot, 'Input')
  const content = childNamed(inputFrame, 'Content')
  const tags = childNamed(content, 'Tags')
  const badge = childNamed(tags, 'Badge')
  if (!badge) throw new Error('gold-preview badge fixture node not found')
  return badge
}

function countDarkPixels(pixels: Uint8Array): number {
  let dark = 0
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] > 200 && pixels[i] < 80 && pixels[i + 1] < 80 && pixels[i + 2] < 80) {
      dark++
    }
  }
  return dark
}

function pixelIndex(width: number, x: number, y: number): number {
  return (y * width + x) * 4
}

function pixelAt(pixels: Uint8Array, width: number, x: number, y: number) {
  const index = pixelIndex(width, x, y)
  return {
    r: pixels[index],
    g: pixels[index + 1],
    b: pixels[index + 2],
    a: pixels[index + 3]
  }
}

function maskYCenter(
  pixels: Uint8Array,
  width: number,
  height: number,
  matches: (index: number) => boolean,
  xRange = [0, width]
): number {
  let minY = Infinity
  let maxY = -Infinity
  for (let y = 0; y < height; y++) {
    for (let x = xRange[0]; x < xRange[1]; x++) {
      if (!matches(pixelIndex(width, x, y))) continue
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
    }
  }
  if (minY === Infinity) throw new Error('pixel mask had no matches')
  return (minY + maxY) / 2
}

describe('render cache regressions', () => {
  test('badge label is vertically centered in the pill', async () => {
    const surface = expectDefined(ck.MakeSurface(120, 60), 'badge surface')
    const renderer = new SkiaRenderer(ck, surface)
    await renderer.loadFonts()
    try {
      const badge = fixtureInputBadge()
      const png = renderNodesToImage(ck, renderer, graph, graph.getPages()[0].id, [badge.id], {
        scale: 1,
        format: 'PNG'
      })
      expect(png).toBeTruthy()
      const image = expectDefined(
        ck.MakeImageFromEncoded(expectDefined(png, 'badge png')),
        'badge image'
      )
      const width = image.width()
      const height = image.height()
      const pixels = image.readPixels(0, 0, {
        width,
        height,
        colorType: ck.ColorType.RGBA_8888,
        alphaType: ck.AlphaType.Unpremul,
        colorSpace: ck.ColorSpace.SRGB
      })
      image.delete()

      const renderedPixels = expectDefined(pixels, 'badge pixels')
      const contentCenter = maskYCenter(
        renderedPixels,
        width,
        height,
        (i) => renderedPixels[i + 3] > 10
      )
      const textCenter = maskYCenter(
        renderedPixels,
        width,
        height,
        (i) =>
          renderedPixels[i + 3] > 128 &&
          pixels[i] < 130 &&
          pixels[i + 1] < 140 &&
          pixels[i + 2] < 160,
        [0, width]
      )
      expect(Math.abs(textCenter - contentCenter)).toBeLessThanOrEqual(0.6)
    } finally {
      surface.delete()
    }
  })

  test('scene picture redraw keeps text after moving a node', async () => {
    const surface = expectDefined(ck.MakeSurface(900, 700), 'preview surface')
    const renderer = new SkiaRenderer(ck, surface)
    renderer.viewportWidth = 900
    renderer.viewportHeight = 700
    renderer.dpr = 1
    await renderer.loadFonts()
    renderer.panX = 0
    renderer.panY = 0
    renderer.zoom = 0.75
    renderer.pageId = graph.getPages()[0].id

    try {
      const beforeDark = countDarkPixels(renderPreview(renderer, 1))
      const movingNode = graph.getNode(movingNodeId)
      expect(movingNode).toBeDefined()
      const originalX = movingNode?.x ?? 0
      graph.updateNode(movingNodeId, { x: originalX + 20 })
      expect(graph.getNode(movingNodeId)?.x).toBeCloseTo(originalX + 20, 3)
      const afterDark = countDarkPixels(renderPreview(renderer, 2))

      expect(afterDark).toBeGreaterThan(beforeDark * 0.8)
    } finally {
      surface.delete()
    }
  })

  test('scene picture cache recovers after position preview commits', async () => {
    const surface = expectDefined(ck.MakeSurface(900, 700), 'preview surface')
    const renderer = new SkiaRenderer(ck, surface)
    renderer.viewportWidth = 900
    renderer.viewportHeight = 700
    renderer.dpr = 1
    renderer.panX = 0
    renderer.panY = 0
    renderer.zoom = 0.75
    renderer.pageId = graph.getPages()[0].id

    try {
      renderPreview(renderer, 10)
      expect(renderer.profiler.stats.scenePictureMode).toBe('record')

      const movingNode = expectDefined(graph.getNode(movingNodeId), 'moving node')
      const originalX = movingNode.x
      graph.updateNodePositionPreview(movingNodeId, originalX + 20, movingNode.y)
      renderPreview(renderer, 10)
      expect(renderer.profiler.stats.scenePictureMode).toBe('volatile')
      expect(renderer.profiler.stats.scenePictureMissReason).toBe('position-preview')

      graph.updateNode(movingNodeId, { x: originalX + 20 })
      renderPreview(renderer, 11)
      expect(renderer.profiler.stats.scenePictureMode).toBe('record')
      expect(renderer.profiler.stats.scenePictureMissReason).toBe('position-preview-version')

      renderPreview(renderer, 11)
      expect(renderer.profiler.stats.scenePictureMode).toBe('hit')
    } finally {
      surface.delete()
    }
  })

  test('scene backing keeps absolute children outside clipped top-level frames visible', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const screen = graph.createNode('FRAME', page.id, {
      x: 20,
      y: 20,
      width: 100,
      height: 100,
      clipsContent: true,
      layoutMode: 'NONE'
    })
    graph.createNode('RECTANGLE', screen.id, {
      x: 160,
      y: 10,
      width: 40,
      height: 40,
      layoutPositioning: 'ABSOLUTE',
      fills: [
        {
          type: 'SOLID',
          color: { r: 1, g: 0, b: 0, a: 1 },
          opacity: 1,
          visible: true
        }
      ]
    })

    const surface = expectDefined(ck.MakeSurface(320, 160), 'scene backing surface')
    const renderer = new SkiaRenderer(ck, surface)
    renderer.viewportWidth = 320
    renderer.viewportHeight = 160
    renderer.dpr = 1
    renderer.panX = 0
    renderer.panY = 0
    renderer.zoom = 1
    renderer.pageId = page.id

    try {
      renderer.render(graph, new Set(), {}, 1, 'scene')
      const image = surface.makeImageSnapshot()
      const pixels = image.readPixels(0, 0, {
        width: 320,
        height: 160,
        colorType: ck.ColorType.RGBA_8888,
        alphaType: ck.AlphaType.Unpremul,
        colorSpace: ck.ColorSpace.SRGB
      })
      image.delete()

      const renderedPixels = expectDefined(pixels, 'scene backing pixels')
      const pixel = pixelAt(renderedPixels, 320, 200, 50)
      expect(pixel.r).toBeGreaterThan(200)
      expect(pixel.g).toBeLessThan(80)
      expect(pixel.b).toBeLessThan(80)
      expect(pixel.a).toBeGreaterThan(200)
    } finally {
      surface.delete()
    }
  })

  test('scene backing keeps absolute children outside clipped auto-layout frames visible', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const screen = graph.createNode('FRAME', page.id, {
      x: 20,
      y: 20,
      width: 160,
      height: 100,
      clipsContent: true,
      layoutMode: 'HORIZONTAL',
      itemSpacing: 10,
      paddingLeft: 10,
      paddingRight: 10,
      paddingTop: 10,
      paddingBottom: 10
    })
    graph.createNode('RECTANGLE', screen.id, {
      x: 10,
      y: 10,
      width: 40,
      height: 40,
      fills: [
        {
          type: 'SOLID',
          color: { r: 0, g: 0, b: 1, a: 1 },
          opacity: 1,
          visible: true
        }
      ]
    })
    graph.createNode('FRAME', screen.id, {
      x: 170,
      y: 10,
      width: 40,
      height: 40,
      layoutPositioning: 'ABSOLUTE',
      fills: [
        {
          type: 'SOLID',
          color: { r: 1, g: 0, b: 0, a: 1 },
          opacity: 1,
          visible: true
        }
      ]
    })

    const surface = expectDefined(ck.MakeSurface(320, 160), 'auto-layout scene backing surface')
    const renderer = new SkiaRenderer(ck, surface)
    renderer.viewportWidth = 320
    renderer.viewportHeight = 160
    renderer.dpr = 1
    renderer.panX = 0
    renderer.panY = 0
    renderer.zoom = 1
    renderer.pageId = page.id

    try {
      renderer.render(graph, new Set(), {}, 1, 'scene')
      const image = surface.makeImageSnapshot()
      const pixels = image.readPixels(0, 0, {
        width: 320,
        height: 160,
        colorType: ck.ColorType.RGBA_8888,
        alphaType: ck.AlphaType.Unpremul,
        colorSpace: ck.ColorSpace.SRGB
      })
      image.delete()

      const renderedPixels = expectDefined(pixels, 'auto-layout scene backing pixels')
      const pixel = pixelAt(renderedPixels, 320, 210, 50)
      expect(pixel.r).toBeGreaterThan(200)
      expect(pixel.g).toBeLessThan(80)
      expect(pixel.b).toBeLessThan(80)
      expect(pixel.a).toBeGreaterThan(200)
    } finally {
      surface.delete()
    }
  })

  test('scene backing redraw after preview-to-absolute commit keeps the pinned child visible', () => {
    const editor = createEditor()
    const page = editor.graph.getPages()[0]
    const screen = editor.graph.createNode('FRAME', page.id, {
      x: 20,
      y: 20,
      width: 160,
      height: 100,
      clipsContent: true,
      layoutMode: 'HORIZONTAL',
      itemSpacing: 10,
      paddingLeft: 10,
      paddingRight: 10,
      paddingTop: 10,
      paddingBottom: 10
    })
    editor.graph.createNode('RECTANGLE', screen.id, {
      x: 10,
      y: 10,
      width: 40,
      height: 40,
      fills: [
        {
          type: 'SOLID',
          color: { r: 0, g: 0, b: 1, a: 1 },
          opacity: 1,
          visible: true
        }
      ]
    })
    const moving = editor.graph.createNode('FRAME', screen.id, {
      x: 60,
      y: 10,
      width: 40,
      height: 40,
      fills: [
        {
          type: 'SOLID',
          color: { r: 1, g: 0, b: 0, a: 1 },
          opacity: 1,
          visible: true
        }
      ]
    })
    computeAllLayouts(editor.graph, screen.id)

    const surface = expectDefined(ck.MakeSurface(320, 160), 'preview commit scene backing surface')
    const renderer = new SkiaRenderer(ck, surface)
    renderer.viewportWidth = 320
    renderer.viewportHeight = 160
    renderer.dpr = 1
    renderer.panX = 0
    renderer.panY = 0
    renderer.zoom = 1
    renderer.pageId = page.id

    try {
      renderer.render(editor.graph, new Set(), {}, 1, 'scene')

      editor.graph.updateNodePositionPreview(moving.id, 170, 10)
      renderer.render(editor.graph, new Set(), { draggingClipBypassAll: true }, 1, 'scene')

      editor.graph.updateNodePositionPreview(moving.id, 60, 10)
      editor.graph.updateNode(moving.id, {
        x: 170,
        y: 10,
        layoutPositioning: 'ABSOLUTE'
      })

      renderer.render(editor.graph, new Set(), {}, 2, 'scene')
      renderer.render(editor.graph, new Set(), {}, 2, 'scene')

      const image = surface.makeImageSnapshot()
      const pixels = image.readPixels(0, 0, {
        width: 320,
        height: 160,
        colorType: ck.ColorType.RGBA_8888,
        alphaType: ck.AlphaType.Unpremul,
        colorSpace: ck.ColorSpace.SRGB
      })
      image.delete()

      const renderedPixels = expectDefined(pixels, 'preview commit scene backing pixels')
      const pixel = pixelAt(renderedPixels, 320, 210, 50)
      expect(pixel.r).toBeGreaterThan(200)
      expect(pixel.g).toBeLessThan(80)
      expect(pixel.b).toBeLessThan(80)
      expect(pixel.a).toBeGreaterThan(200)
    } finally {
      surface.delete()
    }
  })

  test('scene backing keeps descendants of a transparent absolute frame visible after commit', () => {
    const editor = createEditor()
    const page = editor.graph.getPages()[0]
    const screen = editor.graph.createNode('FRAME', page.id, {
      x: 20,
      y: 20,
      width: 160,
      height: 100,
      clipsContent: true,
      layoutMode: 'HORIZONTAL',
      itemSpacing: 10,
      paddingLeft: 10,
      paddingRight: 10,
      paddingTop: 10,
      paddingBottom: 10
    })
    editor.graph.createNode('RECTANGLE', screen.id, {
      x: 10,
      y: 10,
      width: 40,
      height: 40,
      fills: [
        {
          type: 'SOLID',
          color: { r: 0, g: 0, b: 1, a: 1 },
          opacity: 1,
          visible: true
        }
      ]
    })
    const moving = editor.graph.createNode('FRAME', screen.id, {
      x: 60,
      y: 10,
      width: 50,
      height: 50
    })
    editor.graph.createNode('RECTANGLE', moving.id, {
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      fills: [
        {
          type: 'SOLID',
          color: { r: 1, g: 0, b: 0, a: 1 },
          opacity: 1,
          visible: true
        }
      ]
    })
    computeAllLayouts(editor.graph, screen.id)

    const surface = expectDefined(
      ck.MakeSurface(320, 160),
      'transparent absolute frame scene backing surface'
    )
    const renderer = new SkiaRenderer(ck, surface)
    renderer.viewportWidth = 320
    renderer.viewportHeight = 160
    renderer.dpr = 1
    renderer.panX = 0
    renderer.panY = 0
    renderer.zoom = 1
    renderer.pageId = page.id

    try {
      renderer.render(editor.graph, new Set(), {}, 1, 'scene')

      editor.graph.updateNodePositionPreview(moving.id, 170, 10)
      renderer.render(editor.graph, new Set(), { draggingClipBypassAll: true }, 1, 'scene')

      editor.graph.updateNodePositionPreview(moving.id, 60, 10)
      editor.graph.updateNode(moving.id, {
        x: 170,
        y: 10,
        layoutPositioning: 'ABSOLUTE'
      })

      renderer.render(editor.graph, new Set(), {}, 2, 'scene')
      renderer.render(editor.graph, new Set(), {}, 2, 'scene')

      const image = surface.makeImageSnapshot()
      const pixels = image.readPixels(0, 0, {
        width: 320,
        height: 160,
        colorType: ck.ColorType.RGBA_8888,
        alphaType: ck.AlphaType.Unpremul,
        colorSpace: ck.ColorSpace.SRGB
      })
      image.delete()

      const renderedPixels = expectDefined(
        pixels,
        'transparent absolute frame scene backing pixels'
      )
      const pixel = pixelAt(renderedPixels, 320, 215, 55)
      expect(pixel.r).toBeGreaterThan(200)
      expect(pixel.g).toBeLessThan(80)
      expect(pixel.b).toBeLessThan(80)
      expect(pixel.a).toBeGreaterThan(200)
    } finally {
      surface.delete()
    }
  })

  test('scene backing keeps an absolute overlay visible after a preceding masked auto-layout target', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const screen = graph.createNode('FRAME', page.id, {
      x: 20,
      y: 20,
      width: 160,
      height: 100,
      clipsContent: true,
      layoutMode: 'HORIZONTAL',
      itemSpacing: 10,
      paddingLeft: 10,
      paddingRight: 10,
      paddingTop: 10,
      paddingBottom: 10
    })
    graph.createNode('RECTANGLE', screen.id, {
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      isMask: true
    })
    graph.createNode('RECTANGLE', screen.id, {
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      fills: [
        {
          type: 'SOLID',
          color: { r: 0, g: 0, b: 1, a: 1 },
          opacity: 1,
          visible: true
        }
      ]
    })
    const overlay = graph.createNode('FRAME', screen.id, {
      x: 170,
      y: 10,
      width: 50,
      height: 50,
      layoutPositioning: 'ABSOLUTE'
    })
    graph.createNode('RECTANGLE', overlay.id, {
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      fills: [
        {
          type: 'SOLID',
          color: { r: 1, g: 0, b: 0, a: 1 },
          opacity: 1,
          visible: true
        }
      ]
    })

    const surface = expectDefined(ck.MakeSurface(320, 160), 'masked overlay scene backing surface')
    const renderer = new SkiaRenderer(ck, surface)
    renderer.viewportWidth = 320
    renderer.viewportHeight = 160
    renderer.dpr = 1
    renderer.panX = 0
    renderer.panY = 0
    renderer.zoom = 1
    renderer.pageId = page.id

    try {
      renderer.render(graph, new Set(), {}, 1, 'scene')
      const image = surface.makeImageSnapshot()
      const pixels = image.readPixels(0, 0, {
        width: 320,
        height: 160,
        colorType: ck.ColorType.RGBA_8888,
        alphaType: ck.AlphaType.Unpremul,
        colorSpace: ck.ColorSpace.SRGB
      })
      image.delete()

      const renderedPixels = expectDefined(pixels, 'masked overlay scene backing pixels')
      const pixel = pixelAt(renderedPixels, 320, 215, 55)
      expect(pixel.r).toBeGreaterThan(200)
      expect(pixel.g).toBeLessThan(80)
      expect(pixel.b).toBeLessThan(80)
      expect(pixel.a).toBeGreaterThan(200)
    } finally {
      surface.delete()
    }
  })
})
