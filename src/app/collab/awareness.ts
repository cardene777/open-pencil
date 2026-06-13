import { ref } from 'vue'
import type * as awarenessProtocol from 'y-protocols/awareness'

import { randomIndex } from '@inkly/core/random'
import type { Color } from '@inkly/core/types'

import type { EditorStore } from '@/app/editor/active-store'
import { PEER_COLORS, ROOM_ID_CHARS, ROOM_ID_LENGTH } from '@/constants'

import type { RemotePeer } from './types'

type Awareness = awarenessProtocol.Awareness

type CursorState = {
  x: number
  y: number
  pageId: string
  zoom?: number
}

/**
 * cursor / selection の更新が観測されてからこの時間経過した peer を idle 扱いする。
 * UI 側で半透明表示の根拠になる (見ているけど操作していない user の視覚的区別)。
 */
export const PEER_IDLE_THRESHOLD_MS = 15_000

/**
 * peer の最終活動時刻 tracker。 clientId → last activity ts。
 * connect (re-share) ごとに新規の Map を作る運用のため、 module level state ではなく
 * factory で作る pure な closure として返す。
 */
export interface PeerActivityTracker {
  recordActivity(clientId: number): void
  getLastActivity(clientId: number): number | null
  prune(activeClientIds: Set<number>): void
  reset(): void
}

export function createPeerActivityTracker(now: () => number = Date.now): PeerActivityTracker {
  const lastActivity = new Map<number, number>()
  return {
    recordActivity(clientId: number) {
      lastActivity.set(clientId, now())
    },
    getLastActivity(clientId: number) {
      return lastActivity.get(clientId) ?? null
    },
    prune(activeClientIds: Set<number>) {
      for (const id of lastActivity.keys()) {
        if (!activeClientIds.has(id)) lastActivity.delete(id)
      }
    },
    reset() {
      lastActivity.clear()
    }
  }
}

/**
 * 同じ user の peer 重複を dedup するキー。 優先順位 ...
 *   1. sign-in user の `user.id` が乗っている場合 ... `userId:<id>` を使う。
 *      偶然同名の別人 (例 alice@a.example と alice@b.example) でも別 user.id なので
 *      dedup しない。 これが真の dedup 経路。
 *   2. fallback ... `name + color` (PR #214 既存経路)。 未 sign-in / 旧 client が
 *      awareness state に userId を載せていない場合に動く。
 *   3. `Anonymous` / 名前空 + userId なし ... null を返して dedup しない (別人扱い)。
 */
function dedupKey(peer: RemotePeer): string | null {
  if (peer.userId) return `userId:${peer.userId}`
  const name = peer.name?.trim()
  if (!name || name === 'Anonymous') return null
  const c = peer.color
  return `${name}::${c.r.toFixed(2)},${c.g.toFixed(2)},${c.b.toFixed(2)}`
}

/**
 * lerp state / UI v-for key 用の安定 ID。 dedup key があれば優先し (= 同 user が
 * tab1 / tab2 を行き来しても安定)、 なければ clientId にフォールバック。 これがないと
 * dedup で勝つ peer が tab 切替で frame 毎に変わり、 lerp cache key が無効化されて
 * cursor が瞬間ジャンプ (カクつき) するため。
 */
export function stableRemotePeerId(peer: RemotePeer): string {
  return dedupKey(peer) ?? `clientId:${peer.clientId}`
}

interface BuildRemotePeersOptions {
  activityTracker?: PeerActivityTracker
  now?: () => number
  idleThresholdMs?: number
}

