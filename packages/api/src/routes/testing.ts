import { eq, inArray } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'

import type { ApiDatabase } from '../db/client.js'
import {
  accounts,
  boards,
  collaborators,
  internalUsers,
  invitations,
  notifications,
  pendingInternalInvitations,
  sessions,
  users
} from '../db/schema.js'
import { hashInvitationEmail } from '../token.js'
import type {
  BoardStore,
  InvitationStore,
  NotificationStore,
  UserRecord
} from '../types.js'

const LOCALHOST_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])
const TEST_TIME_BASE = Date.parse('2026-01-01T12:00:00.000Z')
const TEST_TIME_STEP_MS = 60_000
const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000

let timestampSequence = 0

export const seedUserSchema = z.object({
  id: z.string().trim().min(1).optional(),
  email: z.string().trim().email(),
  name: z.string().trim().min(1).max(120),
  image: z.string().trim().url().nullable().optional()
})

const seedBoardOwnerSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('anonymous'),
    anonymousId: z.string().trim().min(1)
  }),
  z.object({
    kind: z.literal('user'),
    user: seedUserSchema
  })
])

const seedBoardsSchema = z.object({
  count: z.number().int().min(0).max(20),
  names: z.array(z.string().trim().min(1).max(120)).optional(),
  owner: seedBoardOwnerSchema
})

const invitationNotificationSchema = z.object({
  type: z.literal('invitation'),
  read: z.boolean().default(false),
  payload: z.object({
    invitationId: z.string().trim().min(1),
    boardId: z.string().trim().min(1),
    boardName: z.string().trim().min(1),
    role: z.enum(['editor', 'viewer']),
    inviterDisplayName: z.string().trim().min(1),
    inviteeEmail: z.string().trim().email(),
    url: z.string().trim().min(1)
  })
})

const mentionNotificationSchema = z.object({
  type: z.literal('mention'),
  read: z.boolean().default(false),
  payload: z.object({
    boardId: z.string().trim().min(1),
    boardName: z.string().trim().min(1),
    mentionedByDisplayName: z.string().trim().min(1),
    message: z.string().trim().min(1).max(4000),
    url: z.string().trim().min(1)
  })
})

const seedNotificationsSchema = z.object({
  user: seedUserSchema,
  items: z
    .array(z.discriminatedUnion('type', [invitationNotificationSchema, mentionNotificationSchema]))
    .min(0)
    .max(20)
})

const seedInvitationsSchema = z.object({
  boardId: z.string().trim().min(1),
  items: z
    .array(
      z.object({
        email: z.string().trim().email(),
        role: z.enum(['editor', 'viewer']).default('editor'),
        expiresInMs: z.number().int().optional()
      })
    )
    .min(0)
    .max(20)
})

// 既存 users 行を internalUsers として登録 (test の異 user share flow 用)。
// users 側に該当 email が無ければ silent skip。
const seedInternalUsersSchema = z.object({
  items: z
    .array(
      z.object({
        email: z.string().trim().email()
      })
    )
    .min(0)
    .max(20)
})

export interface TestingRoutesOptions {
  enabled: boolean
  database: ApiDatabase
  boardStore: BoardStore
  invitationStore: InvitationStore
  notificationStore: NotificationStore
}

function isLocalhostRequest(requestUrl: string) {
  const url = new URL(requestUrl)
  return LOCALHOST_HOSTNAMES.has(url.hostname)
}

function testingUnavailable() {
  return Response.json(
    {
      error: {
        code: 'not_found',
        message: 'Test helpers are not enabled'
      }
    },
    { status: 404 }
  )
}

function ensureTestingRequest(options: TestingRoutesOptions, requestUrl: string) {
  if (!options.enabled) return testingUnavailable()
  if (!isLocalhostRequest(requestUrl)) {
    return Response.json(
      {
        error: {
          code: 'forbidden',
          message: 'Test helpers are only available from localhost'
        }
      },
      { status: 403 }
    )
  }

  return null
}

