import { desc, eq, inArray } from 'drizzle-orm'

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
      // 古い経路は cutoff = (keepCount 個飛ばし行の createdAt) を読み、 削除条件
      // を `createdAt <= cutoff` にしていたが、 連続 createVersion で createdAt が
      // 同 ms になると cutoff が他行と被り、 削除条件が「keep したい行も含めて全削除」
      // に振れる flaky 経路があった (test: "version store keeps history and prunes
      // old snapshots" がランダム fail する原因)。
      // 新経路 ... 「最新 keepCount 個の id 集合を読む → それ以外の id を `not in` で
      // 削除」 に変更し、 同 ms 衝突に依らず確定的に keepCount 件残す。 drizzle に
      // `notInArray` がないので、 keep 対象を `inArray` で集めて id !== それで判定する
      // 一段別 query 構成で代替する。
      const keepRows = await database.db
        .select({ id: boardDocumentVersions.id })
        .from(boardDocumentVersions)
        .where(eq(boardDocumentVersions.boardId, boardId))
        .orderBy(desc(boardDocumentVersions.createdAt), desc(boardDocumentVersions.id))
        .limit(keepCount)
        .all()

      const allRows = await database.db
        .select({ id: boardDocumentVersions.id })
        .from(boardDocumentVersions)
        .where(eq(boardDocumentVersions.boardId, boardId))
        .all()

      const keepIds = new Set(keepRows.map((row) => row.id))
      const idsToDelete = allRows.map((row) => row.id).filter((id) => !keepIds.has(id))
      if (idsToDelete.length === 0) return 0

      const result = await database.db
        .delete(boardDocumentVersions)
        .where(inArray(boardDocumentVersions.id, idsToDelete))
        .run()
      return Number(result.rowsAffected)
    }
  }

  return store
}
