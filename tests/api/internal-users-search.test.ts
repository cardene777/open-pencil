import { describe, expect, test } from 'bun:test'

import { users } from '#api/db/schema'
import { createInternalUserStore } from '#api/internalUserStore'
import { createTestApiDatabase } from '#tests/helpers/api'

async function seedInternalUser(
  database: Awaited<ReturnType<typeof createTestApiDatabase>>,
  input: {
    id?: string
    name: string
    email: string
    withInternalRecord?: boolean
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
  if (input.withInternalRecord !== false) {
    await store.upsertInternalUser({ email: input.email, userId })
  }

  return { store, userId }
}

describe('internal user prefix search', () => {
  test('matches email prefix and sorts by email', async () => {
    const database = await createTestApiDatabase()
    const store = await createInternalUserStore({ database })

    await seedInternalUser(database, { name: 'Alice', email: 'alice@jfet.co.jp' })
    await seedInternalUser(database, { name: 'Alex', email: 'alex@jfet.co.jp' })
    await seedInternalUser(database, { name: 'Bob', email: 'bob@jfet.co.jp' })

    const results = await store.searchInternalUsersByPrefix('al')

    expect(results.map((user) => user.email)).toEqual(['alex@jfet.co.jp', 'alice@jfet.co.jp'])
    database.close()
  })

  test('matches name prefix', async () => {
    const database = await createTestApiDatabase()
    const store = await createInternalUserStore({ database })

    await seedInternalUser(database, { name: 'Alice Smith', email: 'alice@jfet.co.jp' })
    await seedInternalUser(database, { name: 'Alex Jones', email: 'alex@jfet.co.jp' })
    await seedInternalUser(database, { name: 'Bob Brown', email: 'bob@jfet.co.jp' })

    const results = await store.searchInternalUsersByPrefix('Al')

    expect(results).toHaveLength(2)
    expect(results.map((user) => user.name)).toEqual(['Alex Jones', 'Alice Smith'])
    database.close()
  })

  test('matches case-insensitively', async () => {
    const database = await createTestApiDatabase()
    const store = await createInternalUserStore({ database })

    await seedInternalUser(database, { name: 'Alice Smith', email: 'alice@jfet.co.jp' })

    const results = await store.searchInternalUsersByPrefix('ALICE')

    expect(results.map((user) => user.email)).toEqual(['alice@jfet.co.jp'])
    database.close()
  })

  test('applies default and explicit limits', async () => {
    const database = await createTestApiDatabase()
    const store = await createInternalUserStore({ database })

    for (let index = 0; index < 30; index += 1) {
      await seedInternalUser(database, {
        name: `Alpha ${index}`,
        email: `alpha-${String(index).padStart(2, '0')}@jfet.co.jp`
      })
    }

    const defaultResults = await store.searchInternalUsersByPrefix('alpha')
    const limitedResults = await store.searchInternalUsersByPrefix('alpha', 5)

    expect(defaultResults).toHaveLength(20)
    expect(limitedResults).toHaveLength(5)
    database.close()
  })

  test('excludes records without userId', async () => {
    const database = await createTestApiDatabase()
    const store = await createInternalUserStore({ database })

    await seedInternalUser(database, { name: 'Alice Smith', email: 'alice@jfet.co.jp' })
    await store.upsertInternalUser({ email: 'alice-pending@jfet.co.jp' })

    const results = await store.searchInternalUsersByPrefix('alice')

    expect(results.map((user) => user.email)).toEqual(['alice@jfet.co.jp'])
    database.close()
  })
})
