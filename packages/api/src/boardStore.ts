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

function mapCollaborator(row: typeof collaborators.$inferSelect): BoardCollaboratorRecord {
  return {
    anonymousId: row.anonymousId,
    userId: row.userId,
    role: row.role,
    addedAt: row.addedAt,
    invitationId: row.invitationId
  }
}

function createRecordMapper(database: ApiDatabase) {
  return async function mapBoard(row: typeof boards.$inferSelect): Promise<BoardRecord> {
    const collaboratorRows = await database.db
      .select()
      .from(collaborators)
      .where(eq(collaborators.boardId, row.id))
      .orderBy(asc(collaborators.addedAt))
      .all()

    return {
      id: row.id,
      name: row.name,
      creatorAnonymousId: row.creatorAnonymousId,
      creatorUserId: row.creatorUserId,
      startFrameId: row.startFrameId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      collaborators: collaboratorRows.map(mapCollaborator)
    }
  }
}

async function createInMemoryDatabase() {
  return createMigratedApiDatabase({ mode: 'memory' })
}

async function mapBoardRows(
  database: ApiDatabase,
  rows: Array<
    Pick<
      typeof boards.$inferSelect,
      | 'id'
      | 'name'
      | 'creatorAnonymousId'
      | 'creatorUserId'
      | 'startFrameId'
      | 'createdAt'
      | 'updatedAt'
    >
  >
): Promise<BoardRecord[]> {
  if (rows.length === 0) return []

  const collaboratorRows = await database.db
    .select()
    .from(collaborators)
    .where(
      inArray(
        collaborators.boardId,
        rows.map((row) => row.id)
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

  return rows.map((row) =>
    structuredClone({
      id: row.id,
      name: row.name,
      creatorAnonymousId: row.creatorAnonymousId,
      creatorUserId: row.creatorUserId,
      startFrameId: row.startFrameId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      collaborators: collaboratorsByBoardId.get(row.id) ?? []
    })
  )
}

function validateCreateBoardInput(input: CreateBoardInput) {
  const creatorAnonymousId = input.creatorAnonymousId?.trim() ?? ''
  const creatorUserId = input.creatorUserId?.trim() ?? ''

  if (!creatorAnonymousId && !creatorUserId) {
    throw new Error('Board creator is required')
  }

  return {
    creatorAnonymousId,
    creatorUserId: creatorUserId || null
  }
}

export async function createBoardStore(options: CreateBoardStoreOptions = {}): Promise<BoardStore> {
  const database = options.database ?? (await createInMemoryDatabase())
  const now = options.now ?? Date.now
  const mapBoard = createRecordMapper(database)

  const store: BoardStore = {
    async createBoard(input: CreateBoardInput) {
      const createdAt = now()
      const id = crypto.randomUUID()
      const { creatorAnonymousId, creatorUserId } = validateCreateBoardInput(input)

      await database.db.transaction(async (tx) => {
        await tx
          .insert(boards)
          .values({
            id,
            name: input.name,
            creatorAnonymousId,
            creatorUserId,
            createdAt,
            updatedAt: createdAt
          })
          .run()

        if (creatorAnonymousId) {
          await tx
            .insert(collaborators)
            .values({
              boardId: id,
              anonymousId: creatorAnonymousId,
              userId: creatorUserId,
              role: 'owner',
              addedAt: createdAt,
              invitationId: null
            })
            .run()
        }
      })

      const record = await store.findBoard(id)
      if (!record) throw new Error(`Failed to create board ${id}`)
      return record
    },
    async findBoard(id: string) {
      const row = await database.db.select().from(boards).where(eq(boards.id, id)).get()
      return row ? structuredClone(await mapBoard(row)) : null
    },
    async listBoardsForAnonymous(anonymousId: string) {
      const boardRows = await database.db
        .selectDistinct({
          id: boards.id,
          name: boards.name,
          creatorAnonymousId: boards.creatorAnonymousId,
          creatorUserId: boards.creatorUserId,
          startFrameId: boards.startFrameId,
          createdAt: boards.createdAt,
          updatedAt: boards.updatedAt
        })
        .from(boards)
        .leftJoin(collaborators, eq(boards.id, collaborators.boardId))
        .where(
          or(eq(boards.creatorAnonymousId, anonymousId), eq(collaborators.anonymousId, anonymousId))
        )
        .orderBy(desc(boards.updatedAt))
        .all()

      return mapBoardRows(database, boardRows)
    },
    async listBoardsForUser(userId: string) {
      // 1) creator として作った board (boards.creatorUserId = userId)
      // 2) collaborator として userId が紐付いている board (collaborators.userId = userId)
      // の和集合を listing する。 これで招待 redeem で collaborator 化された
      // logged-in user の board も /boards 一覧に出る。
      // listBoardsForAnonymous と同じ selectDistinct + LEFT JOIN 形式で統一。
      const boardRows = await database.db
        .selectDistinct({
          id: boards.id,
          name: boards.name,
          creatorAnonymousId: boards.creatorAnonymousId,
          creatorUserId: boards.creatorUserId,
          startFrameId: boards.startFrameId,
          createdAt: boards.createdAt,
          updatedAt: boards.updatedAt
        })
        .from(boards)
        .leftJoin(collaborators, eq(boards.id, collaborators.boardId))
        .where(or(eq(boards.creatorUserId, userId), eq(collaborators.userId, userId)))
        .orderBy(desc(boards.updatedAt))
        .all()

      return mapBoardRows(database, boardRows)
    },
    async deleteBoard(id: string) {
      const record = await store.findBoard(id)
      if (!record) return null
      await database.db.delete(boards).where(eq(boards.id, id)).run()
      return structuredClone(record)
    },
    async addCollaborator(boardId: string, input: AddBoardCollaboratorInput) {
      const board = await store.findBoard(boardId)
      if (!board) return null
      const updatedAt = now()

      await database.db.transaction(async (tx) => {
        await tx
          .insert(collaborators)
          .values({
            boardId,
            anonymousId: input.anonymousId,
            userId: input.userId ?? null,
            role: input.role,
            addedAt: updatedAt,
            invitationId: input.invitationId
          })
          .onConflictDoUpdate({
            target: [collaborators.boardId, collaborators.anonymousId],
            set: {
              role: input.role,
              invitationId: input.invitationId,
              userId: input.userId ?? null
            }
          })
          .run()

        await tx.update(boards).set({ updatedAt }).where(eq(boards.id, boardId)).run()
      })

      const record = await store.findBoard(boardId)
      return record ? structuredClone(record) : null
    },
    async updateBoardStartFrame(id: string, startFrameId: string | null) {
      const board = await store.findBoard(id)
      if (!board) return null

      await database.db
        .update(boards)
        .set({
          startFrameId,
          updatedAt: now()
        })
        .where(eq(boards.id, id))
        .run()

      const record = await store.findBoard(id)
      return record ? structuredClone(record) : null
    }
  }

  return store
}
