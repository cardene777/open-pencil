import { tryOnScopeDispose, useLocalStorage } from '@vueuse/core'
import { computed, ref, watch } from 'vue'

import { getAnonymousId } from '@/app/api/client'
import { useAuthStore } from '@/app/auth/store'
import { createFollowActions, generateRoomId } from '@/app/collab/awareness'
import { colorFromIdentity } from '@/app/collab/cursor-color'
import { createLocalAwarenessActions } from '@/app/collab/local-awareness'
import {
  createCollabConnectionActions,
  createCollabRuntime,
  createInitialCollabState
} from '@/app/collab/session'
import { DEFAULT_COLLAB_STATE, type CollabState, type RemotePeer } from '@/app/collab/types'
import { createYjsGraphSync } from '@/app/collab/yjs-sync'
import type { EditorStore } from '@/app/editor/active-store'

export { COLLAB_KEY, useCollabInjected } from '@/app/collab/context'
export { DEFAULT_COLLAB_STATE }
export type { CollabState, RemotePeer }

export function useCollab(storeOrGetter: EditorStore | (() => EditorStore)) {
  const getStore = () =>
    typeof storeOrGetter === 'function' ? (storeOrGetter as () => EditorStore)() : storeOrGetter
  const storedName = useLocalStorage('op-collab-name', '')
  const auth = useAuthStore()
  const resolvedInitialName =
    auth.user?.name?.trim() || auth.user?.email?.trim() || storedName.value
  const state = ref<CollabState>(
    createInitialCollabState(resolvedInitialName, getAnonymousId(), auth.user?.id ?? null)
  )
  const runtime = createCollabRuntime()
  const remotePeers = computed(() => state.value.peers)
  const getActiveStore = () => runtime.connectedStore ?? getStore()

  const { followingPeer, followPeer, resetFollow, tickFollow } = createFollowActions(
    getActiveStore,
    () => runtime.awareness
  )
  const {
    broadcastAwareness,
    updateCursor,
    updateSelection,
    updatePeersList,
    setLocalName,
    startIdleRefresh,
    stopIdleRefresh
  } = createLocalAwarenessActions({
    state,
    storedName,
    getStore: getActiveStore,
    getAwareness: () => runtime.awareness
  })

  const { syncNodeToYjs, syncAllNodesToYjs, applyYjsToGraph } = createYjsGraphSync({
    getStore: getActiveStore,
    getYdoc: () => runtime.ydoc,
    getYnodes: () => runtime.ynodes,
    getYimages: () => runtime.yimages,
    setSuppressYjsEvents: (value) => {
      runtime.suppressYjsEvents = value
    }
  })
  const { connect, disconnect } = createCollabConnectionActions({
    runtime,
    state,
    getStore,
    updatePeersList,
    tickFollow,
    broadcastAwareness,
    applyYjsToGraph,
    syncNodeToYjs,
    resetFollow
  })

  function shareCurrentDoc(): string {
    const roomId = generateRoomId()
    connect(roomId, { seedIfEmpty: true })
    return roomId
  }

  // login/logout で cursor 表示名と color を user identity に追従させる。
  // user.name が空になった (logout) なら storedName (localStorage) に fallback、
  // color は user.id 優先、 未 login 時は anonymous_id にfallback。
  watch(
    () => auth.user,
    (user) => {
      const nextName = user?.name?.trim() || user?.email?.trim() || storedName.value
      if (nextName && nextName !== state.value.localName) {
        setLocalName(nextName)
      }
      const nextColor = colorFromIdentity(user?.id ?? null, getAnonymousId())
      state.value.localColor = nextColor
      broadcastAwareness()
    },
    { immediate: false }
  )

  // connect / disconnect に合わせて idle 再評価 interval を起動 / 停止する。
  // 全 peer が静止していて awareness change が発火しないケースで idle 化を
  // 時間軸で進ませるため、 `state.value.connected` を watch して周期 polling を on/off する。
  watch(
    () => state.value.connected,
    (connected) => {
      if (connected) startIdleRefresh()
      else stopIdleRefresh()
    },
    { immediate: false }
  )

  tryOnScopeDispose(() => {
    stopIdleRefresh()
    disconnect()
  })

  // hub provider が socket OPEN な間 true。 EditorView 側で
  // 「hub 接続中は autosave PUT 全文経路を skip する」judge に使う。
  // state.value.connected と roomId の変化を Vue が追えるように依存に含める
  // (hubProvider 自体は ref でないため connected の再評価 trigger として使う)。
  const hubConnected = computed(() => {
    void state.value.connected
    void state.value.roomId
    return Boolean(runtime.hubProvider?.isConnected())
  })

  return {
    state,
    remotePeers,
    followingPeer,
    connect,
    disconnect,
    shareCurrentDoc,
    syncCurrentDoc: syncAllNodesToYjs,
    updateCursor,
    updateSelection,
    setLocalName,
    followPeer,
    tickFollow,
    hubConnected
  }
}
