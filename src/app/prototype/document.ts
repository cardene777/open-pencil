import { exportFigFile } from '@inkly/core/io/formats/fig'

import { savePenToCache } from '@/app/document/io/pen-cache'
import type { EditorStore } from '@/app/editor/active-store'

export async function persistPrototypePreviewDocument(boardId: string, store: EditorStore) {
  const bytes = await exportFigFile(store.graph)
  await savePenToCache(
    `${store.state.documentName || 'prototype'}.fig`,
    'application/octet-stream',
    bytes,
    boardId
  )
}
