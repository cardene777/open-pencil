import type { Ref } from 'vue'
import { IndexeddbPersistence } from 'y-indexeddb'
import * as awarenessProtocol from 'y-protocols/awareness'
import type { Awareness } from 'y-protocols/awareness'
import * as Y from 'yjs'

import { colorFromIdentity } from '@/app/collab/cursor-color'
import type { CollabState } from '@/app/collab/types'
import {
  connectWebRtcProvider,
  type WebRtcProviderConnection
} from '@/app/collab/webrtc-provider'
import {
  connectYjsHubProvider,
  type YjsHubProviderConnection
} from '@/app/collab/yjs-hub-provider'
import { bindCollabGraphEvents, registerYjsObservers } from '@/app/collab/yjs-sync'
import type { EditorStore } from '@/app/editor/active-store'

export type CollabRuntime = {
  ydoc: Y.Doc | null
  awareness: awarenessProtocol.Awareness | null
  ynodes: Y.Map<Y.Map<unknown>> | null
  yimages: Y.Map<Uint8Array> | null
  provider: WebRtcProviderConnection | null
  hubProvider: YjsHubProviderConnection | null
  persistence: IndexeddbPersistence | null
  connectedStore: EditorStore | null
  suppressGraphSync: boolean
  suppressYjsEvents: boolean
  unbindGraphEvents: (() => void) | null
  stopZoomWatch: (() => void) | null
}

type ConnectCollabSessionOptions = {
  roomId: string
  /** boardId が指定された場合 server yjs-hub にも繋ぐ。 未指定 (P2P 一時 share 等) は WebRTC のみ */
  boardId?: string | null
  runtime: CollabRuntime
  state: Ref<CollabState>
  store: EditorStore
  disconnect: () => void
  updatePeersList: () => void
  tickFollow: () => void
  broadcastAwareness: () => void
  applyYjsToGraph: (events: Y.YEvent<Y.Map<unknown>>[]) => void
  syncNodeToYjs: (nodeId: string) => void
  seedIfEmpty: boolean
}

type CollabConnectionActionsOptions = {
  runtime: CollabRuntime
  state: Ref<CollabState>
  getStore: () => EditorStore
  updatePeersList: () => void
  tickFollow: () => void
  broadcastAwareness: () => void
  applyYjsToGraph: (events: Y.YEvent<Y.Map<unknown>>[]) => void
  syncNodeToYjs: (nodeId: string) => void
  resetFollow: () => void
}

type CollabSessionResources = {
  store: EditorStore
  provider: WebRtcProviderConnection | null
  hubProvider: YjsHubProviderConnection | null
  awareness: awarenessProtocol.Awareness | null
  persistence: IndexeddbPersistence | null
  ydoc: Y.Doc | null
  unbindGraphEvents: (() => void) | null
  stopZoomWatch: (() => void) | null
  resetFollow: () => void
}

export function createCollabRuntime(): CollabRuntime {
  return {
    ydoc: null,
    awareness: null,
    ynodes: null,
    yimages: null,
    provider: null,
    hubProvider: null,
    persistence: null,
    connectedStore: null,
    suppressGraphSync: false,
    suppressYjsEvents: false,
    unbindGraphEvents: null,
    stopZoomWatch: null
  }
}

export function createInitialCollabState(
  localName: string,
  anonymousId: string | null,
  userId: string | null = null
): CollabState {
  return {
    connected: false,
    roomId: null,
    peers: [],
    localName,
    localColor: colorFromIdentity(userId, anonymousId),
    localUserId: userId
  }
}

export function createCollabConnectionActions({
  runtime,
  state,
  getStore,
  updatePeersList,
  tickFollow,
  broadcastAwareness,
  applyYjsToGraph,
  syncNodeToYjs,
  resetFollow
}: CollabConnectionActionsOptions) {
  function connect(
    roomId: string,
    options: { seedIfEmpty?: boolean; boardId?: string | null } = {}
  ) {
    connectCollabSession({
      roomId,
      boardId: options.boardId ?? null,
      runtime,
      state,
      store: getStore(),
      disconnect,
      updatePeersList,
      tickFollow,
      broadcastAwareness,
      applyYjsToGraph,
      syncNodeToYjs,
      seedIfEmpty: options.seedIfEmpty ?? false
    })
  }

  function disconnect() {
    const store = runtime.connectedStore ?? getStore()
    disposeCollabSessionResources({
      store,
      provider: runtime.provider,
      hubProvider: runtime.hubProvider,
      awareness: runtime.awareness,
      persistence: runtime.persistence,
      ydoc: runtime.ydoc,
      unbindGraphEvents: runtime.unbindGraphEvents,
      stopZoomWatch: runtime.stopZoomWatch,
      resetFollow
    })
    resetCollabRuntime(runtime)
    resetCollabConnectionState(state)
  }

  return { connect, disconnect }
}

export function watchAwarenessZoom(store: EditorStore, getAwareness: () => Awareness | null) {
  return store.onEditorEvent('viewport:changed', (viewport) => {
    const awareness = getAwareness()
    if (!awareness) return
    const prev = awareness.getLocalState()?.cursor as
      | { x: number; y: number; pageId: string; zoom: number }
      | undefined
    if (prev) {
      awareness.setLocalStateField('cursor', { ...prev, zoom: viewport.zoom })
    }
  })
}

