import { asc, desc, eq, inArray, or } from 'drizzle-orm'

import type { ApiDatabase } from './db/client.js'
import { createMigratedApiDatabase } from './db/migrate.js'
import { boards, collaborators } from './db/schema.js'
import type {
  AddBoardCollaboratorInput,
  BoardCollaboratorRecord,
  BoardRecord,
  BoardStore,
  CreateBoardInput
} from './types.js'

export interface CreateBoardStoreOptions {
  database?: ApiDatabase
  now?: () => number
}

function cloneBoard(record: BoardRecord): BoardRecord {
  return structuredClone(record)
}

function mapCollaborator(
  row: typeof collaborators.$inferSelect
): BoardCollaboratorRecord {
  return {
    anonymousId: row.anonymousId,
    role: row.role,
    addedAt: row.addedAt,
    invitationId: row.invitationId
  }
}

function createRecordMapper(database: ApiDatabase) {
  return function mapBoard(row: typeof boards.$inferSelect): BoardRecord {
    const collaboratorRows = database.db
      .select()
      .from(collaborators)
      .where(eq(collaborators.boardId, row.id))
      .orderBy(asc(collaborators.addedAt))
      .all()

    return {
      id: row.id,
      name: row.name,
      creatorAnonymousId: row.creatorAnonymousId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      collaborators: collaboratorRows.map(mapCollaborator)
    }
  }
}

function createInMemoryDatabase() {
  return createMigratedApiDatabase({ mode: 'memory' })
}

export function createBoardStore(options: CreateBoardStoreOptions = {}): BoardStore {
  const database = options.database ?? createInMemoryDatabase()
  const now = options.now ?? Date.now
  const mapBoard = createRecordMapper(database)

  return {
    createBoard(input: CreateBoardInput) {
      const createdAt = now()
      const id = crypto.randomUUID()

      database.db.transaction((tx) => {
        tx
          .insert(boards)
          .values({
            id,
            name: input.name,
            creatorAnonymousId: input.creatorAnonymousId,
            createdAt,
            updatedAt: createdAt
          })
          .run()

        tx
          .insert(collaborators)
          .values({
            boardId: id,
            anonymousId: input.creatorAnonymousId,
            role: 'owner',
            addedAt: createdAt,
            invitationId: null
          })
          .run()
      })

      const record = this.findBoard(id)
      if (!record) throw new Error(`Failed to create board ${id}`)
      return record
    },
    findBoard(id: string) {
      const row = database.db.select().from(boards).where(eq(boards.id, id)).get()
      return row ? cloneBoard(mapBoard(row)) : null
    },
    listBoardsForAnonymous(anonymousId: string) {
      const boardRows = database.db
        .selectDistinct({
          id: boards.id,
          name: boards.name,
          creatorAnonymousId: boards.creatorAnonymousId,
          createdAt: boards.createdAt,
          updatedAt: boards.updatedAt
        })
        .from(boards)
        .leftJoin(collaborators, eq(boards.id, collaborators.boardId))
        .where(
          or(
            eq(boards.creatorAnonymousId, anonymousId),
            eq(collaborators.anonymousId, anonymousId)
          )
        )
        .orderBy(desc(boards.updatedAt))
        .all()

      if (boardRows.length === 0) return []

      const collaboratorRows = database.db
        .select()
        .from(collaborators)
        .where(
          inArray(
            collaborators.boardId,
            boardRows.map((row) => row.id)
          )
        )
        .orderBy(asc(collaborators.addedAt))
        .all()

      const collaboratorsByBoardId = new Map<string, BoardCollaboratorRecord[]>()
      for (const collaborator of collaboratorRows) {
        const records = collaboratorsByBoardId.get(collaborator.boardId) ?? []
        records.push(mapCollaborator(collaborator))
        collaboratorsByBoardId.set(collaborator.boardId, records)
      }

      return boardRows.map((row) =>
        cloneBoard({
          id: row.id,
          name: row.name,
          creatorAnonymousId: row.creatorAnonymousId,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          collaborators: collaboratorsByBoardId.get(row.id) ?? []
        })
      )
    },
    deleteBoard(id: string) {
      const record = this.findBoard(id)
      if (!record) return null
      database.db.delete(boards).where(eq(boards.id, id)).run()
      return cloneBoard(record)
    },
    addCollaborator(boardId: string, input: AddBoardCollaboratorInput) {
      const board = this.findBoard(boardId)
      if (!board) return null
      const updatedAt = now()

      database.db.transaction((tx) => {
        tx
          .insert(collaborators)
          .values({
            boardId,
            anonymousId: input.anonymousId,
            role: input.role,
            addedAt: updatedAt,
            invitationId: input.invitationId
          })
          .onConflictDoUpdate({
            target: [collaborators.boardId, collaborators.anonymousId],
            set: {
              role: input.role,
              invitationId: input.invitationId
            }
          })
          .run()

        tx
          .update(boards)
          .set({ updatedAt })
          .where(eq(boards.id, boardId))
          .run()
      })

      const record = this.findBoard(boardId)
      return record ? cloneBoard(record) : null
    }
  }
}
