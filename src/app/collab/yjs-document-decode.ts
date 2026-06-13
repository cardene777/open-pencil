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
 *      props 化し、 parentId → childIds の adjacency map を 1 pass で構築する。
 *   3. root (parentId 無し) から DFS で順次 SceneGraph に挿入することで O(N) で復元する。
 *   4. `ydoc.getMap('images')` (yjs-sync.ts SSOT) からも image bytes を `graph.images` に
 *      copy する。 live collab path と同じ仕様。
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

  const yimages = ydoc.getMap<Uint8Array>('images')

  try {
    const graph = buildGraphFromYNodes(ynodes, yimages)
    ydoc.destroy()
    return graph
  } catch {
    ydoc.destroy()
    return null
  }
}

function buildGraphFromYNodes(
  ynodes: Y.Map<Y.Map<unknown>>,
  yimages: Y.Map<Uint8Array>
): SceneGraph | null {
  // node id → props のスナップショットを作って adjacency を 1 pass で構築する。
  const propsById = new Map<string, Record<string, unknown>>()
  const childrenByParent = new Map<string, string[]>()
  let rootId: string | null = null

  for (const [id, ynode] of ynodes.entries()) {
    const props = yNodeToProps(ynode)
    propsById.set(id, props)
    const parentId = props.parentId as string | undefined
    if (parentId) {
      const siblings = childrenByParent.get(parentId)
      if (siblings) {
        siblings.push(id)
      } else {
        childrenByParent.set(parentId, [id])
      }
    } else if (!rootId) {
      // 複数 root が来ても先勝ちで 1 つだけ採用する (壊れた snapshot 防御)。
      rootId = id
    }
  }

  if (!rootId) return null
  const rootProps = propsById.get(rootId)
  if (!rootProps) return null

  const graph = new SceneGraph()
  // SceneGraph constructor は DOCUMENT root + default Page 1 を自動生成するため
  // ynodes 側の真の構造で置き換える前に nodes Map を完全 reset する。
  graph.nodes.clear()
  graph.rootId = rootId

  // root → 子 → 孫 を DFS で挿入。 childIds は adjacency map から直接 set する
  // (Array.includes の O(N) 検査を廃止)。
  const stack: string[] = [rootId]
  while (stack.length > 0) {
    const id = stack.pop()
    if (id === undefined) break
    if (graph.nodes.has(id)) continue
    const props = propsById.get(id)
    if (!props) continue
    const node = createSceneNodeFromProps(id, props)
    const adjacencyChildren = childrenByParent.get(id) ?? []
    node.childIds = [...adjacencyChildren]
    graph.nodes.set(id, node)
    for (const childId of adjacencyChildren) {
      stack.push(childId)
    }
  }

  // 孤立 node (root から到達不能) は drop する。
  // server snapshot が壊れていない限り発生しないが、 防御的に弾く。

  // yjs-sync.ts と同じ仕様で images map を SceneGraph 側に copy する
  // (PR #210/#220 経路で live collab と同じ image 状態にする)。
  for (const [hash, data] of yimages.entries()) {
    graph.images.set(hash, new Uint8Array(data))
  }

  return graph
}

function createSceneNodeFromProps(
  id: string,
  props: Record<string, unknown>
): SceneNode {
  const type = (props.type as NodeType) ?? 'GROUP'
  const childIds = Array.isArray(props.childIds) ? [...(props.childIds as string[])] : []
  // visible は own boolean 値のみ採用、 それ以外は default true で fallback。
  // yNodeToProps が null-prototype object を返すので prototype chain 経由の
  // 値混入は遮断済だが、 非 boolean / 欠落値も明示的に弾く (PR #229 review MINOR
  // ... 細工 snapshot 経由の visible fallback bypass 防止)。
  const visible =
    Object.hasOwn(props, 'visible') && typeof props.visible === 'boolean'
      ? (props.visible as boolean)
      : true
  const node = {
    ...props,
    id,
    type,
    childIds,
    visible
  } as SceneNode
  return node
}