export function connectCollabSession({
  roomId,
  boardId,
  runtime,
  state,
  store,
  disconnect,
  updatePeersList,
  tickFollow,
  broadcastAwareness,
  applyYjsToGraph,
  syncNodeToYjs,
  seedIfEmpty
}: ConnectCollabSessionOptions) {
  if (runtime.provider) disconnect()

  runtime.connectedStore = store
  state.value.roomId = roomId
  runtime.ydoc = new Y.Doc()
  runtime.awareness = new awarenessProtocol.Awareness(runtime.ydoc)
  runtime.ynodes = runtime.ydoc.getMap('nodes')
  runtime.yimages = runtime.ydoc.getMap('images')
  runtime.persistence = new IndexeddbPersistence(`op-room-${roomId}`, runtime.ydoc)

  runtime.awareness.on('change', () => {
    updatePeersList()
    tickFollow()
  })

  registerYjsObservers({
    store,
    ynodes: runtime.ynodes,
    yimages: runtime.yimages,
    getSuppressYjsEvents: () => runtime.suppressYjsEvents,
    setSuppressGraphSync: (value) => {
      runtime.suppressGraphSync = value
    },
    applyYjsToGraph
  })

  // hub-first ... boardId が紐付いていれば server yjs-hub に default 経路で繋ぐ。
  // hub 接続失敗 / auth エラー時は onFallback で P2P provider を起動する。
  // boardId が無い (一時 share room) 場合は最初から P2P で繋ぐ。
  let p2pProvider: WebRtcProviderConnection | null = null
  function startP2pProvider() {
    if (p2pProvider || !runtime.ydoc || !runtime.awareness) return
    p2pProvider = connectWebRtcProvider({
      roomId,
      ydoc: runtime.ydoc,
      awareness: runtime.awareness
    })
    runtime.provider = p2pProvider
  }

  let hubProviderReady: Promise<{ synced: boolean } | { peerCount: number }> | null = null
  if (boardId) {
    const hubProvider = connectYjsHubProvider({
      boardId,
      ydoc: runtime.ydoc,
      awareness: runtime.awareness,
      onFallback: () => {
        console.info('[collab] hub unreachable, falling back to WebRTC P2P', { roomId, boardId })
        startP2pProvider()
      }
    })
    runtime.hubProvider = hubProvider
    hubProviderReady = hubProvider.ready
  } else {
    startP2pProvider()
  }
  state.value.connected = true
  broadcastAwareness()

  const persistence = runtime.persistence as IndexeddbPersistence & {
    whenSynced?: Promise<unknown>
  }
  const persistenceReady = persistence.whenSynced ?? Promise.resolve()
  const transportReady: Promise<{ synced: boolean } | { peerCount: number } | null> =
    hubProviderReady ??
    (runtime.provider ? runtime.provider.ready : Promise.resolve(null))
  void Promise.all([transportReady, persistenceReady]).then(([info]) => {
    if (!runtime.ydoc || !runtime.ynodes) return
    const isEmpty = runtime.ynodes.size === 0
    if (!seedIfEmpty || !isEmpty) return
    // seedIfEmpty 経路は「初回 P2P で peer count = 0」のときだけ作動させていた既存挙動を維持し、
    // hub 経路では (server 側 snapshot が空) ndoc が空のままなら seed する
    if (info && 'peerCount' in info && info.peerCount > 0) return
    for (const node of store.graph.getAllNodes()) {
      syncNodeToYjs(node.id)
    }
  })

  runtime.stopZoomWatch = watchAwarenessZoom(store, () => runtime.awareness)

  runtime.unbindGraphEvents = bindCollabGraphEvents({
    store,
    getYdoc: () => runtime.ydoc,
    getYnodes: () => runtime.ynodes,
    getSuppressGraphSync: () => runtime.suppressGraphSync,
    setSuppressYjsEvents: (value) => {
      runtime.suppressYjsEvents = value
    },
    syncNodeToYjs
  })
}

export function resetCollabRuntime(runtime: CollabRuntime) {
  runtime.unbindGraphEvents = null
  runtime.stopZoomWatch = null
  runtime.provider = null
  runtime.hubProvider = null
  runtime.awareness = null
  runtime.persistence = null
  runtime.ydoc = null
  runtime.ynodes = null
  runtime.yimages = null
  runtime.connectedStore = null
}

export function resetCollabConnectionState(state: Ref<CollabState>) {
  state.value.connected = false
  state.value.roomId = null
  state.value.peers = []
}

export function disposeCollabSessionResources(resources: CollabSessionResources) {
  resources.unbindGraphEvents?.()
  resources.stopZoomWatch?.()
  resources.provider?.disconnect()
  resources.hubProvider?.disconnect()
  // 受信側 lerp 補間の rAF 経路と cache state を完全破棄して memory leak / 残像を防ぐ
  void import('@/app/collab/local-awareness').then(({ clearCursorLerpStates }) => {
    clearCursorLerpStates()
  })
  resources.awareness?.destroy()
  if (resources.persistence) {
    void resources.persistence.destroy()
  }
  resources.ydoc?.destroy()
  resources.resetFollow()
  resources.store.state.remoteCursors = []
  resources.store.requestRender()
}