export function buildRemotePeers(
  states: Map<number, Record<string, unknown>>,
  localClientId: number,
  options: BuildRemotePeersOptions = {}
): RemotePeer[] {
  const tracker = options.activityTracker
  const now = options.now ?? Date.now
  const idleThreshold = options.idleThresholdMs ?? PEER_IDLE_THRESHOLD_MS
  const raw: RemotePeer[] = []

  states.forEach((peerState, clientId) => {
    if (clientId === localClientId) return
    const user = peerState.user as
      | { name?: string; color?: Color; userId?: string | null }
      | undefined
    if (!user) return
    raw.push({
      clientId,
      name: user.name || 'Anonymous',
      color: user.color || PEER_COLORS[clientId % PEER_COLORS.length],
      userId: user.userId ?? null,
      cursor: peerState.cursor as RemotePeer['cursor'],
      selection: peerState.selection as string[]
    })
  })

  // 同一 user (name + color 一致) の重複を最新活動 peer 1 件にまとめる。
  // tracker が無いと last activity 比較ができないので、 その場合は cursor を持つ
  // peer (= 現に動いている方) を優先、 さらに同条件なら clientId 大 (新接続) を優先。
  const byKey = new Map<string, RemotePeer>()
  const standalone: RemotePeer[] = []
  for (const peer of raw) {
    const key = dedupKey(peer)
    if (!key) {
      standalone.push(peer)
      continue
    }
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, peer)
      continue
    }
    if (peerActivityScore(peer, tracker) > peerActivityScore(existing, tracker)) {
      byKey.set(key, peer)
    }
  }

  const deduped = [...byKey.values(), ...standalone]

  // idle 判定。 tracker があれば lastActivity が threshold を超えた peer を idle、
  // tracker が無ければ cursor が無い peer を idle 扱い (保守的 fallback)。
  return deduped.map((peer) => {
    const isIdle = tracker
      ? (() => {
          const last = tracker.getLastActivity(peer.clientId)
          if (last == null) return true
          return now() - last > idleThreshold
        })()
      : !peer.cursor
    return { ...peer, isIdle }
  })
}

function peerActivityScore(peer: RemotePeer, tracker?: PeerActivityTracker): number {
  // tracker がある場合は last activity ts、 無ければ「cursor を持つ + clientId」
  // という保守的 ranking。
  if (tracker) {
    return tracker.getLastActivity(peer.clientId) ?? 0
  }
  return (peer.cursor ? 1_000_000 : 0) + peer.clientId
}

export function remotePeersToCursors(peers: RemotePeer[], currentPageId: string) {
  return peers
    .filter((p) => p.cursor && p.cursor.pageId === currentPageId)
    .map((p) => {
      const cursor = p.cursor as NonNullable<RemotePeer['cursor']>
      return {
        // peerId は lerp 補間の cache key として利用。 dedup が効いた場合に同 user
        // の clientId が tab 切替で頻繁に変わるとカクつくので、 stableRemotePeerId
        // (userId 優先 → name+color → clientId) で安定化する。
        peerId: stableRemotePeerId(p),
        pageId: cursor.pageId,
        name: p.name,
        color: p.color,
        x: cursor.x,
        y: cursor.y,
        selection: p.selection
      }
    })
}

export function createFollowActions(
  getStore: () => EditorStore,
  getAwareness: () => Awareness | null
) {
  const followingPeer = ref<number | null>(null)

  function followPeer(clientId: number | null) {
    followingPeer.value = clientId
  }

  function resetFollow() {
    followingPeer.value = null
  }

  function tickFollow() {
    const store = getStore()
    const awareness = getAwareness()
    if (!followingPeer.value || !awareness) return
    const peerState = awareness.getStates().get(followingPeer.value)
    if (!peerState?.cursor) {
      followingPeer.value = null
      return
    }
    const cursor = peerState.cursor as CursorState
    if (cursor.pageId !== store.state.currentPageId) {
      void store.switchPage(cursor.pageId)
    }
    const canvas = document.querySelector('canvas')
    if (!canvas) return
    if (cursor.zoom) store.state.zoom = cursor.zoom
    const cw = canvas.width / devicePixelRatio
    const ch = canvas.height / devicePixelRatio
    store.state.panX = cw / 2 - cursor.x * store.state.zoom
    store.state.panY = ch / 2 - cursor.y * store.state.zoom
    store.requestRender()
  }

  return { followingPeer, followPeer, resetFollow, tickFollow }
}

export function generateRoomId(): string {
  let result = ''
  for (let i = 0; i < ROOM_ID_LENGTH; i++) {
    result += ROOM_ID_CHARS[randomIndex(ROOM_ID_CHARS.length)]
  }
  return result
}
