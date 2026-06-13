import { eq } from 'drizzle-orm'

import type { ApiDatabase } from './db/client.js'
import { createMigratedApiDatabase } from './db/migrate.js'
import { boardDocuments } from './db/schema.js'
import type {
  BoardDocumentRecord,
  BoardDocumentStore,
  UpsertBoardDocumentInput
} from './types.js'

async function createInMemoryDatabase() {
  return createMigratedApiDatabase({ mode: 'memory' })
}

export interface CreateBoardDocumentStoreOptions {
  database?: ApiDatabase
  now?: () => number
}

function encodeBytes(bytes: Uint8Array): string {
  // bun は globalThis.Buffer を持つ。 Node 互換、 base64 で text 列に詰める。
  return Buffer.from(bytes).toString('base64')
}

function decodeBytes(encoded: string): Uint8Array {
  return new Uint8Array(Buffer.from(encoded, 'base64'))
}

export async function createBoardDocumentStore(
  options: CreateBoardDocumentStoreOptions = {}
): Promise<BoardDocumentStore> {
  const database = options.database ?? (await createInMemoryDatabase())
  const now = options.now ?? Date.now

  const store: BoardDocumentStore = {
    async findDocument(boardId) {
      const row = await database.db
        .select()
        .from(boardDocuments)
        .where(eq(boardDocuments.boardId, boardId))
        .get()

      if (!row) return null
      return {
        boardId: row.boardId,
        bytes: decodeBytes(row.bytes),
        size: row.size,
        updatedAt: row.updatedAt,
        updatedByUserId: row.updatedByUserId ?? null
      }
    },
    async upsertDocument(input) {
      const encoded = encodeBytes(input.bytes)
      const updatedAt = now()

      await database.db
        .insert(boardDocuments)
        .values({
          boardId: input.boardId,
          bytes: encoded,
          size: input.bytes.length,
          updatedAt,
          updatedByUserId: input.updatedByUserId
        })
        .onConflictDoUpdate({
          target: boardDocuments.boardId,
          set: {
            bytes: encoded,
            size: input.bytes.length,
            updatedAt,
            updatedByUserId: input.updatedByUserId
          }
        })
        .run()

      return {
        boardId: input.boardId,
        bytes: input.bytes,
        size: input.bytes.length,
        updatedAt,
        updatedByUserId: input.updatedByUserId
      }
    },
    async deleteDocument(boardId) {
      await database.db.delete(boardDocuments).where(eq(boardDocuments.boardId, boardId)).run()
    }
  }

  return store
}
