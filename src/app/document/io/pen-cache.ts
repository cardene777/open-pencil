/**
 * IndexedDB ベースの design cache は廃止。
 *
 * デザイン本体の SSOT は server DB の `board_documents` テーブルに移行した
 * (figma / miro と同じ「サーバが正本、 ブラウザは描画クライアント」モデル)。
 * board open / save は `EditorView.loadBoardDocument` / `scheduleBoardDocumentUpload`
 * で行う、 つまり API GET `/api/boards/:id/document` と PUT 経路だけ。
 *
 * 旧 API は callers の依存を一気に消すと差分が大きすぎるため、 ここでは
 * **シグネチャを維持した no-op stub** として残す。 戻り値は load 系で常に null、
 * save 系で void。 これにより既存の `await savePenToCache(...)` や
 * `await loadCachedPen(...)` 経路は build / type を壊さずに silent no-op になる。
 *
 * 将来的に呼び出し元の整理 (`EditorView` に集約) が完了したら本 file ごと削除する。
 */

export interface CachedPenDocument {
  name: string
  mimeType: string
  bytes: Uint8Array
  updatedAt: number
}

export async function savePenToCache(
  _name: string,
  _mimeType: string,
  _bytes: Uint8Array,
  _boardId?: string | null
): Promise<void> {
  // no-op: server PUT 経路 (EditorView.scheduleBoardDocumentUpload) に一本化
}

export async function loadCachedPen(_boardId?: string | null): Promise<CachedPenDocument | null> {
  // no-op: server GET 経路 (EditorView.loadBoardDocument) に一本化
  return null
}

export async function clearCachedPen(_boardId?: string | null): Promise<void> {
  // no-op: IndexedDB を触らないので clear 不要
}

export async function clearAllCachedPens(): Promise<void> {
  // no-op: IndexedDB を触らないので clear 不要
}

export function fileFromCachedPen(cached: CachedPenDocument): File {
  return new File([cached.bytes], cached.name, { type: cached.mimeType })
}
