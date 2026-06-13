import type { Ref } from 'vue'
import type { Awareness } from 'y-protocols/awareness'

import { buildRemotePeers, remotePeersToCursors } from '@/app/collab/awareness'
import type { CollabState } from '@/app/collab/types'
import type { EditorStore } from '@/app/editor/active-store'

type LocalAwarenessOptions = {
  state: Ref<CollabState>
  storedName: Ref<string>
  getStore: () => EditorStore
  getAwareness: () => Awareness | null
}

/**
 * remote cursor の lerp 補間。 awareness は 33ms throttle で離散送信されるが、
 * client 描画は 60fps で行うため、 受信値 (target) と現在表示位置 (display) を保持し
 * 毎 frame `display = lerp(display, target, t)` で滑らかに追従させる。
 *
 * cursor 単位の補間状態 ... peer の awareness clientId を key にする。
 * peer の disconnect / pageId 切替で state を clear する。
 */
const LERP_DURATION_MS = 120
const LERP_DISTANCE_EPSILON = 0.5

type CursorLerpState = {
  displayX: number
  displayY: number
  targetX: number
  targetY: number
  startX: number
  startY: number
  startedAt: number
  pageId: string
}

const cursorLerpStates = new Map<string, CursorLerpState>()
let cursorRafHandle: number | null = null

function nowMs(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

function ensureRafLoop(getStore: () => EditorStore) {
  if (cursorRafHandle !== null) return
  if (typeof requestAnimationFrame === 'undefined') return

  const step = () => {
    cursorRafHandle = null
    const t = nowMs()
    let anyAnimating = false

    const store = getStore()
    const cursors = store.state.remoteCursors
    for (const cursor of cursors) {
      const peerId = cursor.peerId
      if (!peerId) continue
      const lerp = cursorLerpStates.get(peerId)
      if (!lerp) continue

      const elapsed = t - lerp.startedAt
      const progress = Math.max(0, Math.min(1, elapsed / LERP_DURATION_MS))
      // easeOutCubic
      const eased = 1 - (1 - progress) ** 3
      const x = lerp.startX + (lerp.targetX - lerp.startX) * eased
      const y = lerp.startY + (lerp.targetY - lerp.startY) * eased

      const dx = Math.abs(x - lerp.displayX)
      const dy = Math.abs(y - lerp.displayY)
      lerp.displayX = x
      lerp.displayY = y
      cursor.x = x
      cursor.y = y

      if (
        progress < 1 ||
        dx > LERP_DISTANCE_EPSILON ||
        dy > LERP_DISTANCE_EPSILON ||
        Math.abs(lerp.targetX - x) > LERP_DISTANCE_EPSILON ||
        Math.abs(lerp.targetY - y) > LERP_DISTANCE_EPSILON
      ) {
        anyAnimating = true
      }
    }

    if (cursors.length > 0) {
      store.requestRender()
    }

    if (anyAnimating) {
      cursorRafHandle = requestAnimationFrame(step)
    }
  }

  cursorRafHandle = requestAnimationFrame(step)
}

function updateCursorLerpTargets(
  cursors: ReturnType<typeof remotePeersToCursors>,
  getStore: () => EditorStore
) {
  const t = nowMs()
  const seen = new Set<string>()

  for (const cursor of cursors) {
    if (!cursor.peerId || !cursor.pageId) continue
    seen.add(cursor.peerId)
    const existing = cursorLerpStates.get(cursor.peerId)
    if (!existing) {
      // 新規 peer ... 表示位置 = target で開始 (pop-in 防止)
      cursorLerpStates.set(cursor.peerId, {
        displayX: cursor.x,
        displayY: cursor.y,
        targetX: cursor.x,
        targetY: cursor.y,
        startX: cursor.x,
        startY: cursor.y,
        startedAt: t,
        pageId: cursor.pageId
      })
      continue
    }
    // page 切替 ... 補間しないで瞬間 jump
    if (existing.pageId !== cursor.pageId) {
      existing.displayX = cursor.x
      existing.displayY = cursor.y
      existing.startX = cursor.x
      existing.startY = cursor.y
      existing.pageId = cursor.pageId
      existing.targetX = cursor.x
      existing.targetY = cursor.y
      existing.startedAt = t
      continue
    }
    // 通常 ... 現在 display から target へ補間開始
    existing.startX = existing.displayX
    existing.startY = existing.displayY
    existing.targetX = cursor.x
    existing.targetY = cursor.y
    existing.startedAt = t
    // 描画前 frame での値は display を採用 (target に直接 set しない)
    cursor.x = existing.displayX
    cursor.y = existing.displayY
  }

  // 消失した peer の state を clear
  const stale: string[] = []
  for (const key of cursorLerpStates.keys()) {
    if (!seen.has(key)) stale.push(key)
  }
  for (const key of stale) cursorLerpStates.delete(key)

  if (cursors.length > 0) ensureRafLoop(getStore)
}

export function clearCursorLerpStates() {
  cursorLerpStates.clear()
  if (cursorRafHandle !== null && typeof cancelAnimationFrame !== 'undefined') {
    cancelAnimationFrame(cursorRafHandle)
    cursorRafHandle = null
  }
}

export function createLocalAwarenessActions({
  state,
  storedName,
  getStore,
  getAwareness
}: LocalAwarenessOptions) {
  function broadcastAwareness() {
    const awareness = getAwareness()
    if (!awareness) return
    awareness.setLocalStateField('user', {
      name: state.value.localName,
      color: state.value.localColor
    })
  }

  function updateCursor(x: number, y: number, pageId: string) {
    const awareness = getAwareness()
    if (!awareness) return
    awareness.setLocalStateField('cursor', { x, y, pageId, zoom: getStore().state.zoom })
  }

  function updateSelection(ids: string[]) {
    const awareness = getAwareness()
    if (!awareness) return
    awareness.setLocalStateField('selection', ids)
  }

  function updatePeersList() {
    const awareness = getAwareness()
    if (!awareness) return

    const store = getStore()
    const peers = buildRemotePeers(
      awareness.getStates() as Map<number, Record<string, unknown>>,
      awareness.clientID
    )

    state.value.peers = peers
    const nextCursors = remotePeersToCursors(peers, store.state.currentPageId)
    store.state.remoteCursors = nextCursors
    updateCursorLerpTargets(nextCursors, getStore)
    store.requestRender()
  }

  function setLocalName(name: string) {
    state.value.localName = name
    storedName.value = name
    broadcastAwareness()
  }

  return { broadcastAwareness, updateCursor, updateSelection, updatePeersList, setLocalName }
}
