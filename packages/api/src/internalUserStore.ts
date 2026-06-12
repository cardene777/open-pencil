import { and, asc, eq, isNotNull, or, sql } from 'drizzle-orm'

import type { ApiDatabase } from './db/client.js'
import { createMigratedApiDatabase } from './db/migrate.js'
import { internalUsers, users } from './db/schema.js'
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
  return createMigratedApiDatabase({ mode: 'memory' })
}

function mapInternalUser(row: typeof internalUsers.$inferSelect): InternalUserRecord {
  return {
    id: row.id,
    email: row.email,
    userId: row.userId,
    addedAt: row.addedAt
  }
}

function escapeLikePattern(value: string) {
  return value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')
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

      return store.findInternalUserByEmail(normalizedEmail)
    },
    async findInternalUserByEmail(email: string) {
      const normalizedEmail = email.trim().toLowerCase()
      const row = await database.db
        .select()
        .from(internalUsers)
        .where(eq(internalUsers.email, normalizedEmail))
        .get()

      return row ? structuredClone(mapInternalUser(row)) : null
    },
    async findInternalUserByUserId(userId: string) {
      const row = await database.db
        .select()
        .from(internalUsers)
        .where(eq(internalUsers.userId, userId))
        .get()

      return row ? structuredClone(mapInternalUser(row)) : null
    },
    async listInternalUsers() {
      const rows = await database.db
        .select()
        .from(internalUsers)
        .orderBy(asc(internalUsers.email))
        .all()

      return rows.map((row) => structuredClone(mapInternalUser(row)))
    },
    async searchInternalUsersByPrefix(query: string, limit = 20) {
      const normalizedQuery = query.trim().toLowerCase()
      if (!normalizedQuery) return []

      const escapedQuery = `${escapeLikePattern(normalizedQuery)}%`
      const maxResults = Math.min(Math.max(limit, 1), 50)
      const rows = await database.db
        .select({
          id: users.id,
          name: users.name,
          email: users.email
        })
        .from(internalUsers)
        .innerJoin(users, eq(users.id, internalUsers.userId))
        .where(
          and(
            isNotNull(internalUsers.userId),
            or(
              sql`${users.email} LIKE ${escapedQuery} ESCAPE '\\' COLLATE NOCASE`,
              sql`${users.name} LIKE ${escapedQuery} ESCAPE '\\' COLLATE NOCASE`
            )
          )
        )
        .orderBy(asc(users.email))
        .limit(maxResults)
        .all()

      return rows.map((row) =>
        structuredClone({
          id: row.id,
          name: row.name,
          email: row.email
        })
      )
    }
  }

  return store
}
