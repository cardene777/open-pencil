import type { jsPDF } from 'jspdf'

import { computeContentBounds } from '#core/io/formats/raster'
import { renderNodesToSVG } from '#core/io/formats/svg'
import type { SceneGraph, SceneNode } from '#core/scene-graph'
import type { Vector } from '#core/types'

export interface PDFExportOptions {
  title?: string
}

export interface PDFMultiPageInput {
  pageId: string
  nodeIds: string[]
}

interface PreparedPDFPage {
  bounds: {
    minX: number
    minY: number
  }
  height: number
  nodeIds: string[]
  orientation: 'landscape' | 'portrait'
  pageId: string
  svg: string
  width: number
}

function preparePDFPage(
  graph: SceneGraph,
  pageId: string,
  nodeIds: string[]
): PreparedPDFPage | null {
  const svg = renderNodesToSVG(graph, pageId, nodeIds, { xmlDeclaration: false })
  if (!svg) return null

  const bounds = computeContentBounds(graph, nodeIds)
  if (!bounds) return null

  const width = bounds.maxX - bounds.minX
  const height = bounds.maxY - bounds.minY
  if (width <= 0 || height <= 0) return null

  return {
    bounds: {
      minX: bounds.minX,
      minY: bounds.minY
    },
    height,
    nodeIds,
    orientation: width > height ? 'landscape' : 'portrait',
    pageId,
    svg,
    width
  }
}

function applySolidFill(doc: jsPDF, node: SceneNode): boolean {
  const fill = node.fills.find((item) => item.visible && item.type === 'SOLID')
  if (!fill) return false
  doc.setFillColor(fill.color.r * 255, fill.color.g * 255, fill.color.b * 255)
  return true
}

function applySolidStroke(doc: jsPDF, node: SceneNode): boolean {
  const stroke = node.strokes.find((item) => item.visible)
  if (!stroke) return false
  doc.setDrawColor(stroke.color.r * 255, stroke.color.g * 255, stroke.color.b * 255)
  doc.setLineWidth(stroke.weight)
  return true
}

function shapePaintMode(hasFill: boolean, hasStroke: boolean): 'F' | 'FD' | 'S' | null {
  if (hasFill && hasStroke) return 'FD'
  if (hasFill) return 'F'
  if (hasStroke) return 'S'
  return null
}

function drawNodeFallback(doc: jsPDF, graph: SceneGraph, nodeId: string, offset: Vector): void {
  const node = graph.getNode(nodeId)
  if (!node?.visible) return

  const absolutePosition = graph.getAbsolutePosition(nodeId)
  const x = absolutePosition.x - offset.x
  const y = absolutePosition.y - offset.y
  const hasFill = applySolidFill(doc, node)
  const hasStroke = applySolidStroke(doc, node)
  const paintMode = shapePaintMode(hasFill, hasStroke)

  switch (node.type) {
    case 'TEXT': {
      const textFill = hasFill || applySolidFill(doc, node)
      if (textFill) {
        const fill = node.fills.find((item) => item.visible && item.type === 'SOLID')
        if (fill) {
          doc.setTextColor(fill.color.r * 255, fill.color.g * 255, fill.color.b * 255)
        }
      }
      doc.setFontSize(node.fontSize || 14)
      doc.text(node.text, x, y + (node.fontSize || 14))
      break
    }
    case 'ELLIPSE':
      if (paintMode) {
        doc.ellipse(
          x + node.width / 2,
          y + node.height / 2,
          node.width / 2,
          node.height / 2,
          paintMode
        )
      }
      break
    case 'LINE':
      doc.line(x, y, x + node.width, y + node.height)
      break
    default:
      if (paintMode) {
        doc.rect(x, y, node.width, node.height, paintMode)
      }
      break
  }

  for (const childId of node.childIds) {
    drawNodeFallback(doc, graph, childId, offset)
  }
}

function drawPageFallback(doc: jsPDF, graph: SceneGraph, page: PreparedPDFPage): void {
  const offset = { x: page.bounds.minX, y: page.bounds.minY }
  for (const nodeId of page.nodeIds) {
    drawNodeFallback(doc, graph, nodeId, offset)
  }
}

function parseSVG(svg: string): Element | null {
  if (typeof DOMParser === 'undefined') return null
  const parser = new DOMParser()
  const svgDoc = parser.parseFromString(svg, 'image/svg+xml')
  const parseError = svgDoc.querySelector('parsererror')
  return parseError ? null : svgDoc.documentElement
}

export async function renderMultiPagePDF(
  graph: SceneGraph,
  pages: PDFMultiPageInput[],
  options: PDFExportOptions = {}
): Promise<Uint8Array | null> {
  const preparedPages = pages.map(({ pageId, nodeIds }) => preparePDFPage(graph, pageId, nodeIds))
  if (preparedPages.some((page) => !page)) return null

  const validPages = preparedPages.filter((page): page is PreparedPDFPage => !!page)
  const firstPage = validPages[0]

  const { jsPDF } = await import('jspdf')
  const useSVGRenderer = typeof DOMParser !== 'undefined'
  const svg2pdfModule = useSVGRenderer ? await import('svg2pdf.js') : null

  const doc = new jsPDF({
    orientation: firstPage.orientation,
    unit: 'pt',
    format: [firstPage.width, firstPage.height],
    compress: true
  })

  if (options.title) {
    doc.setProperties({ title: options.title })
  }

  for (const [index, page] of validPages.entries()) {
    if (index > 0) {
      doc.addPage([page.width, page.height], page.orientation)
    }
    if (svg2pdfModule) {
      const svgElement = parseSVG(page.svg)
      if (!svgElement) return null
      await svg2pdfModule.svg2pdf(svgElement, doc, {
        x: 0,
        y: 0,
        width: page.width,
        height: page.height
      })
      continue
    }
    drawPageFallback(doc, graph, page)
  }

  const buffer = doc.output('arraybuffer')
  return new Uint8Array(buffer)
}

export async function renderNodesToPDF(
  graph: SceneGraph,
  pageId: string,
  nodeIds: string[],
  options: PDFExportOptions = {}
): Promise<Uint8Array | null> {
  return renderMultiPagePDF(graph, [{ pageId, nodeIds }], options)
}
