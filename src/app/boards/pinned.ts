import { fetchPinnedBoardIds, pinBoard, unpinBoard } from '@/app/api/client'
import { IS_BROWSER } from '@/constants'

/**
 * pin 状態は server DB の `board_pins` を SSOT として保持する。
 * 旧 localStorage 経路 (`inkly:pinned-boards`) は廃止、 in-memory cache で
 * 同期 read (`readPinnedBoardIds` / `isBoardPinned`) の契約を維持する。
 *
 * caller は dashboard / boards 一覧 mount 時に `loadPinnedBoards()` を呼んで cache 温める。
 */

const LEGACY_PINNED_BOARDS_KEY = 'inkly:pinned-boards'
let cache: Set<string> = new Set()
let loaded = false
let inflight: Promise<Set<string>> | null = null

export function readPinnedBoardIds(): string[] {
  return [...cache]
}

export function isBoardPinned(boardId: string): boolean {
  return cache.has(boardId)
}

/**
 * 一覧画面 mount 時に呼んで server から pinned 一覧を取得し cache を上書きする。
 * 401 (未 sign-in) は空 array を返す経路を `fetchPinnedBoardIds` で吸収済。
 */
export async function loadPinnedBoards(): Promise<Set<string>> {
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const ids = await fetchPinnedBoardIds()
      cache = new Set(ids)
      loaded = true
      return cache
    } catch (error) {
      console.warn('[boards.pinned] load failed:', error)
      return cache
    } finally {
      inflight = null
    }
  })()
  return inflight
}

/**
 * pin / unpin を server に反映する。 戻り値は新しい pin 状態 (true = pinned)。
 * cache 即時反映 → server 失敗時は元に戻す optimistic 反映。
 */
export async function togglePinnedBoardAsync(boardId: string): Promise<boolean> {
  const wasPinned = cache.has(boardId)
  if (wasPinned) {
    cache.delete(boardId)
    try {
      await unpinBoard(boardId)
      return false
    } catch (error) {
      cache.add(boardId)
      console.warn('[boards.pinned] unpin failed:', error)
      throw error
    }
  }
  cache.add(boardId)
  try {
    await pinBoard(boardId)
    return true
  } catch (error) {
    cache.delete(boardId)
    console.warn('[boards.pinned] pin failed:', error)
    throw error
  }
}

/**
 * 同期 callers (UI handler) 互換のため残す。 内部で async toggle を起動するが
 * 戻り値は cache に基づく optimistic 即時値 (server confirm 前)。
 * 旧 API シグネチャを保ったまま side-effect 化、 既存 caller break しない。
 */
export function togglePinnedBoard(boardId: string): boolean {
  const wasPinned = cache.has(boardId)
  void togglePinnedBoardAsync(boardId).catch(() => {
    // optimistic 戻しは togglePinnedBoardAsync で完了
  })
  return !wasPinned
}

export function clearPinnedBoards() {
  cache = new Set()
  loaded = false
}

/**
 * 旧 localStorage 残骸 (`inkly:pinned-boards`) を削除する best-effort 経路。
 */
export function purgeLegacyLocalPinned() {
  if (!IS_BROWSER) return
  try {
    // oxlint-disable-next-line inkly/no-direct-storage-access
    window.localStorage.removeItem(LEGACY_PINNED_BOARDS_KEY)
  } catch (error) {
    console.warn('[boards.pinned] legacy purge failed:', error)
  }
}

export function isPinnedCacheLoaded(): boolean {
  return loaded
}
