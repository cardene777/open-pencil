import { and, desc, eq, lt } from 'drizzle-orm'

import type { ApiDatabase } from './db/client.js'
import { createMigratedApiDatabase } from './db/migrate.js'
import { boardDocumentVersions } from './db/schema.js'
import type {
  BoardDocumentVersionRecord,
  BoardDocumentVersionStore,
  CreateBoardDocumentVersionInput
} from './types.js'

async function createInMemoryDatabase() {
  return createMigratedApiDatabase({ mode: 'memory' })
}

export interface CreateBoardDocumentVersionStoreOptions {
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
  state: string
  size: number
  createdAt: number
  label: string | null
}): BoardDocumentVersionRecord {
  return {
    id: row.id,
    boardId: row.boardId,
    state: decodeBytes(row.state),
    size: row.size,
    createdAt: row.createdAt,
    label: row.label ?? null
  }
}

export async function createBoardDocumentVersionStore(
  options: CreateBoardDocumentVersionStoreOptions = {}
): Promise<BoardDocumentVersionStore> {
  const database = options.database ?? (await createInMemoryDatabase())
  const now = options.now ?? Date.now
  const randomId = options.randomId ?? (() => crypto.randomUUID())

  const store: BoardDocumentVersionStore = {
    async createVersion(input: CreateBoardDocumentVersionInput) {
      const record: BoardDocumentVersionRecord = {
        id: randomId(),
        boardId: input.boardId,
        state: input.state,
        size: input.state.length,
        createdAt: now(),
        label: input.label
      }

      await database.db
        .insert(boardDocumentVersions)
        .values({
          id: record.id,
          boardId: record.boardId,
          state: encodeBytes(record.state),
          size: record.size,
          createdAt: record.createdAt,
          label: record.label
        })
        .run()

      return record
    },
    async listVersionsForBoard(boardId, limit = 100) {
      const rows = await database.db
        .select()
        .from(boardDocumentVersions)
        .where(eq(boardDocumentVersions.boardId, boardId))
        .orderBy(desc(boardDocumentVersions.createdAt))
        .limit(limit)
        .all()
      return rows.map(rowToRecord)
    },
    async findLatestVersion(boardId) {
      const row = await database.db
        .select()
        .from(boardDocumentVersions)
        .where(eq(boardDocumentVersions.boardId, boardId))
        .orderBy(desc(boardDocumentVersions.createdAt))
        .limit(1)
        .get()
      return row ? rowToRecord(row) : null
    },
    async pruneOldVersions(boardId, keepCount) {
      const cutoff = await database.db
        .select({ createdAt: boardDocumentVersions.createdAt })
        .from(boardDocumentVersions)
        .where(eq(boardDocumentVersions.boardId, boardId))
        .orderBy(desc(boardDocumentVersions.createdAt))
        .limit(1)
        .offset(keepCount)
        .get()

      if (!cutoff) return 0

      const result = await database.db
        .delete(boardDocumentVersions)
        .where(
          and(
            eq(boardDocumentVersions.boardId, boardId),
            lt(boardDocumentVersions.createdAt, cutoff.createdAt + 1)
          )
        )
        .run()
      return Number(result.rowsAffected)
    }
  }

  return store
}
