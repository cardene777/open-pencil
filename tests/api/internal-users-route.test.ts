import { describe, expect, test } from 'bun:test'

import type { InklyAuth, InklyAuthSession } from '#api/auth/index'
import { users } from '#api/db/schema'
import { createInternalUserStore } from '#api/internalUserStore'
import { TEST_API_SECRET, createTestApiApp, createTestApiDatabase } from '#tests/helpers/api'

function buildMockSessionAuth(session: InklyAuthSession | null): InklyAuth {
  return {
    async handler() {
      return Response.json({ error: { code: 'not_found', message: 'Not found' } }, { status: 404 })
    },
    async getSession() {
      return session
    }
  }
}

function buildSession(userId: string, email: string): InklyAuthSession {
  return {
    session: {
      id: `session-${userId}`,
      token: `token-${userId}`,
      userId,
      expiresAt: new Date('2030-01-01T00:00:00.000Z').toISOString(),
      createdAt: new Date('2029-01-01T00:00:00.000Z').toISOString(),
      updatedAt: new Date('2029-01-01T00:00:00.000Z').toISOString()
    },
    user: {
      id: userId,
      name: 'Requester',
      email,
      emailVerified: true,
      image: null,
      createdAt: new Date('2029-01-01T00:00:00.000Z').toISOString(),
      updatedAt: new Date('2029-01-01T00:00:00.000Z').toISOString()
    }
  }
}

async function seedInternalUser(
  database: Awaited<ReturnType<typeof createTestApiDatabase>>,
  input: {
    id?: string
    name: string
    email: string
  }
) {
  const now = Date.now()
  const userId = input.id ?? crypto.randomUUID()
  await database.db
    .insert(users)
    .values({
      id: userId,
      name: input.name,
      email: input.email,
      emailVerified: true,
      image: null,
      createdAt: new Date(now),
      updatedAt: new Date(now)
    })
    .run()

  const store = await createInternalUserStore({ database })
  await store.upsertInternalUser({ email: input.email, userId })
  return { userId }
}

describe('GET /api/internal-users', () => {
  test('returns prefix matches for logged-in jfet users', async () => {
    const database = await createTestApiDatabase()
    const internalUserStore = await createInternalUserStore({ database })
    await seedInternalUser(database, { name: 'Alice Smith', email: 'alice@jfet.co.jp' })
    await seedInternalUser(database, { name: 'Alex Jones', email: 'alex@jfet.co.jp' })

    const { app, database: appDb } = await createTestApiApp({
      secret: TEST_API_SECRET,
      database,
      auth: buildMockSessionAuth(buildSession('owner-user', 'owner@jfet.co.jp')),
      internalUserStore
    })

    const response = await app.request('/api/internal-users?q=al')

    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      users: Array<{ id: string; name: string; email: string }>
    }
    expect(body.users.map((user) => user.email)).toEqual(['alex@jfet.co.jp', 'alice@jfet.co.jp'])

    appDb.close()
  })

  test('forbids logged-in non-jfet users', async () => {
    const database = await createTestApiDatabase()
    const { app, database: appDb } = await createTestApiApp({
      secret: TEST_API_SECRET,
      database,
      auth: buildMockSessionAuth(buildSession('gmail-user', 'owner@gmail.com'))
    })

    const response = await app.request('/api/internal-users?q=al')

    expect(response.status).toBe(403)
    appDb.close()
  })

  test('rejects unauthenticated requests', async () => {
    const database = await createTestApiDatabase()
    const { app, database: appDb } = await createTestApiApp({
      secret: TEST_API_SECRET,
      database,
      auth: buildMockSessionAuth(null)
    })

    const response = await app.request('/api/internal-users?q=al')

    expect(response.status).toBe(401)
    appDb.close()
  })

  test('validates empty query', async () => {
    const database = await createTestApiDatabase()
    const { app, database: appDb } = await createTestApiApp({
      secret: TEST_API_SECRET,
      database,
      auth: buildMockSessionAuth(buildSession('owner-user', 'owner@jfet.co.jp'))
    })

    const response = await app.request('/api/internal-users?q=')

    expect(response.status).toBe(400)
    appDb.close()
  })

  test('validates query length', async () => {
    const database = await createTestApiDatabase()
    const { app, database: appDb } = await createTestApiApp({
      secret: TEST_API_SECRET,
      database,
      auth: buildMockSessionAuth(buildSession('owner-user', 'owner@jfet.co.jp'))
    })

    const response = await app.request(`/api/internal-users?q=${'a'.repeat(51)}`)

    expect(response.status).toBe(400)
    appDb.close()
  })
})
