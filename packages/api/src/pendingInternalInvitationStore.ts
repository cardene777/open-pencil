import { asc, eq } from 'drizzle-orm'

import type { ApiDatabase } from './db/client.js'
import { createMigratedApiDatabase } from './db/migrate.js'
import { pendingInternalInvitations } from './db/schema.js'
import type {
  CreatePendingInternalInvitationInput,
  PendingInternalInvitationRecord,
  PendingInternalInvitationStore
} from './types.js'

export interface CreatePendingInternalInvitationStoreOptions {
  database?: ApiDatabase
}

async function createInMemoryDatabase() {
  return await createMigratedApiDatabase({ mode: 'memory' })
}

function clonePendingInvitation(
  record: PendingInternalInvitationRecord
): PendingInternalInvitationRecord {
  return structuredClone(record)
}

function mapPendingInvitation(
  row: typeof pendingInternalInvitations.$inferSelect
): PendingInternalInvitationRecord {
  return {
    id: row.id,
    boardId: row.boardId,
    email: row.email,
    role: row.role,
    invitedByUserId: row.invitedByUserId,
    createdAt: row.createdAt
  }
}

export async function createPendingInternalInvitationStore(
  options: CreatePendingInternalInvitationStoreOptions = {}
): Promise<PendingInternalInvitationStore> {
  const database = options.database ?? (await createInMemoryDatabase())

  const store: PendingInternalInvitationStore = {
    async createPendingInvitation(input: CreatePendingInternalInvitationInput) {
      const record: PendingInternalInvitationRecord = {
        id: crypto.randomUUID(),
        boardId: input.boardId,
        email: input.email.trim().toLowerCase(),
        role: input.role,
        invitedByUserId: input.invitedByUserId,
        createdAt: Date.now()
      }

      await database.db.insert(pendingInternalInvitations).values(record).run()
      return clonePendingInvitation(record)
    },
    async listPendingByEmail(email: string) {
      const normalizedEmail = email.trim().toLowerCase()
      const rows = await database.db
        .select()
        .from(pendingInternalInvitations)
        .where(eq(pendingInternalInvitations.email, normalizedEmail))
        .orderBy(asc(pendingInternalInvitations.createdAt))
        .all()

      return rows.map((row) => clonePendingInvitation(mapPendingInvitation(row)))
    },
    async deletePendingByEmail(email: string) {
      const normalizedEmail = email.trim().toLowerCase()
      const result = await database.db
        .delete(pendingInternalInvitations)
        .where(eq(pendingInternalInvitations.email, normalizedEmail))
        .run()

      return result.rowsAffected
    }
  }

  return store
}
