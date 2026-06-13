import * as Y from 'yjs'

import { perfTracer } from '@inkly/core/profiler'
import type { SceneNode } from '@inkly/core/scene-graph'

import type { EditorStore } from '@/app/editor/active-store'
import { YJS_JSON_FIELDS } from '@/constants'

type YNodes = Y.Map<Y.Map<unknown>>
type YImages = Y.Map<Uint8Array>

type GraphBindingOptions = {
  store: EditorStore
  getYdoc: () => Y.Doc | null
  getYnodes: () => YNodes | null
  getSuppressGraphSync: () => boolean
  setSuppressYjsEvents: (value: boolean) => void
  syncNodeToYjs: (nodeId: string, changedKeys?: Iterable<string>) => void
}

type YjsObserverOptions = {
  store: EditorStore
  ynodes: Y.Map<Y.Map<unknown>>
  yimages: Y.Map<Uint8Array>
  getSuppressYjsEvents: () => boolean
  setSuppressGraphSync: (value: boolean) => void
  applyYjsToGraph: (events: Y.YEvent<Y.Map<unknown>>[]) => void
}

type YjsGraphSyncOptions = {
  getStore: () => EditorStore
  getYdoc: () => Y.Doc | null
  getYnodes: () => YNodes | null
  getYimages: () => YImages | null
  setSuppressYjsEvents: (value: boolean) => void
}

function setValueOnYMap(
  ynode: Y.Map<unknown>,
  key: string,
  value: unknown
): void {
  if (value instanceof Uint8Array) {
    const prev = ynode.get(key)
    if (prev instanceof Uint8Array && prev.byteLength === value.byteLength) {
      let same = true
      for (let i = 0; i < value.byteLength; i++) {
        if (prev[i] !== value[i]) {
          same = false
          break
        }
      }
      if (same) return
    }
    ynode.set(key, value.slice())
    return
  }

  if (typeof value === 'object' && value !== null) {
    const encoded = JSON.stringify(value)
    if (ynode.get(key) === encoded) return
    ynode.set(key, encoded)
    return
  }
  if (ynode.get(key) === value) return
  ynode.set(key, value)
}

export function syncNodePropsToYMap(
  node: SceneNode,
  ynode: Y.Map<unknown>,
  changedKeys?: Iterable<string>
) {
  if (changedKeys === undefined) {
    for (const [key, value] of Object.entries(node)) {
      setValueOnYMap(ynode, key, value)
    }
    return
  }

  for (const key of changedKeys) {
    const value = Reflect.get(node, key)
    if (value === undefined) continue
    setValueOnYMap(ynode, key, value)
  }
}

// untrusted yjs payload に __proto__ / constructor / prototype key が含まれていても
// props object の prototype を書き換えないようにする (PR #229 review MINOR: proto
// pollution 経由で visible fallback が回避される問題)。
const PROTO_POLLUTION_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

export function yNodeToProps(ynode: Y.Map<unknown>): Record<string, unknown> {
  // Object.create(null) で prototype chain を切る。 props 経由で読む側は own field
  // しか見えないので、 default 値 fallback が確実に効く。
  // oxlint-disable-next-line inkly/no-broad-unknown-type-assertions -- yjs 由来の untrusted dictionary は domain type を持たない
  const props = Object.create(null) as Record<string, unknown>

  for (const [key, value] of ynode.entries()) {
    if (PROTO_POLLUTION_KEYS.has(key)) continue

    const shouldParseString =
      typeof value === 'string' &&
      (YJS_JSON_FIELDS.has(key) || value.startsWith('{') || value.startsWith('['))

    if (shouldParseString) {
      try {
        props[key] = JSON.parse(value)
      } catch {
        props[key] = value
      }
    } else {
      props[key] = value && typeof value === 'object' ? structuredClone(value) : value
    }
  }

  return props
}

