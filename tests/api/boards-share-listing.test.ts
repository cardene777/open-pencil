import { describe, expect, test } from 'bun:test'

import type { InklyAuth, InklyAuthSession } from '../../packages/api/src/auth/index.js'
import { createBoardStore } from '../../packages/api/src/boardStore.js'
import { createInternalUserStore } from '../../packages/api/src/internalUserStore.js'
import { createNotificationStore } from '../../packages/api/src/notificationStore.js'
import { createPendingInternalInvitationStore } from '../../packages/api/src/pendingInternalInvitationStore.js'
import { createTestApiApp, createTestApiDatabase, TEST_API_SECRET } from '../helpers/api.js'
import { seedUserAndBoard } from '../helpers/seed-board-and-user.js'

function buildMockSessionAuth(session: InklyAuthSession): InklyAuth {
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
      name: 'Tester',
      email,
      emailVerified: true,
      image: null,
      createdAt: new Date('2029-01-01T00:00:00.000Z').toISOString(),
      updatedAt: new Date('2029-01-01T00:00:00.000Z').toISOString()
    }
  }
}

describe('GET /api/boards after sharing — invitee perspective', () => {
  test('shared board appears in invitee /boards listing', async () => {
    // 1) owner と board を seed する
    const database = await createTestApiDatabase()
    const { userId: ownerUserId, boardId } = await seedUserAndBoard(database, {
      userEmail: 'owner-listing@jfet.co.jp'
    })

    // 2) invitee も user として seed し internal_users に登録する
    const { userId: inviteeUserId } = await seedUserAndBoard(database, {
      userEmail: 'invitee-listing@jfet.co.jp'
    })

    const boardStore = await createBoardStore({ database })
    const internalUserStore = await createInternalUserStore({ database })
    await internalUserStore.upsertInternalUser({
      email: 'invitee-listing@jfet.co.jp',
      userId: inviteeUserId
    })
    const pendingInternalInvitationStore = await createPendingInternalInvitationStore({ database })
    const notificationStore = await createNotificationStore({ database })

    // 3) owner が share API で invitee を board に直接 collaborator 化する
    const { app: ownerApp, database: ownerAppDb } = await createTestApiApp({
      secret: TEST_API_SECRET,
      database,
      auth: buildMockSessionAuth(buildSession(ownerUserId, 'owner-listing@jfet.co.jp')),
      boardStore,
      internalUserStore,
      pendingInternalInvitationStore,
      notificationStore
    })

    const shareResponse = await ownerApp.request(`/api/boards/${boardId}/share`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ emails: ['invitee-listing@jfet.co.jp'], role: 'editor' })
    })
    expect(shareResponse.status).toBe(200)

    // 4) board.collaborators が invitee.userId を含んでいる
    const board = await boardStore.findBoard(boardId)
    const inviteeCollaborator = board?.collaborators.find((c) => c.userId === inviteeUserId)
    expect(inviteeCollaborator).toBeDefined()
    expect(inviteeCollaborator?.role).toBe('editor')

    // 5) invitee session で /api/boards を叩くと board が listing に含まれる
    const { app: inviteeApp, database: inviteeAppDb } = await createTestApiApp({
      secret: TEST_API_SECRET,
      database,
      auth: buildMockSessionAuth(buildSession(inviteeUserId, 'invitee-listing@jfet.co.jp')),
      boardStore
    })

    const listResponse = await inviteeApp.request('/api/boards')
    expect(listResponse.status).toBe(200)
    const listBody = (await listResponse.json()) as {
      boards: { id: string; name: string; collaborators: { userId: string | null }[] }[]
    }
    const matched = listBody.boards.find((b) => b.id === boardId)
    expect(matched).toBeDefined()
    expect(matched?.collaborators.some((c) => c.userId === inviteeUserId)).toBe(true)

    ownerAppDb.close()
    inviteeAppDb.close()
  })
})
