import type { SceneGraph, SceneNode } from '@inkly/core/scene-graph'

type FrameNode = SceneNode & { type: 'FRAME' }

export interface PrototypeFrameOption {
  id: string
  name: string
  pageId: string
  depth: number
  parentFrameId: string | null
}

export function isFrameNode(node: SceneNode | null | undefined): node is FrameNode {
  return node?.type === 'FRAME'
}

export function findPageId(graph: SceneGraph, nodeId: string): string | null {
  let current = graph.getNode(nodeId)
  while (current) {
    if (current.type === 'CANVAS') return current.id
    current = current.parentId ? graph.getNode(current.parentId) : undefined
  }
  return null
}

function collectFrameChildren(
  graph: SceneGraph,
  nodeId: string,
  pageId: string,
  depth: number,
  parentFrameId: string | null,
  frames: PrototypeFrameOption[]
) {
  for (const child of graph.getChildren(nodeId)) {
    const nextParentFrameId = isFrameNode(child) ? child.id : parentFrameId
    if (isFrameNode(child)) {
      frames.push({
        id: child.id,
        name: child.name,
        pageId,
        depth,
        parentFrameId
      })
      collectFrameChildren(graph, child.id, pageId, depth + 1, child.id, frames)
      continue
    }
    collectFrameChildren(graph, child.id, pageId, depth, nextParentFrameId, frames)
  }
}

export function listFramesByPage(graph: SceneGraph, pageId: string): PrototypeFrameOption[] {
  const page = graph.getNode(pageId)
  if (!page || page.type !== 'CANVAS') return []
  const frames: PrototypeFrameOption[] = []
  collectFrameChildren(graph, page.id, page.id, 0, null, frames)
  return frames
}

export function listFrames(graph: SceneGraph): PrototypeFrameOption[] {
  return graph.getPages().flatMap((page) => listFramesByPage(graph, page.id))
}

export function resolvePrototypeStartFrameId(
  graph: SceneGraph,
  preferredFrameId?: string | null
): string | null {
  if (preferredFrameId) {
    const preferred = graph.getNode(preferredFrameId)
    if (isFrameNode(preferred)) return preferred.id
  }

  return listFrames(graph)[0]?.id ?? null
}