async function resetDatabase(database: ApiDatabase) {
  timestampSequence = 0
  await database.db.transaction(async (tx) => {
    await tx.delete(notifications).run()
    await tx.delete(pendingInternalInvitations).run()
    await tx.delete(internalUsers).run()
    await tx.delete(sessions).run()
    await tx.delete(accounts).run()
    await tx.delete(collaborators).run()
    await tx.delete(invitations).run()
    await tx.delete(boards).run()
    await tx.delete(users).run()
  })
}

function nextTimestamp() {
  const timestamp = TEST_TIME_BASE + timestampSequence * TEST_TIME_STEP_MS
  timestampSequence += 1
  return timestamp
}

async function applyBoardTimestamp(database: ApiDatabase, boardId: string, timestamp: number) {
  await database.db
    .update(boards)
    .set({
      createdAt: timestamp,
      updatedAt: timestamp
    })
    .where(eq(boards.id, boardId))
    .run()

  await database.db
    .update(collaborators)
    .set({ addedAt: timestamp })
    .where(eq(collaborators.boardId, boardId))
    .run()
}

async function applyNotificationTimestamp(
  database: ApiDatabase,
  notificationId: string,
  createdAt: number,
  readAt: number | null
) {
  await database.db
    .update(notifications)
    .set({
      createdAt,
      readAt
    })
    .where(eq(notifications.id, notificationId))
    .run()
}

export async function upsertUser(
  database: ApiDatabase,
  input: z.infer<typeof seedUserSchema>
): Promise<UserRecord> {
  const email = input.email.trim().toLowerCase()
  const now = Date.now()
  const image = input.image ?? null
  const candidateId = input.id ?? crypto.randomUUID()

  await database.db
    .insert(users)
    .values({
      id: candidateId,
      name: input.name,
      email,
      image,
      emailVerified: true,
      createdAt: new Date(now),
      updatedAt: new Date(now)
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        name: input.name,
        image,
        emailVerified: true,
        updatedAt: new Date(now)
      }
    })
    .run()

  const persisted = await database.db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .get()

  if (!persisted) {
    throw new Error(`upsertUser: failed to persist user for email=${email}`)
  }

  return {
    id: persisted.id,
    name: input.name,
    email,
    image
  }
}

async function seedBoards(options: TestingRoutesOptions, input: z.infer<typeof seedBoardsSchema>) {
  const names = Array.from({ length: input.count }, (_, index) =>
    input.names?.[index] || `Visual Board ${index + 1}`
  )

  const owner =
    input.owner.kind === 'user' ? await upsertUser(options.database, input.owner.user) : null

  const result = []
  for (const [index, name] of names.entries()) {
    const createdAt = nextTimestamp() + index
    const board = await options.boardStore.createBoard({
      name,
      creatorAnonymousId: owner ? '' : input.owner.anonymousId,
      creatorUserId: owner?.id ?? null
    })
    await applyBoardTimestamp(options.database, board.id, createdAt)
    const refreshed = await options.boardStore.findBoard(board.id)
    if (refreshed) result.push(refreshed)
  }

  return result
}

async function seedNotifications(
  options: TestingRoutesOptions,
  input: z.infer<typeof seedNotificationsSchema>
) {
  const user = await upsertUser(options.database, input.user)
  const created = []

  for (const item of input.items) {
    const notification = await options.notificationStore.createNotification({
      userId: user.id,
      type: item.type,
      payload: item.payload
    })
    const createdAt = nextTimestamp()
    const readAt = item.read ? createdAt + 30_000 : null
    await applyNotificationTimestamp(options.database, notification.id, createdAt, readAt)
    const refreshed = await options.notificationStore.findNotification(notification.id)
    if (refreshed) created.push(refreshed)
  }

  return created
}

