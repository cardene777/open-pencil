import { asc, eq } from 'drizzle-orm'

import type { ApiDatabase } from './db/client.js'
import { createMigratedApiDatabase } from './db/migrate.js'
import { internalUsers } from './db/schema.js'
import type {
  InternalUserRecord,
  InternalUserStore,
  UpsertInternalUserInput
} from './types.js'
import { isInternalDomainEmail } from './types.js'

export interface CreateInternalUserStoreOptions {
  database?: ApiDatabase
}

async function createInMemoryDatabase() {
  return await createMigratedApiDatabase({ mode: 'memory' })
}

function cloneInternalUser(record: InternalUserRecord): InternalUserRecord {
  return structuredClone(record)
}

function mapInternalUser(row: typeof internalUsers.$inferSelect): InternalUserRecord {
  return {
    id: row.id,
    email: row.email,
    userId: row.userId,
    addedAt: row.addedAt
  }
}

export async function createInternalUserStore(
  options: CreateInternalUserStoreOptions = {}
): Promise<InternalUserStore> {
  const database = options.database ?? (await createInMemoryDatabase())

  const store: InternalUserStore = {
    async upsertInternalUser({ email, userId = null }: UpsertInternalUserInput) {
      const normalizedEmail = email.trim().toLowerCase()
      if (!isInternalDomainEmail(normalizedEmail)) return null

      await database.db
        .insert(internalUsers)
        .values({
          id: crypto.randomUUID(),
          email: normalizedEmail,
          userId,
          addedAt: Date.now()
        })
        .onConflictDoUpdate({
          target: internalUsers.email,
          set: { userId }
        })
        .run()

      return await store.findInternalUserByEmail(normalizedEmail)
    },
    async findInternalUserByEmail(email: string) {
      const normalizedEmail = email.trim().toLowerCase()
      const row = await database.db
        .select()
        .from(internalUsers)
        .where(eq(internalUsers.email, normalizedEmail))
        .get()

      return row ? cloneInternalUser(mapInternalUser(row)) : null
    },
    async findInternalUserByUserId(userId: string) {
      const row = await database.db
        .select()
        .from(internalUsers)
        .where(eq(internalUsers.userId, userId))
        .get()

      return row ? cloneInternalUser(mapInternalUser(row)) : null
    },
    async listInternalUsers() {
      const rows = await database.db
        .select()
        .from(internalUsers)
        .orderBy(asc(internalUsers.email))
        .all()

      return rows.map((row) => cloneInternalUser(mapInternalUser(row)))
    }
  }

  return store
}
