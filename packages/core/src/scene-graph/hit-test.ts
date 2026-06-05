import { getWorldMatrix } from '#core/canvas/coordinate'
import Matrix from '#core/canvas/matrix'
import type { Vector } from '#core/types'

import type { SceneGraph, SceneNode, NodeType } from './'

const CONTAINER_TYPES = new Set<NodeType>([
  'CANVAS',
  'FRAME',
  'GROUP',
  'SECTION',
  'COMPONENT',
  'COMPONENT_SET',
  'INSTANCE'
])
const OPAQUE_CONTAINER_TYPES = new Set<NodeType>(['COMPONENT', 'INSTANCE'])

function hasVisibleFillOrStroke(node: SceneNode): boolean {
  return node.fills.some((f) => f.visible) || node.strokes.some((s) => s.visible)
}

function isAxisAligned(node: SceneNode): boolean {
  return !node.rotation || node.rotation === 0
}

function aabbRejects(
  px: number,
  py: number,
  abs: Vector,
  node: SceneNode
): boolean {
  return (
    px < abs.x ||
    px > abs.x + node.width ||
    py < abs.y ||
    py > abs.y + node.height
  )
}

function containsPoint(px: number, py: number, node: SceneNode, graph: SceneGraph): boolean {
  if (isAxisAligned(node)) {
    const abs = graph.getAbsolutePosition(node.id)
    return !aabbRejects(px, py, abs, node)
  }

  const m = getWorldMatrix(node, graph)

  const inv = Matrix.invert(m)
  if (!inv) return false

  const [localX, localY] = Matrix.mapPoints(inv, [px, py])
  return localX >= 0 && localX <= node.width && localY >= 0 && localY <= node.height
}

function hitTestChildren(
  graph: SceneGraph,
  px: number,
  py: number,
  parentId: string,
  deep = false,
  candidateIds: ReadonlySet<string> | null = null
): SceneNode | null {
  const parent = graph.nodes.get(parentId)
  if (!parent) return null

  if (parent.clipsContent) {
    if (!containsPoint(px, py, parent, graph)) return null
  }

  for (let i = parent.childIds.length - 1; i >= 0; i--) {
    const childId = parent.childIds[i]
    if (candidateIds && !candidateIds.has(childId)) continue
    const child = graph.nodes.get(childId)
    if (!child || !child.visible) continue
    if (CONTAINER_TYPES.has(child.type)) {
      if (OPAQUE_CONTAINER_TYPES.has(child.type) && !deep) {
        const hit = hitTestOpaqueContainerWithCandidates(
          graph,
          px,
          py,
          child,
          childId,
          deep,
          candidateIds
        )
        if (hit) return hit
        continue
      }

      const hit = hitTestTransparentContainerWithCandidates(
        graph,
        px,
        py,
        child,
        childId,
        deep,
        candidateIds
      )
      if (hit) return hit
      continue
    }

    if (containsPoint(px, py, child, graph)) return child
  }

  return null
}

function hitTestOpaqueContainerWithCandidates(
  graph: SceneGraph,
  px: number,
  py: number,
  child: SceneNode,
  childId: string,
  deep: boolean,
  candidateIds: ReadonlySet<string> | null
): SceneNode | null {
  if (!containsPoint(px, py, child, graph)) return null
  const childHit = hitTestChildren(graph, px, py, childId, deep, candidateIds)
  if (childHit) return child
  if (hasVisibleFillOrStroke(child)) return child
  return null
}

function hitTestTransparentContainerWithCandidates(
  graph: SceneGraph,
  px: number,
  py: number,
  child: SceneNode,
  childId: string,
  deep: boolean,
  candidateIds: ReadonlySet<string> | null
): SceneNode | null {
  if (child.type === 'GROUP') {
    if (!containsPoint(px, py, child, graph)) return null

    if (deep) return hitTestChildren(graph, px, py, childId, deep, candidateIds) ?? child

    return child
  }

  const childHit = hitTestChildren(graph, px, py, childId, deep, candidateIds)
  if (childHit) {
    if (child.locked) return child
    return childHit
  }

  if (containsPoint(px, py, child, graph) && hasVisibleFillOrStroke(child)) return child
  return null
}

export function hitTest(
  graph: SceneGraph,
  px: number,
  py: number,
  scopeId?: string
): SceneNode | null {
  const scope = scopeId ?? graph.rootId
  const candidateIds = graph.getHitTestCandidateIds(px, py, scope)
  return hitTestChildren(graph, px, py, scope, false, candidateIds)
}

export function hitTestDeep(
  graph: SceneGraph,
  px: number,
  py: number,
  scopeId?: string
): SceneNode | null {
  const scope = scopeId ?? graph.rootId
  const candidateIds = graph.getHitTestCandidateIds(px, py, scope)
  return hitTestChildren(graph, px, py, scope, true, candidateIds)
}

function hitTestFrameChildren(
  graph: SceneGraph,
  px: number,
  py: number,
  parentId: string,
  offsetX: number,
  offsetY: number,
  excludeIds: Set<string>,
  candidateIds: ReadonlySet<string> | null = null
): SceneNode | null {
  const parent = graph.nodes.get(parentId)
  if (!parent) return null

  let best: SceneNode | null = null

  for (const childId of parent.childIds) {
    if (excludeIds.has(childId)) continue
    if (candidateIds && !candidateIds.has(childId)) continue
    const child = graph.nodes.get(childId)
    if (!child || !child.visible) continue

    const ax = offsetX + child.x
    const ay = offsetY + child.y

    if (!CONTAINER_TYPES.has(child.type)) continue
    if (px < ax || px > ax + child.width || py < ay || py > ay + child.height) continue

    best = child

    const deeper = hitTestFrameChildren(graph, px, py, childId, ax, ay, excludeIds, candidateIds)
    if (deeper) best = deeper
  }

  return best
}

export function hitTestFrame(
  graph: SceneGraph,
  px: number,
  py: number,
  excludeIds: Set<string>,
  scopeId?: string
): SceneNode | null {
  const scope = scopeId ?? graph.rootId
  const candidateIds = graph.getHitTestCandidateIds(px, py, scope)
  return hitTestFrameChildren(graph, px, py, scope, 0, 0, excludeIds, candidateIds)
}