async function seedInternalUsers(
  options: TestingRoutesOptions,
  input: z.infer<typeof seedInternalUsersSchema>
) {
  if (input.items.length === 0) return []

  const emails = Array.from(new Set(input.items.map((item) => item.email.toLowerCase())))

  // 1 batch read で users と既存 internalUsers をまとめて引く (serial DB lookup の回避)。
  const userRows = await options.database.db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(inArray(users.email, emails))
    .all()
  const userIdByEmail = new Map(userRows.map((row) => [row.email.toLowerCase(), row.id]))

  const internalRows = await options.database.db
    .select()
    .from(internalUsers)
    .where(inArray(internalUsers.email, emails))
    .all()
  const internalByEmail = new Map(internalRows.map((row) => [row.email.toLowerCase(), row]))

  const created: { id: string; email: string; userId: string | null; addedAt: number }[] = []

  for (const email of emails) {
    const userId = userIdByEmail.get(email)
    // users 未登録なら internal user として登録できない (caller が mockGoogleLogin
    // を先に呼ぶこと)。 silent skip。
    if (!userId) continue

    const existing = internalByEmail.get(email)

    if (existing) {
      // 既存 row の userId が null / stale なら relinking する (review MAJOR fix)。
      // null や別 userId だと /api/boards/{id}/share が immediate collaborator 化
      // しないため、 seed endpoint の意味が失われる。
      if (existing.userId !== userId) {
        await options.database.db
          .update(internalUsers)
          .set({ userId })
          .where(eq(internalUsers.id, existing.id))
          .run()
        created.push({
          id: existing.id,
          email: existing.email,
          userId,
          addedAt: existing.addedAt
        })
      } else {
        created.push({
          id: existing.id,
          email: existing.email,
          userId: existing.userId,
          addedAt: existing.addedAt
        })
      }
      continue
    }

    const addedAt = nextTimestamp()
    const id = `internal-${email}-${addedAt}`
    await options.database.db
      .insert(internalUsers)
      .values({ id, email, userId, addedAt })
      .run()

    created.push({ id, email, userId, addedAt })
  }

  return created
}

async function seedInvitations(
  options: TestingRoutesOptions,
  input: z.infer<typeof seedInvitationsSchema>
) {
  const created = []
  const issuedAt = nextTimestamp()

  for (const [index, item] of input.items.entries()) {
    const sentToEmailHash = await hashInvitationEmail(item.email)
    const invitation = await options.invitationStore.createInvitation({
      boardId: input.boardId,
      sentToEmailHash,
      role: item.role,
      expiresAt: issuedAt + (item.expiresInMs ?? INVITATION_TTL_MS) + index
    })
    created.push(invitation)
  }

  return created
}

export function createTestingRoutes(options: TestingRoutesOptions): Hono {
  const app = new Hono()

  app.post('/reset', async (c) => {
    const guard = ensureTestingRequest(options, c.req.url)
    if (guard) return guard

    await resetDatabase(options.database)
    return c.json({ ok: true })
  })

  app.post('/seed/boards', async (c) => {
    const guard = ensureTestingRequest(options, c.req.url)
    if (guard) return guard

    const body = await c.req.json().catch(() => ({}))
    const parsed = seedBoardsSchema.safeParse(body)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message ?? 'Invalid request body'
      return c.json({ error: { code: 'invalid_request_body', message: issue } }, 400)
    }

    return c.json({ boards: await seedBoards(options, parsed.data) })
  })

  app.post('/seed/notifications', async (c) => {
    const guard = ensureTestingRequest(options, c.req.url)
    if (guard) return guard

    const body = await c.req.json().catch(() => ({}))
    const parsed = seedNotificationsSchema.safeParse(body)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message ?? 'Invalid request body'
      return c.json({ error: { code: 'invalid_request_body', message: issue } }, 400)
    }

    return c.json({ notifications: await seedNotifications(options, parsed.data) })
  })

  app.post('/seed/invitations', async (c) => {
    const guard = ensureTestingRequest(options, c.req.url)
    if (guard) return guard

    const body = await c.req.json().catch(() => ({}))
    const parsed = seedInvitationsSchema.safeParse(body)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message ?? 'Invalid request body'
      return c.json({ error: { code: 'invalid_request_body', message: issue } }, 400)
    }

    return c.json({ invitations: await seedInvitations(options, parsed.data) })
  })

  app.post('/seed/internal-users', async (c) => {
    const guard = ensureTestingRequest(options, c.req.url)
    if (guard) return guard

    const body = await c.req.json().catch(() => ({}))
    const parsed = seedInternalUsersSchema.safeParse(body)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]?.message ?? 'Invalid request body'
      return c.json({ error: { code: 'invalid_request_body', message: issue } }, 400)
    }

    return c.json({ internalUsers: await seedInternalUsers(options, parsed.data) })
  })

  return app
}