export function bindCollabGraphEvents({
  store,
  getYdoc,
  getYnodes,
  getSuppressGraphSync,
  setSuppressYjsEvents,
  syncNodeToYjs
}: GraphBindingOptions) {
  function onGraphMutation(nodeId: string, changedKeys?: Iterable<string>) {
    if (!getSuppressGraphSync() && getYdoc() && getYnodes()) {
      syncNodeToYjs(nodeId, changedKeys)
    }
  }

  const unbinds = [
    store.onEditorEvent('node:updated', (id, changes) => onGraphMutation(id, Object.keys(changes))),
    store.onEditorEvent('node:created', (node) => onGraphMutation(node.id)),
    store.onEditorEvent('node:reparented', (nodeId) => onGraphMutation(nodeId)),
    store.onEditorEvent('node:reordered', (nodeId) => onGraphMutation(nodeId)),
    store.onEditorEvent('node:deleted', (id) => {
      const ydoc = getYdoc()
      const ynodes = getYnodes()
      if (!getSuppressGraphSync() && ydoc && ynodes) {
        setSuppressYjsEvents(true)
        ydoc.transact(() => {
          ynodes.delete(id)
        })
        setSuppressYjsEvents(false)
      }
    })
  ]
  return () => {
    for (const unbind of unbinds) unbind()
  }
}

export function registerYjsObservers({
  store,
  ynodes,
  yimages,
  getSuppressYjsEvents,
  setSuppressGraphSync,
  applyYjsToGraph
}: YjsObserverOptions) {
  ynodes.observeDeep((events) => {
    if (getSuppressYjsEvents()) return
    perfTracer.measure(
      'yjs:applyRemote',
      'Collab',
      () => {
        setSuppressGraphSync(true)
        try {
          applyYjsToGraph(events)
        } finally {
          setSuppressGraphSync(false)
        }
        store.requestRender()
      },
      { eventCount: events.length }
    )
  })

  yimages.observe((event) => {
    if (getSuppressYjsEvents()) return
    perfTracer.measure(
      'yjs:applyImages',
      'Collab',
      () => {
        for (const [key, change] of event.changes.keys) {
          if (change.action === 'add' || change.action === 'update') {
            const data = yimages.get(key)
            if (data) store.graph.images.set(key, new Uint8Array(data))
          } else {
            store.graph.images.delete(key)
          }
        }
        store.requestRender()
      },
      { keyCount: event.changes.keys.size }
    )
  })
}

