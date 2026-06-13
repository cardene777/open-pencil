import { and, eq } from 'drizzle-orm'

import type { ApiDatabase } from './db/client.js'
import { createMigratedApiDatabase } from './db/migrate.js'
import { boardPins } from './db/schema.js'
import type { BoardPinStore } from './types.js'

async function createInMemoryDatabase() {
  return createMigratedApiDatabase({ mode: 'memory' })
}

export interface CreateBoardPinStoreOptions {
  database?: ApiDatabase
  now?: () => number
}

export async function createBoardPinStore(
  options: CreateBoardPinStoreOptions = {}
): Promise<BoardPinStore> {
  const database = options.database ?? (await createInMemoryDatabase())
  const now = options.now ?? Date.now

  const store: BoardPinStore = {
    async listPinnedBoardIdsForUser(userId) {
      const rows = await database.db
        .select({ boardId: boardPins.boardId, pinnedAt: boardPins.pinnedAt })
        .from(boardPins)
        .where(eq(boardPins.userId, userId))
        .all()
      return rows.sort((a, b) => b.pinnedAt - a.pinnedAt).map((row) => row.boardId)
    },
    async pinBoard(userId, boardId) {
      const existing = await database.db
        .select()
        .from(boardPins)
        .where(and(eq(boardPins.userId, userId), eq(boardPins.boardId, boardId)))
        .get()
      if (existing) return false

      await database.db
        .insert(boardPins)
        .values({ userId, boardId, pinnedAt: now() })
        .onConflictDoNothing()
        .run()
      return true
    },
    async unpinBoard(userId, boardId) {
      const result = await database.db
        .delete(boardPins)
        .where(and(eq(boardPins.userId, userId), eq(boardPins.boardId, boardId)))
        .run()
      return Number(result.rowsAffected) > 0
    },
    async isPinned(userId, boardId) {
      const row = await database.db
        .select({ boardId: boardPins.boardId })
        .from(boardPins)
        .where(and(eq(boardPins.userId, userId), eq(boardPins.boardId, boardId)))
        .get()
      return !!row
    }
  }

  return store
}
