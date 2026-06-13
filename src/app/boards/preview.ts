import { fetchBoardPreview, uploadBoardPreview } from '@/app/api/client'
import { IS_BROWSER } from '@/constants'

/**
 * board preview (data URL) は server DB を SSOT として保持する。
 * UI 一覧 (BoardsView / DashboardView 等) は同期的に preview 文字列を要求するため、
 * 中間に in-memory cache を置き、 一覧 mount 時に `preloadBoardPreviews(boardIds)` で
 * 一括 fetch、 個別 read は cache から同期返却するという 2 段構成にする。
 *
 * 旧 localStorage 経路 (`inkly:board-preview:*`) は廃止、 残骸を削除する best-effort 経路 (`purgeLegacyLocalPreviews`) のみ残す。
 */

const cache = new Map<string, string>()
const inflight = new Map<string, Promise<string | null>>()
const LEGACY_BOARD_PREVIEW_PREFIX = 'inkly:board-preview:'

export function readBoardPreview(boardId: string): string | null {
  return cache.get(boardId) ?? null
}

export function setCachedBoardPreview(boardId: string, dataUrl: string) {
  cache.set(boardId, dataUrl)
}

export function clearCachedBoardPreview(boardId?: string) {
  if (boardId) cache.delete(boardId)
  else cache.clear()
}

/**
 * 一覧画面 mount 時に複数 board の preview を一括 fetch、 cache を温める。
 * 失敗 (network / 401 / 404) は silent。 既存 cache がある場合は再 fetch しない (idempotent)。
 */
export async function preloadBoardPreviews(boardIds: string[]): Promise<void> {
  const targets = boardIds.filter((id) => id && !cache.has(id) && !inflight.has(id))
  if (targets.length === 0) return

  await Promise.all(
    targets.map(async (id) => {
      const promise = (async () => {
        try {
          const remote = await fetchBoardPreview(id)
          if (remote?.dataUrl) {
            cache.set(id, remote.dataUrl)
            return remote.dataUrl
          }
          return null
        } catch (error) {
          console.warn('[boards.preview] preload failed for', id, error)
          return null
        }
      })()
      inflight.set(id, promise)
      try {
        await promise
      } finally {
        inflight.delete(id)
      }
    })
  )
}

/**
 * 編集画面が定期的に呼ぶ preview upload。 cache を即時更新し DB に PUT する。
 * 失敗時は cache のみ残し、 caller への例外伝播は silent (UI ブロックしないため)。
 */
export async function writeBoardPreview(boardId: string, dataUrl: string): Promise<void> {
  cache.set(boardId, dataUrl)
  try {
    await uploadBoardPreview(boardId, dataUrl)
  } catch (error) {
    console.warn('[boards.preview] upload failed for', boardId, error)
  }
}

/**
 * 旧 localStorage 残骸 (`inkly:board-preview:<id>`) を削除する best-effort 経路。
 * 起動時に 1 度呼ぶだけ。 SSOT が server に移ったことを示す legacy cleanup。
 *
 * oxlint-disable-next-line ... 専用 storage module 経由ではないが「廃止 key を消す」
 * 一度きりの副作用なので raw localStorage 直接アクセスを許容する。
 */
export function purgeLegacyLocalPreviews() {
  if (!IS_BROWSER) return
  try {
    // oxlint-disable-next-line inkly/no-direct-storage-access
    const storage = window.localStorage
    const keysToRemove: string[] = []
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i)
      if (key?.startsWith(LEGACY_BOARD_PREVIEW_PREFIX)) {
        keysToRemove.push(key)
      }
    }
    for (const key of keysToRemove) {
      storage.removeItem(key)
    }
  } catch (error) {
    console.warn('[boards.preview] legacy purge failed:', error)
  }
}