export function createYjsGraphSync({
  getStore,
  getYdoc,
  getYnodes,
  getYimages,
  setSuppressYjsEvents
}: YjsGraphSyncOptions) {
  function syncNodeToYjs(nodeId: string, changedKeys?: Iterable<string>) {
    const store = getStore()
    const ydoc = getYdoc()
    const ynodes = getYnodes()
    if (!ydoc || !ynodes) return
    const node = store.graph.getNode(nodeId)
    if (!node) return

    const localYimages = getYimages()
    const changedKeysArray =
      changedKeys === undefined ? undefined : Array.from(changedKeys)
    const keyCount = changedKeysArray?.length ?? -1
    perfTracer.measure(
      'yjs:syncNode',
      'Collab',
      () => {
        setSuppressYjsEvents(true)
        perfTracer.measure(
          'yjs:transact',
          'Collab',
          () => {
            ydoc.transact(() => {
              let ynode = ynodes.get(nodeId)
              if (!ynode) {
                ynode = new Y.Map()
                ynodes.set(nodeId, ynode)
              }
              perfTracer.measure(
                'yjs:writeProps',
                'Collab',
                () => syncNodePropsToYMap(node, ynode!, changedKeysArray),
                { nodeId, keyCount }
              )

              const shouldSyncImages =
                changedKeysArray === undefined || changedKeysArray.includes('fills')
              if (localYimages && shouldSyncImages) {
                perfTracer.measure(
                  'yjs:images',
                  'Collab',
                  () => {
                    for (const fill of node.fills) {
                      if (fill.imageHash && !localYimages.has(fill.imageHash)) {
                        const data = store.graph.images.get(fill.imageHash)
                        if (data) localYimages.set(fill.imageHash, data)
                      }
                    }
                  },
                  { nodeId, fillCount: node.fills.length }
                )
              }
            })
          },
          { nodeId, keyCount }
        )
        setSuppressYjsEvents(false)
      },
      { nodeId, keyCount, partial: changedKeysArray !== undefined }
    )
  }

  function syncAllNodesToYjs() {
    const store = getStore()
    const ydoc = getYdoc()
    const ynodes = getYnodes()
    if (!ydoc || !ynodes) return
    const localYimages = getYimages()
    setSuppressYjsEvents(true)
    ydoc.transact(() => {
      for (const node of store.graph.getAllNodes()) {
        let ynode = ynodes.get(node.id)
        if (!ynode) {
          ynode = new Y.Map()
          ynodes.set(node.id, ynode)
        }
        syncNodePropsToYMap(node, ynode)
      }
    })
    if (localYimages) {
      ydoc.transact(() => {
        for (const [hash, data] of store.graph.images) {
          if (!localYimages.has(hash)) {
            localYimages.set(hash, data)
          }
        }
      })
    }
    setSuppressYjsEvents(false)
  }

  // parent が graph に未到達のまま add イベントが届いた node を保留する。
  // PR #229 review MAJOR ... 全 snapshot scan + 無 bound だと untrusted yjs payload
  // で O(N^2) + DoS の経路があったため、 parentId 索引化 + cap + 親 delete 連鎖 clear
  // に変更。
  //
  // pendingByParent ... 親 id ごとに「親到来時に drain する child の list」を持つ。
  // pendingNodeIds ... 重複 add 検知用 (同 nodeId が複数の親 record に積まれない)。
  // PENDING_ADDS_CAP ... 親が永遠に来ない悪意ある payload で無限肥大しないための上限。
  const pendingByParent = new Map<string, Map<string, Y.Map<unknown>>>()
  const pendingNodeIds = new Set<string>()
  const PENDING_ADDS_CAP = 5000

  function applyYjsToGraph(events: Y.YEvent<Y.Map<unknown>>[]) {
    const store = getStore()
    const ynodes = getYnodes()
    if (!ynodes) return

    const parentsBecomingPresent = new Set<string>()

    for (const event of events) {
      if (event.target === ynodes) {
        for (const [key, change] of event.changes.keys) {
          if (change.action === 'add') {
            const ynode = ynodes.get(key)
            if (ynode) {
              applyYnodeToGraph(key, ynode)
              // この key が新たな親候補になる、 該当 child を後で drain する。
              parentsBecomingPresent.add(key)
            }
          } else if (change.action === 'delete') {
            store.graph.deleteNode(key)
            // 削除された親に紐づく pending child は親が永遠に来ないので drop する。
            clearPendingForParent(key)
            removePendingNodeId(key)
          }
        }
      } else if (event.target.parent === ynodes) {
        const nodeId = findNodeIdForYMap(event.target)
        if (nodeId) {
          const ynode = ynodes.get(nodeId)
          if (ynode) {
            applyYnodeToGraph(nodeId, ynode)
            parentsBecomingPresent.add(nodeId)
          }
        }
      }
    }

    // 親が新たに graph に到着した分だけ drain する (全 snapshot scan を廃止)。
    if (parentsBecomingPresent.size > 0) drainParents(parentsBecomingPresent)
  }

  function drainParents(seedParents: Set<string>) {
    const store = getStore()
    const queue: string[] = []
    for (const parent of seedParents) queue.push(parent)

    while (queue.length > 0) {
      const parentId = queue.shift()
      if (parentId === undefined) break
      if (!store.graph.getNode(parentId)) continue
      const bucket = pendingByParent.get(parentId)
      if (!bucket) continue
      pendingByParent.delete(parentId)
      for (const [childId, childYnode] of bucket) {
        pendingNodeIds.delete(childId)
        applyYnodeToGraph(childId, childYnode)
        // 今 add した child 自体が更に別の child の親かもしれないので queue に積む。
        if (store.graph.getNode(childId)) queue.push(childId)
      }
    }
  }

  function clearPendingForParent(parentId: string) {
    const bucket = pendingByParent.get(parentId)
    if (!bucket) return
    for (const childId of bucket.keys()) pendingNodeIds.delete(childId)
    pendingByParent.delete(parentId)
  }

  function removePendingNodeId(nodeId: string) {
    if (!pendingNodeIds.has(nodeId)) return
    // どの bucket に入っているか分からないので全 bucket を探索する
    // (cap で全体上限が抑えられているので O(cap) で済む)。
    for (const [parentId, bucket] of pendingByParent) {
      if (bucket.delete(nodeId) && bucket.size === 0) {
        pendingByParent.delete(parentId)
      }
    }
    pendingNodeIds.delete(nodeId)
  }

  function stashPending(nodeId: string, parentId: string, ynode: Y.Map<unknown>) {
    if (pendingNodeIds.has(nodeId)) {
      // 同 nodeId は最後の ynode で上書きする (yjs CRDT semantics 上の最新値勝ち)。
      removePendingNodeId(nodeId)
    }
    if (pendingNodeIds.size >= PENDING_ADDS_CAP) {
      // 上限到達 ... untrusted payload による DoS 防止で drop する。
      // 静かに drop すると debug 困難なので 1 度だけ console.warn する。
      console.warn(
        `[collab] pendingAdds cap reached (${PENDING_ADDS_CAP}), dropping node ${nodeId}`
      )
      return
    }
    let bucket = pendingByParent.get(parentId)
    if (!bucket) {
      bucket = new Map()
      pendingByParent.set(parentId, bucket)
    }
    bucket.set(nodeId, ynode)
    pendingNodeIds.add(nodeId)
  }

  function findNodeIdForYMap(ymap: Y.Map<unknown>): string | null {
    const ynodes = getYnodes()
    if (!ynodes) return null
    for (const [key, value] of ynodes.entries()) {
      if (value === ymap) return key
    }
    return null
  }

  function applyYnodeToGraph(nodeId: string, ynode: Y.Map<unknown>) {
    const store = getStore()
    const existing = store.graph.getNode(nodeId)
    const props = yNodeToProps(ynode)

    // visible が remote から欠落 / 非 boolean で届いたケースは true に正規化する
    // (#205 ... invitee 側で false 解釈されて layer が閉じる症状の防止)。
    // own field の boolean 値だけを採用し、 それ以外は default true で fallback。
    // false は明示意図 (ユーザーが hide した layer) なので保持。
    if (!(Object.hasOwn(props, 'visible') && typeof props.visible === 'boolean')) {
      props.visible = true
    }

    if (existing) {
      store.graph.updateNode(nodeId, props as Partial<SceneNode>)
      removePendingNodeId(nodeId)
      return
    }

    const parentId = props.parentId as string | undefined

    // root node (parentId なし) 経路 ... yjs 側の root を invitee 側の SceneGraph の
    // root と等価扱いし、 graph.rootId を yjs 側 id に置換して child を後で drain
    // できるようにする。 これがないと invitee 側 default root が arbitrary な id を
    // 持つせいで、 yjs から流れてくる child の parentId が graph に存在せず永久に
    // pending 化される (リアルタイム反映なし、 リロードで初出の症状)。
    if (!parentId) {
      const previousRootId = store.graph.rootId
      if (previousRootId !== nodeId) {
        // default 構造 (root + default Page 1 のみ) を yjs 側 root に正しく接続する。
        // default Page 1 は editor の初期 graph で作られているが、 yjs にも別 id の
        // page が乗ってくるため、 default Page 1 は捨てて yjs 側の構造に任せる。
        const previousRoot = store.graph.nodes.get(previousRootId)
        const defaultChildIds = previousRoot ? [...previousRoot.childIds] : []
        store.graph.nodes.delete(previousRootId)
        for (const childId of defaultChildIds) {
          store.graph.deleteNode(childId)
        }
        store.graph.rootId = nodeId
      }
      const type = (props.type as SceneNode['type']) ?? 'FRAME'
      const node: SceneNode = {
        ...(props as Partial<SceneNode>),
        id: nodeId,
        type,
        childIds: Array.isArray(props.childIds) ? [...(props.childIds as string[])] : []
      } as SceneNode
      store.graph.nodes.set(nodeId, node)
      removePendingNodeId(nodeId)
      return
    }

    if (store.graph.getNode(parentId)) {
      const type = props.type as SceneNode['type']
      const node = store.graph.createNode(type, parentId, props as Partial<SceneNode>)
      store.graph.nodes.delete(node.id)
      node.id = nodeId
      store.graph.nodes.set(nodeId, node)
      // parent の childIds にも反映する (createNode は internal で childIds に push
      // 済だが、 上で node.id を入れ替えたあとに整合性を確保するため明示的に
      // 確認する)。
      const parentNode = store.graph.nodes.get(parentId)
      if (parentNode && !parentNode.childIds.includes(nodeId)) {
        parentNode.childIds.push(nodeId)
      }
      removePendingNodeId(nodeId)
      return
    }

    // parent が未到達なら parentId 索引の保留 bucket に積む。 親が後続 event で
    // graph に来た時に drainParents で対象 child だけ drain する。 これがないと
    // yjs add イベントが非決定順で届いた時に child node が永久に drop される
    // (#205 の主因)。
    stashPending(nodeId, parentId, ynode)
  }

  return { syncNodeToYjs, syncAllNodesToYjs, applyYjsToGraph }
}
