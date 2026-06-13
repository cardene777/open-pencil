import { and, asc, eq, gt } from 'drizzle-orm'

import type { ApiDatabase } from './db/client.js'
import { createMigratedApiDatabase } from './db/migrate.js'
import { invitations } from './db/schema.js'
import type { CreateInvitationInput, InvitationRecord, InvitationStore } from './types.js'

export interface CreateInvitationStoreOptions {
  database?: ApiDatabase
  now?: () => number
}

function cloneInvitation(record: InvitationRecord): InvitationRecord {
  return structuredClone(record)
}

function mapInvitation(row: typeof invitations.$inferSelect): InvitationRecord {
  return {
    id: row.id,
    boardId: row.boardId,
    sentToEmailHash: row.sentToEmailHash,
    role: row.role,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    revoked: row.revoked,
    jti: row.jti,
    token: row.token
  }
}

async function createInMemoryDatabase() {
  return await createMigratedApiDatabase({ mode: 'memory' })
}

export async function createInvitationStore(
  options: CreateInvitationStoreOptions = {}
): Promise<InvitationStore> {
  const database = options.database ?? (await createInMemoryDatabase())
  const now = options.now ?? Date.now

  const store: InvitationStore = {
    async createInvitation(input: CreateInvitationInput) {
      // 同じ board + 同じ受信者 (sentToEmailHash 一致) の既存 active 招待を全て revoke する。
      // これがないと「再送した招待リンク」と「以前送った招待リンク」の両方が有効になり、
      // dashboard 上で同じ user が複数招待済み user として表示されたり、 古いリンクが
      // 失効まで生き続けて share UI に古い候補が残る原因になる。
      // 同 board に限定 (他 board の同 email 招待は別人 owner の管理範囲なので触らない)。
      await database.db
        .update(invitations)
        .set({ revoked: true })
        .where(
          and(
            eq(invitations.boardId, input.boardId),
            eq(invitations.sentToEmailHash, input.sentToEmailHash),
            eq(invitations.revoked, false)
          )
        )
        .run()

      const record: InvitationRecord = {
        id: crypto.randomUUID(),
        boardId: input.boardId,
        sentToEmailHash: input.sentToEmailHash,
        role: input.role,
        createdAt: now(),
        expiresAt: input.expiresAt,
        revoked: false,
        jti: crypto.randomUUID(),
        token: null
      }

      await database.db.insert(invitations).values(record).run()
      return cloneInvitation(record)
    },
    async findInvitation(id: string) {
      const row = await database.db.select().from(invitations).where(eq(invitations.id, id)).get()
      return row ? cloneInvitation(mapInvitation(row)) : null
    },
    async listInvitationsByBoardId(boardId: string) {
      const rows = await database.db
        .select()
        .from(invitations)
        .where(eq(invitations.boardId, boardId))
        .orderBy(asc(invitations.createdAt))
        .all()

      return rows.map((row) => cloneInvitation(mapInvitation(row)))
    },
    async attachInvitationToken(id: string, token: string) {
      await database.db
        .update(invitations)
        .set({ token })
        .where(eq(invitations.id, id))
        .run()

      return await store.findInvitation(id)
    },
    async revokeInvitation(id: string) {
      await database.db
        .update(invitations)
        .set({ revoked: true })
        .where(eq(invitations.id, id))
        .run()

      return await store.findInvitation(id)
    },
    async hasActiveInvitationForEmailHash(emailHash: string, currentTime: number) {
      const row = await database.db
        .select({ id: invitations.id })
        .from(invitations)
        .where(
          and(
            eq(invitations.sentToEmailHash, emailHash),
            eq(invitations.revoked, false),
            gt(invitations.expiresAt, currentTime)
          )
        )
        .limit(1)
        .get()
      return Boolean(row)
    }
  }

  return store
}
