import { SceneGraph } from '@inkly/core/scene-graph'
import type { NodeType, SceneNode } from '@inkly/core/scene-graph'
import * as Y from 'yjs'

import { yNodeToProps } from '@/app/collab/yjs-sync'

/**
 * server `board_documents.bytes` に保存された yjs update format を SceneGraph に復元する。
 *
 * PR #210 + #220 の経路で、 yjs hub の close 時 snapshot が yjs update format で書き戻される
 * ようになった。 PreviewView のように collab session を張らず GET /document だけで graph を
 * 取り出したい read-only 経路は、 旧 `.fig` binary 前提の `readFigFile` だけだと yjs format を
 * decode できず unavailable になっていた。 本関数は read-only 用の橋渡し。
 *
 * 復元戦略 ...
 *   1. 空の `Y.Doc` を作り `Y.applyUpdate(ydoc, bytes)` を試行。 throw すれば yjs format でない。
 *   2. `ydoc.getMap('nodes')` から `Y.Map<unknown>` を取り、 各 entry を `yNodeToProps` で
 *      props 化、 parent → child の順で SceneGraph に挿入する。
 *   3. 順序は parentId を辿って「root が無い node」を先に弾き、 親 node を作ってから子 node を
 *      作る。
 *
 * 戻り値 ... 復元成功時は `SceneGraph`、 失敗時 (yjs format でない / 構造が壊れている) は null。
 */
export function decodeBoardDocumentBytes(bytes: Uint8Array): SceneGraph | null {
  const ydoc = new Y.Doc()
  try {
    Y.applyUpdate(ydoc, bytes)
  } catch {
    ydoc.destroy()
    return null
  }

  const ynodes = ydoc.getMap<Y.Map<unknown>>('nodes')
  if (ynodes.size === 0) {
    ydoc.destroy()
    return null
  }

  try {
    const graph = buildGraphFromYNodes(ynodes)
    ydoc.destroy()
    return graph
  } catch {
    ydoc.destroy()
    return null
  }
}

function buildGraphFromYNodes(ynodes: Y.Map<Y.Map<unknown>>): SceneGraph | null {
  // node id → props のスナップショットを作って parent 連鎖を topological に並べる。
  const propsById = new Map<string, Record<string, unknown>>()
  for (const [id, ynode] of ynodes.entries()) {
    propsById.set(id, yNodeToProps(ynode))
  }

  // root を探す。 SceneGraph の root は parent が無い node。
  let rootId: string | null = null
  for (const [id, props] of propsById.entries()) {
    const parentId = props.parentId as string | undefined
    if (!parentId) {
      rootId = id
      break
    }
  }
  if (!rootId) return null

  const graph = new SceneGraph()
  // SceneGraph constructor は DOCUMENT root + default Page 1 を自動生成するため
  // ynodes 側の真の構造で置き換える前に nodes Map を完全 reset する。
  graph.nodes.clear()
  const rootProps = propsById.get(rootId)
  if (!rootProps) return null
  const rootNode = createSceneNodeFromProps(rootId, rootProps)
  rootNode.childIds = []
  graph.rootId = rootId
  graph.nodes.set(rootId, rootNode)

  // BFS で子 node を順次追加。 parent が graph に存在しない node は後回しにする。
  const pending = new Set(propsById.keys())
  pending.delete(rootId)
  let progress = true
  while (progress && pending.size > 0) {
    progress = false
    for (const id of pending) {
      const props = propsById.get(id)
      if (!props) {
        pending.delete(id)
        continue
      }
      const parentId = props.parentId as string | undefined
      if (!parentId || !graph.nodes.has(parentId)) continue
      const node = createSceneNodeFromProps(id, props)
      graph.nodes.set(id, node)
      const parentNode = graph.nodes.get(parentId)
      if (parentNode && !parentNode.childIds.includes(id)) {
        parentNode.childIds.push(id)
      }
      pending.delete(id)
      progress = true
    }
  }

  return graph
}

function createSceneNodeFromProps(
  id: string,
  props: Record<string, unknown>
): SceneNode {
  const type = (props.type as NodeType) ?? 'GROUP'
  const childIds = Array.isArray(props.childIds) ? [...(props.childIds as string[])] : []
  const node = {
    ...props,
    id,
    type,
    childIds
  } as SceneNode
  return node
}
