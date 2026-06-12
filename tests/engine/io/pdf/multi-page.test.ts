import { describe, expect, test } from 'bun:test'

import { pdfFormat, renderMultiPagePDF } from '@inkly/core/io'
import { SceneGraph } from '@inkly/core/scene-graph'

function createPDFGraph() {
  const graph = new SceneGraph()
  const firstPage = graph.getPages()[0]
  const secondPage = graph.addPage('Page 2')
  const thirdPage = graph.addPage('Page 3')

  const pages = [
    { pageId: firstPage.id, size: { width: 120, height: 80 } },
    { pageId: secondPage.id, size: { width: 80, height: 140 } },
    { pageId: thirdPage.id, size: { width: 200, height: 60 } }
  ].map((page, index) => {
    const frame = graph.createNode('FRAME', page.pageId, {
      name: `Frame ${index + 1}`,
      x: 0,
      y: 0,
      width: page.size.width,
      height: page.size.height,
      fills: [
        {
          type: 'SOLID',
          color: { r: 0.2 * (index + 1), g: 0.2, b: 0.6, a: 1 },
          opacity: 1,
          visible: true
        }
      ]
    })

    return {
      ...page,
      nodeIds: [frame.id]
    }
  })

  return { graph, pages }
}

function decodePDF(data: Uint8Array): string {
  return new TextDecoder('latin1').decode(data)
}

function getPDFPageCount(data: Uint8Array): number | null {
  const match = /\/Type\s*\/Pages\b[\s\S]*?\/Count\s+(\d+)/.exec(decodePDF(data))
  return match ? Number(match[1]) : null
}

function getMediaBoxes(data: Uint8Array): Array<[number, number]> {
  return Array.from(
    decodePDF(data).matchAll(/\/MediaBox \[0 0 ([0-9.]+) ([0-9.]+)\]/g),
    (match) => [Number(match[1]), Number(match[2])] as [number, number]
  )
}

describe('multi-page PDF export', () => {
  test('renders multiple pages into a single PDF', async () => {
    const { graph, pages } = createPDFGraph()

    const data = await renderMultiPagePDF(graph, pages)

    expect(data).toBeInstanceOf(Uint8Array)
    expect(data?.byteLength ?? 0).toBeGreaterThan(0)
    expect(decodePDF(data ?? new Uint8Array())).toStartWith('%PDF-')
  })

  test('preserves the provided page order', async () => {
    const { graph, pages } = createPDFGraph()
    const orderedPages = [pages[2], pages[0], pages[1]]

    const data = await renderMultiPagePDF(graph, orderedPages)
    if (!data) throw new Error('Expected PDF data')

    expect(getPDFPageCount(data)).toBe(3)
    expect(getMediaBoxes(data).slice(0, 3)).toEqual([
      [200, 60],
      [120, 80],
      [80, 140]
    ])
  })

  test("exports every board page when scope is 'document'", async () => {
    const { graph } = createPDFGraph()
    const exportContent = pdfFormat.exportContent
    if (!exportContent) throw new Error('Expected PDF export adapter')

    const result = await exportContent({ graph, target: { scope: 'document' } })
    const data = result.data
    if (!(data instanceof Uint8Array)) throw new Error('Expected binary PDF data')

    expect(getPDFPageCount(data)).toBe(3)
    expect(getMediaBoxes(data).slice(0, 3)).toEqual([
      [120, 80],
      [80, 140],
      [200, 60]
    ])
  })

  test('keeps page scope export single-page', async () => {
    const { graph, pages } = createPDFGraph()
    const exportContent = pdfFormat.exportContent
    if (!exportContent) throw new Error('Expected PDF export adapter')

    const result = await exportContent({
      graph,
      target: { scope: 'page', pageId: pages[1].pageId }
    })
    const data = result.data
    if (!(data instanceof Uint8Array)) throw new Error('Expected binary PDF data')

    expect(getPDFPageCount(data)).toBe(1)
    expect(getMediaBoxes(data).slice(0, 1)).toEqual([[80, 140]])
  })
})
