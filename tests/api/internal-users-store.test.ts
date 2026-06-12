import { describe, expect, test } from 'bun:test'

import { users } from '../../packages/api/src/db/schema.js'
import { createInternalUserStore } from '../../packages/api/src/internalUserStore.js'
import { createTestApiDatabase } from '../helpers/api.js'

describe('internal user store', () => {
  test('upserts jfet.co.jp domain user and creates record', async () => {
    const database = await createTestApiDatabase()
    const userId = 'user-alice'
    const now = Date.now()
    await database.db
      .insert(users)
      .values({
        id: userId,
        name: 'Alice',
        email: 'alice@jfet.co.jp',
        emailVerified: false,
        image: null,
        createdAt: new Date(now),
        updatedAt: new Date(now)
      })
      .run()

    const store = await createInternalUserStore({ database })
    const record = await store.upsertInternalUser({
      email: 'alice@jfet.co.jp',
      userId
    })

    expect(record).not.toBeNull()
    expect(record?.email).toBe('alice@jfet.co.jp')
    expect(record?.userId).toBe(userId)
    expect(record?.id).toMatch(/^[0-9a-f-]{36}$/i)
    if (!record) {
      throw new Error('Expected internal user record')
    }

    const found = await store.findInternalUserByEmail('alice@jfet.co.jp')
    expect(found?.id).toBe(record.id)
    database.close()
  })

  test('rejects non-jfet domain email and returns null', async () => {
    const database = await createTestApiDatabase()
    const store = await createInternalUserStore({ database })
    const record = await store.upsertInternalUser({
      email: 'external@gmail.com',
      userId: 'user-external'
    })

    expect(record).toBeNull()
    expect(await store.findInternalUserByEmail('external@gmail.com')).toBeNull()
    expect(await store.listInternalUsers()).toHaveLength(0)
    database.close()
  })
})
