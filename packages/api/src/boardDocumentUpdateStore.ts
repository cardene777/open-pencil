import { and, asc, eq, gt, lt, sql } from 'drizzle-orm'

import type { ApiDatabase } from './db/client.js'
import { createMigratedApiDatabase } from './db/migrate.js'
import { boardDocumentUpdates } from './db/schema.js'
import type {
  AppendBoardDocumentUpdateInput,
  BoardDocumentUpdateRecord,
  BoardDocumentUpdateStore
} from './types.js'

async function createInMemoryDatabase() {
  return createMigratedApiDatabase({ mode: 'memory' })
}

export interface CreateBoardDocumentUpdateStoreOptions {
  database?: ApiDatabase
  now?: () => number
  randomId?: () => string
}

function encodeBytes(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64')
}

function decodeBytes(encoded: string): Uint8Array {
  return new Uint8Array(Buffer.from(encoded, 'base64'))
}

function rowToRecord(row: {
  id: string
  boardId: string
  update: string
  size: number
  createdAt: number
  createdByUserId: string | null
}): BoardDocumentUpdateRecord {
  return {
    id: row.id,
    boardId: row.boardId,
    update: decodeBytes(row.update),
    size: row.size,
    createdAt: row.createdAt,
    createdByUserId: row.createdByUserId ?? null
  }
}

export async function createBoardDocumentUpdateStore(
  options: CreateBoardDocumentUpdateStoreOptions = {}
): Promise<BoardDocumentUpdateStore> {
  const database = options.database ?? (await createInMemoryDatabase())
  const now = options.now ?? Date.now
  const randomId = options.randomId ?? (() => crypto.randomUUID())

  const store: BoardDocumentUpdateStore = {
    async appendUpdate(input: AppendBoardDocumentUpdateInput) {
      const record: BoardDocumentUpdateRecord = {
        id: randomId(),
        boardId: input.boardId,
        update: input.update,
        size: input.update.length,
        createdAt: now(),
        createdByUserId: input.createdByUserId
      }

      await database.db
        .insert(boardDocumentUpdates)
        .values({
          id: record.id,
          boardId: record.boardId,
          update: encodeBytes(record.update),
          size: record.size,
          createdAt: record.createdAt,
          createdByUserId: record.createdByUserId
        })
        .run()

      return record
    },
    async listUpdatesSince(boardId, sinceCreatedAt) {
      const rows = await database.db
        .select()
        .from(boardDocumentUpdates)
        .where(
          and(
            eq(boardDocumentUpdates.boardId, boardId),
            gt(boardDocumentUpdates.createdAt, sinceCreatedAt)
          )
        )
        .orderBy(asc(boardDocumentUpdates.createdAt))
        .all()
      return rows.map(rowToRecord)
    },
    async countUpdatesForBoard(boardId) {
      const row = await database.db
        .select({ value: sql<number>`count(*)` })
        .from(boardDocumentUpdates)
        .where(eq(boardDocumentUpdates.boardId, boardId))
        .get()
      return Number(row?.value ?? 0)
    },
    async deleteUpdatesOlderThan(boardId, beforeCreatedAt) {
      const result = await database.db
        .delete(boardDocumentUpdates)
        .where(
          and(
            eq(boardDocumentUpdates.boardId, boardId),
            lt(boardDocumentUpdates.createdAt, beforeCreatedAt)
          )
        )
        .run()
      return Number(result.rowsAffected)
    }
  }

  return store
}
