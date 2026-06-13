import { describe, expect, test } from 'bun:test'

import { unzipSync } from 'fflate'

import { siteFormat } from '@inkly/core/io/formats'
import { SceneGraph } from '@inkly/core/scene-graph'

function makeGraph() {
  const graph = new SceneGraph()
  const pageId = graph.getPages()[0]?.id ?? graph.rootId
  const frameA = graph.createNode('FRAME', pageId, {
    name: 'Home',
    width: 320,
    height: 240,
    reactions: [
      {
        trigger: 'onClick',
        action: 'navigate',
        targetFrameId: 'pending-target',
        transition: 'instant',
        transitionDurationMs: 250
      }
    ]
  })
  const frameB = graph.createNode('FRAME', pageId, {
    name: 'Pricing',
    x: 360,
    width: 320,
    height: 240
  })
  const frameC = graph.createNode('FRAME', pageId, {
    name: 'Contact',
    x: 720,
    width: 320,
    height: 240
  })

  graph.updateNode(frameA.id, {
    reactions: [
      {
        trigger: 'onClick',
        action: 'navigate',
        targetFrameId: frameB.id,
        transition: 'instant',
        transitionDurationMs: 250
      }
    ]
  })

  return { graph, frameA, frameB, frameC }
}

async function exportedEntries(graph: SceneGraph, startFrameId?: string | null) {
  const result = await siteFormat.exportContent?.(
    { graph, target: { scope: 'document' } },
    { startFrameId }
  )
  if (!result || typeof result.data === 'string') {
    throw new Error('Expected zipped site export data')
  }
  return unzipSync(result.data)
}

describe('site export', () => {
  test('exports one HTML file per frame', async () => {
    const { graph } = makeGraph()
    const entries = await exportedEntries(graph)
    const framePages = Object.keys(entries).filter((key) => key.startsWith('frames/frame-'))
    expect(framePages).toHaveLength(3)
  })

  test('index.html refreshes to the configured start frame', async () => {
    const { graph, frameC } = makeGraph()
    const entries = await exportedEntries(graph, frameC.id)
    const indexHtml = new TextDecoder().decode(entries['index.html'])
    expect(indexHtml).toContain(`url=frames/frame-${frameC.id}.html`)
  })

  test('navigate reactions become frame links', async () => {
    const { graph, frameA, frameB } = makeGraph()
    const entries = await exportedEntries(graph)
    const frameHtml = new TextDecoder().decode(entries[`frames/frame-${frameA.id}.html`])
    expect(frameHtml).toContain(`href="frames/frame-${frameB.id}.html"`)
  })

  test('sitemap.xml lists every frame page', async () => {
    const { graph, frameA, frameB, frameC } = makeGraph()
    const entries = await exportedEntries(graph)
    const sitemap = new TextDecoder().decode(entries['sitemap.xml'])
    expect(sitemap).toContain(`frames/frame-${frameA.id}.html`)
    expect(sitemap).toContain(`frames/frame-${frameB.id}.html`)
    expect(sitemap).toContain(`frames/frame-${frameC.id}.html`)
  })
})
