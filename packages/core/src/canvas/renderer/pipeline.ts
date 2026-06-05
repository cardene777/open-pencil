import type { Canvas } from 'canvaskit-wasm'

import { drawPageGuides } from '#core/canvas/page-guides'
import type { RenderOverlays, SkiaRenderer } from '#core/canvas/renderer'
import type { EditorState } from '#core/editor/types'
import type { SceneGraph } from '#core/scene-graph'

import {
  cachedSubtreePicture,
  getSubtreeVisualBounds,
  hasCachedSubtreePictureHit,
  renderSceneBacking,
  updateSceneBackingPreviewState,
  visualBoundsIntersectsViewport
} from './retained-backing'
import { clearSubtreePictureCache } from './state'

export function renderSceneToCanvas(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  pageId: string
): void {
  const prevViewport = r.worldViewport
  r.worldViewport = { x: -1e9, y: -1e9, w: 2e9, h: 2e9 }
  const pageNode = graph.getNode(pageId)
  if (pageNode) {
    for (const childId of pageNode.childIds) {
      r.renderNode(canvas, graph, childId, {})
    }
  }
  r.worldViewport = prevViewport
}

export type RenderLayer = 'full' | 'scene' | 'overlays'

export function renderFromEditorState(
  r: SkiaRenderer,
  state: EditorState,
  graph: SceneGraph,
  textEditor: unknown,
  viewportWidth: number,
  viewportHeight: number,
  showRulers = true,
  dpr = 1,
  layer: RenderLayer = 'full'
): void {
  r.dpr = dpr
  r.panX = state.panX
  r.panY = state.panY
  r.zoom = state.zoom
  r.viewportWidth = viewportWidth
  r.viewportHeight = viewportHeight
  r.showRulers = showRulers
  r.pageColor = state.pageColor
  r.rulerTheme = state.rulerTheme ?? null
  r.pageId = state.currentPageId
  render(
    r,
    graph,
    state.selectedIds,
    {
      hoveredNodeId: state.hoveredNodeId,
      enteredContainerId: state.enteredContainerId,
      editingTextId: state.editingTextId,
      textEditor: textEditor as RenderOverlays['textEditor'],
      marquee: state.marquee,
      snapGuides: state.snapGuides,
      rotationPreview: state.rotationPreview,
      dropTargetId: state.dropTargetId,
      draggingClipBypassAll: state.draggingClipBypassAll,
      layoutInsertIndicator: state.layoutInsertIndicator,
      penState: state.penState
        ? ({
            ...state.penState,
            cursorX: state.penCursorX ?? undefined,
            cursorY: state.penCursorY ?? undefined
          } as RenderOverlays['penState'])
        : null,
      nodeEditState: state.nodeEditState ?? null,
      remoteCursors: state.remoteCursors,
      autoLayoutHover: state.autoLayoutHover
    },
    state.sceneVersion,
    layer
  )
}

function hasVolatileOverlay(overlays: RenderOverlays): boolean {
  return (
    overlays.dropTargetId != null ||
    Boolean(overlays.draggingClipBypassAll) ||
    overlays.rotationPreview != null ||
    overlays.editingTextId != null ||
    overlays.nodeEditState != null
  )
}

function scenePictureMissReason(
  r: SkiaRenderer,
  graph: SceneGraph,
  overlays: RenderOverlays,
  sceneVersion: number,
  hasPositionPreview: boolean
): string {
  if (hasPositionPreview) return 'position-preview'
  if (hasVolatileOverlay(overlays)) return 'volatile-overlay'
  if (r.scenePictureVersion < 0) return 'missing-picture'
  if (graph.positionPreviewVersion !== r.scenePicturePositionPreviewVersion)
    return 'position-preview-version'
  if (sceneVersion !== r.scenePictureVersion) return 'scene-version'
  if (r.pageId !== r.scenePicturePageId) return 'page'
  if ((r.pendingSubtreePictureRecordQueue?.length ?? 0) > 0) return 'record-budget'
  return 'unknown'
}

const now = typeof performance !== 'undefined' ? () => performance.now() : () => 0

function measure<T>(fn: () => T): { value: T; duration: number } {
  const start = now()
  const value = fn()
  return { value, duration: now() - start }
}

type ViewportPageChild = {
  childId: string
  bounds: ReturnType<typeof getSubtreeVisualBounds>
}

function setDragInProgress(r: SkiaRenderer, value: boolean): void {
  if (typeof r.setDragInProgress === 'function') {
    r.setDragInProgress(value, { flushSubtreePictureCacheOnEnd: true })
    return
  }
  const wasDragging = Boolean(r.isDragInProgress)
  r.isDragInProgress = value
  if (!value && wasDragging) clearSubtreePictureCache(r, { flushSurface: true })
}

function updateSubtreePictureCacheLruLimit(r: SkiaRenderer, viewportChildCount: number): number {
  if (typeof r.updateSubtreePictureCacheLruLimit === 'function') {
    return r.updateSubtreePictureCacheLruLimit(viewportChildCount)
  }
  const limit = r.isDragInProgress
    ? Math.max(viewportChildCount + 50, 50)
    : Math.max(Math.ceil(viewportChildCount * 1.5), 500)
  r.subtreePictureCacheLruLimit = limit
  return limit
}

