import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { FigmaAPI, SceneGraph } from '@inkly/core'

import { applyPhoto } from '#core/tools/stock-photo/apply'
import type {
  StockPhotoProvider,
  StockPhotoResult
} from '#core/tools/stock-photo/providers'

function buildResult(overrides: Partial<StockPhotoResult> = {}): StockPhotoResult {
  return {
    url: 'https://photos.example.com/p1.jpg',
    width: 800,
    height: 600,
    photographer: 'Tester',
    sourceId: 'src-1',
    ...overrides
  }
}

function mockProvider(
  search: StockPhotoProvider['search'],
  name = 'mock'
): StockPhotoProvider {
  return { name, search }
}

interface FetchPlan {
  ok: boolean
  status?: number
  arrayBuffer?: ArrayBuffer
  throwMsg?: string
}

function installFetchMock(plan: FetchPlan): { calls: string[] } {
  const calls: string[] = []
  globalThis.fetch = ((input: RequestInfo | URL) => {
    calls.push(input.toString())
    if (plan.throwMsg !== undefined) {
      return Promise.reject(new Error(plan.throwMsg))
    }
    return Promise.resolve({
      ok: plan.ok,
      status: plan.status ?? (plan.ok ? 200 : 404),
      arrayBuffer: () => Promise.resolve(plan.arrayBuffer ?? new ArrayBuffer(0))
    } as Response)
  }) as typeof fetch
  return { calls }
}

describe('applyPhoto', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  test('returns Not found error when node id does not exist', async () => {
    const figma = new FigmaAPI(new SceneGraph())
    const provider = mockProvider(() => Promise.resolve([buildResult()]))

    const result = await applyPhoto(figma, provider, { id: 'missing', query: 'cat' })

    expect(result).toEqual({ id: 'missing', error: 'Not found' })
  })

  test('returns has-children error when target node has children', async () => {
    const figma = new FigmaAPI(new SceneGraph())
    const frame = figma.createFrame()
    frame.name = 'Container'
    const child = figma.createRectangle()
    frame.appendChild(child)
    const provider = mockProvider(() => Promise.resolve([buildResult()]))

    const result = await applyPhoto(figma, provider, { id: frame.id, query: 'cat' })

    expect(result.error).toBe('"Container" has children — use a leaf shape')
    expect(result.id).toBe(frame.id)
  })

  test('returns provider error message when search throws', async () => {
    const figma = new FigmaAPI(new SceneGraph())
    const rect = figma.createRectangle()
    const provider = mockProvider(() => Promise.reject(new Error('429 Too Many Requests')))

    const result = await applyPhoto(figma, provider, { id: rect.id, query: 'cat' })

    expect(result).toEqual({ id: rect.id, error: '429 Too Many Requests' })
  })

  test('returns no-photos error when provider returns empty result list', async () => {
    const figma = new FigmaAPI(new SceneGraph())
    const rect = figma.createRectangle()
    const provider = mockProvider(() => Promise.resolve([]))

    const result = await applyPhoto(figma, provider, { id: rect.id, query: 'dog' })

    expect(result).toEqual({ id: rect.id, error: 'No photos for "dog"' })
  })

  test('returns download status error when fetch returns non-ok response', async () => {
    const figma = new FigmaAPI(new SceneGraph())
    const rect = figma.createRectangle()
    const provider = mockProvider(() => Promise.resolve([buildResult()]))
    installFetchMock({ ok: false, status: 503 })

    const result = await applyPhoto(figma, provider, { id: rect.id, query: 'cat' })

    expect(result).toEqual({ id: rect.id, error: 'Download 503' })
  })

  test('returns download error message when fetch throws', async () => {
    const figma = new FigmaAPI(new SceneGraph())
    const rect = figma.createRectangle()
    const provider = mockProvider(() => Promise.resolve([buildResult()]))
    installFetchMock({ ok: false, throwMsg: 'ECONNRESET' })

    const result = await applyPhoto(figma, provider, { id: rect.id, query: 'cat' })

    expect(result).toEqual({ id: rect.id, error: 'Download: ECONNRESET' })
  })

  test('on success sets IMAGE fill and returns photo metadata', async () => {
    const figma = new FigmaAPI(new SceneGraph())
    const rect = figma.createRectangle()
    rect.resize(120, 80)
    const provider = mockProvider(() =>
      Promise.resolve([buildResult({ url: 'https://photos.example.com/p1.jpg' })])
    )
    const fetchMock = installFetchMock({ ok: true, arrayBuffer: new ArrayBuffer(16) })

    const result = await applyPhoto(figma, provider, { id: rect.id, query: 'sunset' })

    expect(result.error).toBeUndefined()
    expect(result.id).toBe(rect.id)
    expect(result.photo).toEqual({
      sourceId: 'src-1',
      photographer: 'Tester',
      width: 800,
      height: 600,
      provider: 'mock'
    })
    expect(rect.fills.length).toBe(1)
    expect(rect.fills[0].type).toBe('IMAGE')
    expect(fetchMock.calls).toEqual(['https://photos.example.com/p1.jpg'])
  })

  test('orientation and perPage are derived from request index', async () => {
    const figma = new FigmaAPI(new SceneGraph())
    const rect = figma.createRectangle()
    rect.resize(200, 100)
    let observed: { perPage: number; orientation: string; targetDim: number } | null = null
    const provider = mockProvider((_q, opts) => {
      observed = { perPage: opts.perPage, orientation: opts.orientation, targetDim: opts.targetDim }
      return Promise.resolve([buildResult()])
    })
    installFetchMock({ ok: true, arrayBuffer: new ArrayBuffer(8) })

    await applyPhoto(figma, provider, {
      id: rect.id,
      query: 'q',
      index: 2,
      orientation: 'portrait'
    })

    expect(observed).toEqual({ perPage: 5, orientation: 'portrait', targetDim: 200 })
  })

  test('uses the result at clamped req.index when results are shorter than expected', async () => {
    const figma = new FigmaAPI(new SceneGraph())
    const rect = figma.createRectangle()
    const provider = mockProvider(() =>
      Promise.resolve([
        buildResult({ sourceId: 'first', url: 'https://photos.example.com/0.jpg' }),
        buildResult({ sourceId: 'second', url: 'https://photos.example.com/1.jpg' })
      ])
    )
    installFetchMock({ ok: true, arrayBuffer: new ArrayBuffer(8) })

    const result = await applyPhoto(figma, provider, {
      id: rect.id,
      query: 'q',
      index: 5
    })

    expect(result.photo?.sourceId).toBe('second')
  })
})
