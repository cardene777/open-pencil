import { exportFigFile } from '@inkly/core/io/formats/fig'

import { uploadBoardDocument } from '@/app/api/client'
import type { EditorStore } from '@/app/editor/active-store'

/**
 * Play モード遷移前に最新 design を server DB (SSOT) に PUT する。
 * 旧経路は IndexedDB に書いていたが、 server が SSOT に統一されたため API PUT に変更。
 */
export async function persistPrototypePreviewDocument(boardId: string, store: EditorStore) {
  const bytes = await exportFigFile(store.graph)
  await uploadBoardDocument(boardId, bytes)
}
