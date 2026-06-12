import { describe, expect, test } from 'bun:test'

import type { InklyAuth, InklyAuthSession } from '../../packages/api/src/auth/index.js'
import { createBoardStore } from '../../packages/api/src/boardStore.js'
import { createInternalUserStore } from '../../packages/api/src/internalUserStore.js'
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
      name: 'Owner',
      email,
      emailVerified: true,
      image: null,
      createdAt: new Date('2029-01-01T00:00:00.000Z').toISOString(),
      updatedAt: new Date('2029-01-01T00:00:00.000Z').toISOString()
    }
  }
}

describe('POST /api/boards/:id/share', () => {
  test('directly adds collaborator when sharing to existing jfet user', async () => {
    const database = await createTestApiDatabase()
    const { userId: ownerUserId, boardId } = await seedUserAndBoard(database, {
      userEmail: 'owner@jfet.co.jp'
    })

    const boardStore = await createBoardStore({ database })
    // share 対象の logged-in jfet user を internal_users に upsert
    const internalUserStore = await createInternalUserStore({ database })
    const { userId: targetUserId } = await seedUserAndBoard(database, {
      userEmail: 'target@jfet.co.jp'
    })
    await internalUserStore.upsertInternalUser({ email: 'target@jfet.co.jp', userId: targetUserId })

    const pendingInternalInvitationStore = await createPendingInternalInvitationStore({ database })

    const { app, database: appDb } = await createTestApiApp({
      secret: TEST_API_SECRET,
      database,
      auth: buildMockSessionAuth(buildSession(ownerUserId, 'owner@jfet.co.jp')),
      boardStore,
      internalUserStore,
      pendingInternalInvitationStore
    })

    const response = await app.request(`/api/boards/${boardId}/share`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ emails: ['target@jfet.co.jp'], role: 'editor' })
    })

    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      added: { email: string; userId: string }[]
      pending: { email: string }[]
      rejected: { email: string; reason: string }[]
    }
    expect(body.added).toEqual([{ email: 'target@jfet.co.jp', userId: targetUserId }])
    expect(body.pending).toEqual([])
    expect(body.rejected).toEqual([])

    const board = await boardStore.findBoard(boardId)
    const collaborator = board?.collaborators.find((c) => c.userId === targetUserId)
    expect(collaborator).toBeDefined()
    expect(collaborator?.role).toBe('editor')
    expect(collaborator?.anonymousId).toBe(`internal:${targetUserId}`)

    appDb.close()
  })

  test('pre-records pending invitation for unknown jfet user (not signed up yet)', async () => {
    const database = await createTestApiDatabase()
    const { userId: ownerUserId, boardId } = await seedUserAndBoard(database, {
      userEmail: 'owner2@jfet.co.jp'
    })
    const internalUserStore = await createInternalUserStore({ database })
    const pendingInternalInvitationStore = await createPendingInternalInvitationStore({ database })

    const { app, database: appDb } = await createTestApiApp({
      secret: TEST_API_SECRET,
      database,
      auth: buildMockSessionAuth(buildSession(ownerUserId, 'owner2@jfet.co.jp')),
      internalUserStore,
      pendingInternalInvitationStore
    })

    const response = await app.request(`/api/boards/${boardId}/share`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ emails: ['newcomer@jfet.co.jp'], role: 'viewer' })
    })

    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      added: { email: string }[]
      pending: { email: string }[]
      rejected: { email: string }[]
    }
    expect(body.added).toEqual([])
    expect(body.pending).toEqual([{ email: 'newcomer@jfet.co.jp' }])
    expect(body.rejected).toEqual([])

    const pendingList = await pendingInternalInvitationStore.listPendingByEmail(
      'newcomer@jfet.co.jp'
    )
    expect(pendingList).toHaveLength(1)
    expect(pendingList[0]?.role).toBe('viewer')

    appDb.close()
  })

  test('rejects non-jfet domain email in share endpoint', async () => {
    const database = await createTestApiDatabase()
    const { userId: ownerUserId, boardId } = await seedUserAndBoard(database, {
      userEmail: 'owner3@jfet.co.jp'
    })

    const { app, database: appDb } = await createTestApiApp({
      secret: TEST_API_SECRET,
      database,
      auth: buildMockSessionAuth(buildSession(ownerUserId, 'owner3@jfet.co.jp'))
    })

    const response = await app.request(`/api/boards/${boardId}/share`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ emails: ['external@example.com'], role: 'editor' })
    })

    expect(response.status).toBe(200)
    const body = (await response.json()) as {
      added: unknown[]
      pending: unknown[]
      rejected: { email: string; reason: string }[]
    }
    expect(body.added).toEqual([])
    expect(body.pending).toEqual([])
    expect(body.rejected).toEqual([{ email: 'external@example.com', reason: 'non_internal_domain' }])

    appDb.close()
  })

  test('forbids share by non-owner', async () => {
    const database = await createTestApiDatabase()
    const { boardId } = await seedUserAndBoard(database, {
      userEmail: 'owner4@jfet.co.jp'
    })

    // 別人が share を試みる
    const strangerUserId = 'stranger-user-id'
    const { app, database: appDb } = await createTestApiApp({
      secret: TEST_API_SECRET,
      database,
      auth: buildMockSessionAuth(buildSession(strangerUserId, 'stranger@jfet.co.jp'))
    })

    const response = await app.request(`/api/boards/${boardId}/share`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ emails: ['target@jfet.co.jp'], role: 'editor' })
    })

    expect(response.status).toBe(403)

    appDb.close()
  })
})