function collectViewportPageChildren(r: SkiaRenderer, graph: SceneGraph): ViewportPageChild[] {
  const pageNode = graph.getNode(r.pageId ?? graph.rootId)
  if (!pageNode) return []

  const children: ViewportPageChild[] = []
  for (const childId of pageNode.childIds) {
    const bounds = getSubtreeVisualBounds(r, graph, childId)
    if (bounds && !visualBoundsIntersectsViewport(bounds, r.worldViewport)) continue
    children.push({ childId, bounds })
  }
  return children
}

function normalizePendingPictureRecordQueue(
  r: SkiaRenderer,
  pageChildren: ViewportPageChild[]
): string[] {
  const visibleIds = new Set(pageChildren.map(({ childId }) => childId))
  const seen = new Set<string>()
  const queue = Array.isArray(r.pendingSubtreePictureRecordQueue)
    ? r.pendingSubtreePictureRecordQueue
    : []
  const normalized = queue.filter((childId) => {
    if (!visibleIds.has(childId) || seen.has(childId)) return false
    seen.add(childId)
    return true
  })
  r.pendingSubtreePictureRecordQueue = normalized
  return normalized
}

export function render(
  r: SkiaRenderer,
  graph: SceneGraph,
  selectedIds: Set<string>,
  overlays: RenderOverlays = {},
  sceneVersion = -1,
  layer: RenderLayer = 'full'
): void {
  const p = r.profiler
  p.beginFrame()
  p.setScenePictureDrawTime(0)
  p.setScenePictureRecordTime(0)
  p.setFlushTime(0)

  graph.clearAbsPosCache()

  const canvas = r.surface.getCanvas()
  if (layer === 'overlays') {
    canvas.clear(r.ck.Color4f(0, 0, 0, 0))
  } else {
    canvas.clear(r.ck.Color4f(r.pageColor.r, r.pageColor.g, r.pageColor.b, 1))
  }

  r.worldViewport = {
    x: -r.panX / r.zoom,
    y: -r.panY / r.zoom,
    w: r.viewportWidth / r.zoom,
    h: r.viewportHeight / r.zoom
  }
  updateSceneBackingPreviewState(r, layer)

  const hasPositionPreview =
    graph.positionPreviewVersion !== r.scenePicturePositionPreviewVersion &&
    sceneVersion === r.scenePictureVersion
  const hasVolatileOverlays = hasPositionPreview || hasVolatileOverlay(overlays)
  setDragInProgress(
    r,
    hasPositionPreview || Boolean(overlays.draggingClipBypassAll) || overlays.rotationPreview != null
  )
  const viewportPageChildren =
    layer === 'overlays' ? [] : collectViewportPageChildren(r, graph)
  if (layer !== 'overlays') {
    updateSubtreePictureCacheLruLimit(r, viewportPageChildren.length)
    normalizePendingPictureRecordQueue(r, viewportPageChildren)
  }

  const cacheMissReason = scenePictureMissReason(
    r,
    graph,
    overlays,
    sceneVersion,
    hasPositionPreview
  )

  if (layer !== 'overlays') {
    canvas.save()
    canvas.scale(r.dpr, r.dpr)

    p.beginPhase('render:scene')
    if (
      layer === 'scene' &&
      !hasVolatileOverlays &&
      renderSceneBacking(r, canvas, graph, sceneVersion)
    ) {
      p.setScenePictureMode('hit', 'backing')
    } else {
      canvas.translate(r.panX, r.panY)
      canvas.scale(r.zoom, r.zoom)
      renderSceneContent(
        r,
        canvas,
        graph,
        overlays,
        sceneVersion,
        cacheMissReason,
        hasVolatileOverlays,
        viewportPageChildren
      )
    }
    p.endPhase('render:scene')

    canvas.restore()
  }

  if (layer !== 'scene') {
    canvas.save()
    canvas.scale(r.dpr, r.dpr)
    r.labelCache.update(graph, r.pageId, sceneVersion, graph.positionPreviewVersion)
    p.beginPhase('render:sectionTitles')
    r.drawSectionTitles(canvas, graph)
    p.endPhase('render:sectionTitles')
    p.beginPhase('render:componentLabels')
    r.drawComponentLabels(canvas, graph)
    p.endPhase('render:componentLabels')
    canvas.restore()

    canvas.save()
    canvas.scale(r.dpr, r.dpr)

    r.drawHoverHighlight(
      canvas,
      graph,
      overlays.hoveredNodeId === overlays.nodeEditState?.nodeId ? null : overlays.hoveredNodeId
    )
    r.drawEnteredContainer(canvas, graph, overlays.enteredContainerId)
    p.beginPhase('render:selection')
    r.drawSelection(canvas, graph, selectedIds, overlays)
    p.endPhase('render:selection')
    r.drawFlashes(canvas, graph)
    drawPageGuides(r, canvas, graph)
    r.drawSnapGuides(canvas, overlays.snapGuides)
    r.drawMarquee(canvas, overlays.marquee)
    r.drawLayoutInsertIndicator(canvas, overlays.layoutInsertIndicator)
    r.drawAutoLayoutHover(canvas, graph, overlays.autoLayoutHover)
    r.drawNodeEditOverlay(canvas, graph, overlays.nodeEditState)
    r.drawPenOverlay(canvas, overlays.penState)
    r.drawRemoteCursors(canvas, graph, overlays.remoteCursors)
    p.beginPhase('render:rulers')
    if (r.showRulers) r.drawRulers(canvas, graph, selectedIds)
    p.endPhase('render:rulers')

    p.drawHUD(canvas, r.showRulers)

    canvas.restore()
  }

  p.beginPhase('render:flush')
  const { duration: flushDuration } = measure(() => r.surface.flush())
  p.setFlushTime(flushDuration)
  p.endPhase('render:flush')

  p.setNodeCounts(r._nodeCount, r._culledCount)
  p.endFrame()
}

