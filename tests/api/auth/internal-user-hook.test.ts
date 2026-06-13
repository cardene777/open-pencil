import { describe, expect, test } from 'bun:test'

import { createInklyAuth } from '../../../packages/api/src/auth/index.js'
import { createInternalUserStore } from '../../../packages/api/src/internalUserStore.js'
import { createTestApiDatabase, TEST_API_SECRET } from '../../helpers/api.js'

describe('better-auth user.create.after hook', () => {
  test('upserts internal_users record when jfet.co.jp user signs up', async () => {
    const database = await createTestApiDatabase()
    const internalUserStore = await createInternalUserStore({ database })

    const auth = createInklyAuth({
      database,
      fallbackSecret: TEST_API_SECRET,
      internalUserStore,
      env: {
        INKLY_API_BETTER_AUTH_BASE_URL: 'http://localhost:3001'
      } as NodeJS.ProcessEnv
    })

    if (!auth.signUpWithEmail) {
      throw new Error('signUpWithEmail not configured in test build')
    }

    const result = await auth.signUpWithEmail({
      email: 'alice@jfet.co.jp',
      password: 'password-1234',
      name: 'Alice JFET'
    })

    expect(result.email).toBe('alice@jfet.co.jp')

    const internalRecord = await internalUserStore.findInternalUserByEmail('alice@jfet.co.jp')
    expect(internalRecord).not.toBeNull()
    expect(internalRecord?.userId).toBe(result.userId)

    database.close()
  })

  test('does NOT create internal_users record for non-jfet domain sign-up', async () => {
    const database = await createTestApiDatabase()
    const internalUserStore = await createInternalUserStore({ database })

    const auth = createInklyAuth({
      database,
      fallbackSecret: TEST_API_SECRET,
      internalUserStore,
      env: {
        INKLY_API_BETTER_AUTH_BASE_URL: 'http://localhost:3001'
      } as NodeJS.ProcessEnv
    })

    if (!auth.signUpWithEmail) {
      throw new Error('signUpWithEmail not configured in test build')
    }

    await auth.signUpWithEmail({
      email: 'external@example.com',
      password: 'password-1234',
      name: 'External User'
    })

    expect(await internalUserStore.findInternalUserByEmail('external@example.com')).toBeNull()
    expect(await internalUserStore.listInternalUsers()).toHaveLength(0)

    database.close()
  })
})
