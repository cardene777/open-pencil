import { and, asc, eq } from 'drizzle-orm'

import type { ApiDatabase } from './db/client.js'
import { createMigratedApiDatabase } from './db/migrate.js'
import { boards, pages } from './db/schema.js'
import type { PageRecord, PageStore } from './types.js'

export interface CreatePageStoreOptions {
  database?: ApiDatabase
  now?: () => number
}

function clonePage(record: PageRecord): PageRecord {
  return structuredClone(record)
}

function mapPage(row: typeof pages.$inferSelect): PageRecord {
  return {
    id: row.id,
    boardId: row.boardId,
    name: row.name,
    content: row.content,
    position: row.position,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }
}

async function createInMemoryDatabase() {
  return await createMigratedApiDatabase({ mode: 'memory' })
}

export async function createPageStore(options: CreatePageStoreOptions = {}): Promise<PageStore> {
  const database = options.database ?? (await createInMemoryDatabase())
  const now = options.now ?? Date.now

  const store: PageStore = {
    async listPagesForBoard(boardId: string) {
      const rows = await database.db
        .select()
        .from(pages)
        .where(eq(pages.boardId, boardId))
        .orderBy(asc(pages.position), asc(pages.createdAt))
        .all()

      // migration 0009 以前に作成された board は page 0 件のため、
      // 初回アクセス時に Sheet 1 を遡及自動生成する (lazy migration)。
      if (rows.length === 0) {
        const boardExists = await database.db
          .select({ id: boards.id })
          .from(boards)
          .where(eq(boards.id, boardId))
          .get()
        if (!boardExists) return []

        const seeded = await store.createPage({
          boardId,
          name: 'Sheet 1',
          position: 0
        })
        return [seeded]
      }

      return rows.map((row) => clonePage(mapPage(row)))
    },
    async findPage(pageId: string) {
      const row = await database.db.select().from(pages).where(eq(pages.id, pageId)).get()
      return row ? clonePage(mapPage(row)) : null
    },
    async createPage(input) {
      const createdAt = now()
      const id = crypto.randomUUID()

      await database.db.transaction(async (tx) => {
        await tx
          .insert(pages)
          .values({
            id,
            boardId: input.boardId,
            name: input.name,
            content: null,
            position: input.position,
            createdAt,
            updatedAt: createdAt
          })
          .run()

        await tx.update(boards).set({ updatedAt: createdAt }).where(eq(boards.id, input.boardId)).run()
      })

      const page = await store.findPage(id)
      if (!page) throw new Error(`Failed to create page ${id}`)
      return page
    },
    async updatePage(pageId, input) {
      const record = await store.findPage(pageId)
      if (!record) return null

      const updatedAt = now()
      await database.db.transaction(async (tx) => {
        await tx
          .update(pages)
          .set({
            name: input.name?.trim() || record.name,
            position: input.position ?? record.position,
            updatedAt
          })
          .where(eq(pages.id, pageId))
          .run()

        await tx.update(boards).set({ updatedAt }).where(eq(boards.id, record.boardId)).run()
      })

      const updated = await store.findPage(pageId)
      return updated ? clonePage(updated) : null
    },
    async deletePage(pageId) {
      const record = await store.findPage(pageId)
      if (!record) return

      await database.db.transaction(async (tx) => {
        await tx.delete(pages).where(eq(pages.id, pageId)).run()
        await tx.update(boards).set({ updatedAt: now() }).where(eq(boards.id, record.boardId)).run()
      })
    },
    async getPageContent(pageId) {
      const row = await database.db
        .select({
          content: pages.content,
          updatedAt: pages.updatedAt
        })
        .from(pages)
        .where(eq(pages.id, pageId))
        .get()

      return row
        ? {
            content: row.content,
            updatedAt: row.updatedAt
          }
        : null
    },
    async savePageContent(pageId, content) {
      const updatedAt = now()
      const page = await store.findPage(pageId)
      if (!page) return

      await database.db.transaction(async (tx) => {
        await tx
          .update(pages)
          .set({
            content,
            updatedAt
          })
          .where(and(eq(pages.id, pageId), eq(pages.boardId, page.boardId)))
          .run()

        await tx.update(boards).set({ updatedAt }).where(eq(boards.id, page.boardId)).run()
      })
    }
  }

  return store
}
