import { eq, inArray } from 'drizzle-orm'

import type { ApiDatabase } from './db/client.js'
import { createMigratedApiDatabase } from './db/migrate.js'
import { boardPreviews } from './db/schema.js'
import type { BoardPreviewRecord, BoardPreviewStore } from './types.js'

async function createInMemoryDatabase() {
  return createMigratedApiDatabase({ mode: 'memory' })
}

export interface CreateBoardPreviewStoreOptions {
  database?: ApiDatabase
  now?: () => number
}

export async function createBoardPreviewStore(
  options: CreateBoardPreviewStoreOptions = {}
): Promise<BoardPreviewStore> {
  const database = options.database ?? (await createInMemoryDatabase())
  const now = options.now ?? Date.now

  function rowToRecord(row: {
    boardId: string
    dataUrl: string
    size: number
    updatedAt: number
    updatedByUserId: string | null
  }): BoardPreviewRecord {
    return {
      boardId: row.boardId,
      dataUrl: row.dataUrl,
      size: row.size,
      updatedAt: row.updatedAt,
      updatedByUserId: row.updatedByUserId ?? null
    }
  }

  const store: BoardPreviewStore = {
    async findPreview(boardId) {
      const row = await database.db
        .select()
        .from(boardPreviews)
        .where(eq(boardPreviews.boardId, boardId))
        .get()
      return row ? rowToRecord(row) : null
    },
    async listPreviewsForBoardIds(boardIds) {
      if (boardIds.length === 0) return []
      const rows = await database.db
        .select()
        .from(boardPreviews)
        .where(inArray(boardPreviews.boardId, boardIds))
        .all()
      return rows.map(rowToRecord)
    },
    async upsertPreview(input) {
      const updatedAt = now()
      const size = input.dataUrl.length

      await database.db
        .insert(boardPreviews)
        .values({
          boardId: input.boardId,
          dataUrl: input.dataUrl,
          size,
          updatedAt,
          updatedByUserId: input.updatedByUserId
        })
        .onConflictDoUpdate({
          target: boardPreviews.boardId,
          set: {
            dataUrl: input.dataUrl,
            size,
            updatedAt,
            updatedByUserId: input.updatedByUserId
          }
        })
        .run()

      return {
        boardId: input.boardId,
        dataUrl: input.dataUrl,
        size,
        updatedAt,
        updatedByUserId: input.updatedByUserId
      }
    },
    async deletePreview(boardId) {
      await database.db.delete(boardPreviews).where(eq(boardPreviews.boardId, boardId)).run()
    }
  }

  return store
}
