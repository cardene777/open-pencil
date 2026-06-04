import { perfTracer } from '#core/profiler'

import type { SceneNode } from './types'
import { normalizeVectorNetwork } from './vector-network'

type PreviewGraph = {
  nodes: Map<string, SceneNode>
  positionPreviewVersion: number
  subtreeVersion: Map<string, number>
  clearAbsPosCache: () => void
}

const LAYOUT_AFFECTING_KEYS = new Set<string>([
  'x',
  'y',
  'width',
  'height',
  'rotation',
  'parentId',
  'childIds',
  'layoutMode',
  'layoutDirection',
  'layoutWrap',
  'primaryAxisSizing',
  'counterAxisSizing',
  'itemSpacing',
  'counterAxisSpacing',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'layoutGrow',
  'layoutAlignSelf',
  'layoutPositioning',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'visible',
  'text',
  'fontSize',
  'lineHeight',
  'letterSpacing',
  'styleRuns',
  'textAutoResize'
])

const TEXT_PICTURE_KEYS = new Set<string>([
  'text',
  'fontSize',
  'fontFamily',
  'fontWeight',
  'italic',
  'textAlignHorizontal',
  'textDirection',
  'textAlignVertical',
  'lineHeight',
  'letterSpacing',
  'textDecoration',
  'textCase',
  'styleRuns',
  'fills',
  'width',
  'height'
])

function collectAncestorChain(
  graph: PreviewGraph,
  startId: string | null | undefined,
  collected: Set<string>
): void {
  let cursor = startId ?? undefined
  while (cursor) {
    if (collected.has(cursor)) break
    collected.add(cursor)
    cursor = graph.nodes.get(cursor)?.parentId ?? undefined
  }
}

export function updateNodePreview(
  graph: PreviewGraph,
  id: string,
  changes: Partial<SceneNode>
): void {
  perfTracer.measure(
    'graph:updateNodePreview',
    'Custom',
    () => {
      const node = graph.nodes.get(id)
      if (!node) return
      if (
        (Object.keys(changes) as (keyof SceneNode)[]).every((key) => node[key] === changes[key])
      ) {
        return
      }

      const oldParentId = node.parentId
      const newParentId = 'parentId' in changes ? changes.parentId : oldParentId
      const affected = new Set<string>([id])
      collectAncestorChain(graph, oldParentId, affected)
      collectAncestorChain(graph, newParentId, affected)
      for (const nodeId of affected) {
        graph.subtreeVersion.set(nodeId, (graph.subtreeVersion.get(nodeId) ?? 0) + 1)
      }

      const affectsLayout = Object.keys(changes).some((key) => LAYOUT_AFFECTING_KEYS.has(key))
      if (affectsLayout) graph.clearAbsPosCache()
      if (
        node.type === 'TEXT' &&
        node.textPicture &&
        Object.keys(changes).some((key) => TEXT_PICTURE_KEYS.has(key))
      ) {
        node.textPicture = null
      }
      const normalizedChanges = changes.vectorNetwork
        ? { ...changes, vectorNetwork: normalizeVectorNetwork(changes.vectorNetwork) }
        : changes
      graph.positionPreviewVersion++
      Object.assign(node, normalizedChanges)
    },
    { id, keys: Object.keys(changes).length }
  )
}