function renderSceneContent(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  overlays: RenderOverlays,
  sceneVersion: number,
  cacheMissReason: string,
  hasVolatileOverlays: boolean,
  pageChildren: ViewportPageChild[]
): void {
  const p = r.profiler
  const pageNode = graph.getNode(r.pageId ?? graph.rootId)
  const culledCount = Math.max(0, (pageNode?.childIds.length ?? 0) - pageChildren.length)
  if (hasVolatileOverlays) {
    p.setScenePictureMode('volatile', cacheMissReason)
    r._nodeCount = 0
    r._culledCount = culledCount
    p.beginPhase('render:volatile')
    renderPageChildren(r, canvas, graph, overlays, sceneVersion, pageChildren)
    p.endPhase('render:volatile')
  } else {
    r._nodeCount = 0
    r._culledCount = culledCount
    const allHit = canDrawPageChildrenFromCache(r, graph, sceneVersion, pageChildren)
    const phase = allHit ? 'render:drawPicture' : 'render:recordPicture'
    p.setScenePictureMode(allHit ? 'hit' : 'record', allHit ? '' : cacheMissReason)
    p.beginPhase(phase)
    const { duration } = measure(() =>
      renderPageChildren(r, canvas, graph, overlays, sceneVersion, pageChildren)
    )
    if (allHit) p.setScenePictureDrawTime(duration)
    else p.setScenePictureRecordTime(duration)
    p.endPhase(phase)
    updateStableScenePictureState(r, graph, sceneVersion)
  }
}

function canDrawPageChildrenFromCache(
  r: SkiaRenderer,
  graph: SceneGraph,
  sceneVersion: number,
  pageChildren: ViewportPageChild[]
): boolean {
  return pageChildren.every(({ childId }) =>
    hasCachedSubtreePictureHit(r, graph, childId, sceneVersion)
  )
}

function renderPageChildren(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  overlays: RenderOverlays,
  sceneVersion: number,
  pageChildren: ViewportPageChild[]
): void {
  if (pageChildren.length === 0) {
    r.pendingSubtreePictureRecordQueue = []
    return
  }

  const pendingQueue = normalizePendingPictureRecordQueue(r, pageChildren)
  const pageChildrenById = new Map(pageChildren.map((child) => [child.childId, child]))
  const orderedChildren: ViewportPageChild[] = []
  const seen = new Set<string>()
  for (const childId of pendingQueue) {
    const child = pageChildrenById.get(childId)
    if (!child || seen.has(childId)) continue
    seen.add(childId)
    orderedChildren.push(child)
  }
  for (const child of pageChildren) {
    if (seen.has(child.childId)) continue
    seen.add(child.childId)
    orderedChildren.push(child)
  }

  const nextPendingQueue: string[] = []
  let remainingBudget = r.maxPictureRecordsPerFrame ?? 100
  for (const { childId, bounds } of orderedChildren) {
    if (hasCachedSubtreePictureHit(r, graph, childId, sceneVersion)) {
      const picture = cachedSubtreePicture(r, graph, childId, sceneVersion, bounds)
      if (picture) {
        canvas.drawPicture(picture)
        continue
      }
    }

    if (remainingBudget > 0) {
      const picture = cachedSubtreePicture(r, graph, childId, sceneVersion, bounds)
      if (picture) {
        remainingBudget--
        canvas.drawPicture(picture)
        continue
      }
    }

    nextPendingQueue.push(childId)
    r.renderNode(canvas, graph, childId, overlays)
  }

  r.pendingSubtreePictureRecordQueue = nextPendingQueue
}

function updateStableScenePictureState(
  r: SkiaRenderer,
  graph: SceneGraph,
  sceneVersion: number
): void {
  r.scenePictureVersion = sceneVersion
  r.scenePicturePositionPreviewVersion = graph.positionPreviewVersion
  r.scenePicturePageId = r.pageId
}
