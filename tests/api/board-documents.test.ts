import { describe, expect, test } from 'bun:test'

import type { InklyAuth, InklyAuthSession } from '../../packages/api/src/auth/index.js'
import { createBoardDocumentStore } from '../../packages/api/src/boardDocumentStore.js'
import { createBoardStore } from '../../packages/api/src/boardStore.js'
import { createInternalUserStore } from '../../packages/api/src/internalUserStore.js'
import { createNotificationStore } from '../../packages/api/src/notificationStore.js'
import { createPendingInternalInvitationStore } from '../../packages/api/src/pendingInternalInvitationStore.js'
import { createTestApiApp, createTestApiDatabase, TEST_API_SECRET } from '../helpers/api.js'
import { seedUserAndBoard } from '../helpers/seed-board-and-user.js'

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
      name: 'Tester',
      email,
      emailVerified: true,
      image: null,
      createdAt: new Date('2029-01-01T00:00:00.000Z').toISOString(),
      updatedAt: new Date('2029-01-01T00:00:00.000Z').toISOString()
    }
  }
}

describe('board document SSOT (DB-backed)', () => {
  test('owner can PUT and GET the document blob', async () => {
    const database = await createTestApiDatabase()
    const { userId: ownerUserId, boardId } = await seedUserAndBoard(database, {
      userEmail: 'owner-doc@jfet.co.jp'
    })
    const boardStore = await createBoardStore({ database })
    const boardDocumentStore = await createBoardDocumentStore({ database })

    const { app, database: appDb } = await createTestApiApp({
      secret: TEST_API_SECRET,
      database,
      auth: buildMockSessionAuth(buildSession(ownerUserId, 'owner-doc@jfet.co.jp')),
      boardStore,
      boardDocumentStore
    })

    const payload = new Uint8Array([0x66, 0x69, 0x67, 0x01, 0x02, 0x03])

    const putResponse = await app.request(`/api/boards/${boardId}/document`, {
      method: 'PUT',
      headers: { 'content-type': 'application/octet-stream' },
      body: payload
    })
    expect(putResponse.status).toBe(200)

    const getResponse = await app.request(`/api/boards/${boardId}/document`)
    expect(getResponse.status).toBe(200)
    const bytes = new Uint8Array(await getResponse.arrayBuffer())
    expect(Array.from(bytes)).toEqual(Array.from(payload))
    expect(getResponse.headers.get('content-type')).toBe('application/octet-stream')

    appDb.close()
  })

  test('collaborator with userId can GET document after being shared', async () => {
    const database = await createTestApiDatabase()
    const { userId: ownerUserId, boardId } = await seedUserAndBoard(database, {
      userEmail: 'owner-share-doc@jfet.co.jp'
    })
    const { userId: inviteeUserId } = await seedUserAndBoard(database, {
      userEmail: 'invitee-share-doc@jfet.co.jp'
    })
    const boardStore = await createBoardStore({ database })
    const boardDocumentStore = await createBoardDocumentStore({ database })
    const internalUserStore = await createInternalUserStore({ database })
    await internalUserStore.upsertInternalUser({
      email: 'invitee-share-doc@jfet.co.jp',
      userId: inviteeUserId
    })
    const pendingInternalInvitationStore = await createPendingInternalInvitationStore({ database })
    const notificationStore = await createNotificationStore({ database })

    // owner: share + PUT document
    const { app: ownerApp, database: ownerAppDb } = await createTestApiApp({
      secret: TEST_API_SECRET,
      database,
      auth: buildMockSessionAuth(buildSession(ownerUserId, 'owner-share-doc@jfet.co.jp')),
      boardStore,
      boardDocumentStore,
      internalUserStore,
      pendingInternalInvitationStore,
      notificationStore
    })

    await ownerApp.request(`/api/boards/${boardId}/share`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ emails: ['invitee-share-doc@jfet.co.jp'], role: 'editor' })
    })

    const payload = new Uint8Array([1, 2, 3, 4, 5])
    await ownerApp.request(`/api/boards/${boardId}/document`, {
      method: 'PUT',
      headers: { 'content-type': 'application/octet-stream' },
      body: payload
    })

    // invitee: 同じ board の document を GET
    const { app: inviteeApp, database: inviteeAppDb } = await createTestApiApp({
      secret: TEST_API_SECRET,
      database,
      auth: buildMockSessionAuth(buildSession(inviteeUserId, 'invitee-share-doc@jfet.co.jp')),
      boardStore,
      boardDocumentStore
    })

    const getResponse = await inviteeApp.request(`/api/boards/${boardId}/document`)
    expect(getResponse.status).toBe(200)
    const bytes = new Uint8Array(await getResponse.arrayBuffer())
    expect(Array.from(bytes)).toEqual(Array.from(payload))

    ownerAppDb.close()
    inviteeAppDb.close()
  })

  test('non-collaborator cannot GET document', async () => {
    const database = await createTestApiDatabase()
    const { userId: ownerUserId, boardId } = await seedUserAndBoard(database, {
      userEmail: 'owner-private-doc@jfet.co.jp'
    })
    const { userId: outsiderUserId } = await seedUserAndBoard(database, {
      userEmail: 'outsider@external.test'
    })
    const boardStore = await createBoardStore({ database })
    const boardDocumentStore = await createBoardDocumentStore({ database })

    // PUT as owner
    const { app: ownerApp, database: ownerAppDb } = await createTestApiApp({
      secret: TEST_API_SECRET,
      database,
      auth: buildMockSessionAuth(buildSession(ownerUserId, 'owner-private-doc@jfet.co.jp')),
      boardStore,
      boardDocumentStore
    })
    await ownerApp.request(`/api/boards/${boardId}/document`, {
      method: 'PUT',
      headers: { 'content-type': 'application/octet-stream' },
      body: new Uint8Array([9, 9, 9])
    })

    // GET as outsider
    const { app: outsiderApp, database: outsiderAppDb } = await createTestApiApp({
      secret: TEST_API_SECRET,
      database,
      auth: buildMockSessionAuth(buildSession(outsiderUserId, 'outsider@external.test')),
      boardStore,
      boardDocumentStore
    })

    const response = await outsiderApp.request(`/api/boards/${boardId}/document`)
    expect(response.status).toBe(403)

    ownerAppDb.close()
    outsiderAppDb.close()
  })
})
