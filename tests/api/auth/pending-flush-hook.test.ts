import { describe, expect, test } from 'bun:test'

import { createInklyAuth } from '../../../packages/api/src/auth/index.js'
import { createBoardStore } from '../../../packages/api/src/boardStore.js'
import { createInternalUserStore } from '../../../packages/api/src/internalUserStore.js'
import { createPendingInternalInvitationStore } from '../../../packages/api/src/pendingInternalInvitationStore.js'
import { createTestApiDatabase, TEST_API_SECRET } from '../../helpers/api.js'
import { seedUserAndBoard } from '../../helpers/seed-board-and-user.js'

describe('pending invitation flush hook', () => {
  test('flushes pending invitations to collaborators on jfet user sign-up', async () => {
    const database = await createTestApiDatabase()
    const internalUserStore = await createInternalUserStore({ database })
    const pendingInternalInvitationStore = await createPendingInternalInvitationStore({ database })
    const boardStore = await createBoardStore({ database })

    // 招待を発行する側 (board owner) を seed
    const { userId: ownerUserId, boardId } = await seedUserAndBoard(database, {
      userEmail: 'owner@jfet.co.jp'
    })

    // pending を 1 件登録 (まだ collaborator になっていない jfet user 宛て)
    await pendingInternalInvitationStore.createPendingInvitation({
      boardId,
      email: 'newcomer@jfet.co.jp',
      role: 'editor',
      invitedByUserId: ownerUserId
    })

    const auth = createInklyAuth({
      database,
      fallbackSecret: TEST_API_SECRET,
      internalUserStore,
      pendingInternalInvitationStore,
      boardStore,
      env: {
        INKLY_API_BETTER_AUTH_BASE_URL: 'http://localhost:3001'
      } as NodeJS.ProcessEnv
    })

    if (!auth.signUpWithEmail) {
      throw new Error('signUpWithEmail not configured in test build')
    }

    // newcomer が sign-up すると hook が走り pending を消化する
    const result = await auth.signUpWithEmail({
      email: 'newcomer@jfet.co.jp',
      password: 'password-1234',
      name: 'Newcomer JFET'
    })

    expect(result.email).toBe('newcomer@jfet.co.jp')

    // pending が空になり、 board の collaborator に転記されていることを確認
    const remaining = await pendingInternalInvitationStore.listPendingByEmail('newcomer@jfet.co.jp')
    expect(remaining).toHaveLength(0)

    const board = await boardStore.findBoard(boardId)
    expect(board).not.toBeNull()
    const collaborator = board?.collaborators.find((c) => c.userId === result.userId)
    expect(collaborator).toBeDefined()
    expect(collaborator?.role).toBe('editor')
    expect(collaborator?.anonymousId).toBe(`internal:${result.userId}`)

    database.close()
  })

  test('does not flush for non-jfet domain user', async () => {
    const database = await createTestApiDatabase()
    const internalUserStore = await createInternalUserStore({ database })
    const pendingInternalInvitationStore = await createPendingInternalInvitationStore({ database })
    const boardStore = await createBoardStore({ database })

    const { userId: ownerUserId, boardId } = await seedUserAndBoard(database, {
      userEmail: 'owner2@jfet.co.jp'
    })

    // 非 jfet domain への pending は本来作られないが、 防御的に外部 user の
    // pending が存在しても hook がそれを消化しないことを test する。
    await pendingInternalInvitationStore.createPendingInvitation({
      boardId,
      email: 'external@example.com',
      role: 'viewer',
      invitedByUserId: ownerUserId
    })

    const auth = createInklyAuth({
      database,
      fallbackSecret: TEST_API_SECRET,
      internalUserStore,
      pendingInternalInvitationStore,
      boardStore,
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

    // 非 jfet domain なので pending は残ったまま
    const remaining = await pendingInternalInvitationStore.listPendingByEmail('external@example.com')
    expect(remaining).toHaveLength(1)

    database.close()
  })
})
