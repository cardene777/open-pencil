import { describe, expect, test } from 'bun:test'

import { TEST_API_SECRET, createTestApiApp } from '../helpers/api.js'
import { TEST_USER_HEADER, createHeaderAuth, createSession, seedUsers } from '../helpers/api-auth.js'

describe('board routes', () => {
  test('creates, lists, and deletes boards by anonymous owner', async () => {
    const { app, database } = await createTestApiApp({ secret: TEST_API_SECRET })
    const createResponse = await app.request('/api/boards', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Product planning' })
    })

    expect(createResponse.status).toBe(201)
    const generatedAnonymousId = createResponse.headers.get('X-Inkly-Anonymous-Id')
    expect(generatedAnonymousId).toBeString()

    const createdBoard = (await createResponse.json()) as {
      id: string
      name: string
      creatorAnonymousId: string
      collaborators: Array<{ anonymousId: string; role: string }>
    }
    expect(createdBoard.name).toBe('Product planning')
    expect(createdBoard.creatorAnonymousId).toBe(generatedAnonymousId)
    expect(createdBoard.collaborators).toEqual([
      expect.objectContaining({
        anonymousId: generatedAnonymousId,
        role: 'owner'
      })
    ])

    const listResponse = await app.request('/api/boards', {
      headers: { 'X-Inkly-Anonymous-Id': generatedAnonymousId ?? '' }
    })
    expect(listResponse.status).toBe(200)
    expect(await listResponse.json()).toEqual({
      boards: [expect.objectContaining({ id: createdBoard.id, name: 'Product planning' })]
    })

    const deleteResponse = await app.request(`/api/boards/${createdBoard.id}`, {
      method: 'DELETE',
      headers: { 'X-Inkly-Anonymous-Id': generatedAnonymousId ?? '' }
    })
    expect(deleteResponse.status).toBe(200)
    expect(await deleteResponse.json()).toEqual({ deleted: true })
    database.close()
  })

  test('creates Sheet 1 automatically for a new board', async () => {
    const { app, database } = await createTestApiApp({ secret: TEST_API_SECRET })
    const createResponse = await app.request('/api/boards', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Budget board' })
    })

    expect(createResponse.status).toBe(201)
    const anonymousId = createResponse.headers.get('X-Inkly-Anonymous-Id') ?? ''
    const board = (await createResponse.json()) as { id: string }

    const pagesResponse = await app.request(`/api/boards/${board.id}/pages`, {
      headers: { 'X-Inkly-Anonymous-Id': anonymousId }
    })

    expect(pagesResponse.status).toBe(200)
    expect(await pagesResponse.json()).toEqual({
      pages: [
        expect.objectContaining({
          boardId: board.id,
          name: 'Sheet 1',
          position: 0,
          content: null
        })
      ]
    })
    database.close()
  })

  test('rejects delete and invitation listing for non-owners', async () => {
    const { app, database } = await createTestApiApp({ secret: TEST_API_SECRET })
    const ownerId = 'anon-owner'
    const createResponse = await app.request('/api/boards', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Inkly-Anonymous-Id': ownerId
      },
      body: JSON.stringify({ name: 'Marketing board' })
    })
    const board = (await createResponse.json()) as { id: string }

    const deleteResponse = await app.request(`/api/boards/${board.id}`, {
      method: 'DELETE',
      headers: { 'X-Inkly-Anonymous-Id': 'anon-stranger' }
    })
    expect(deleteResponse.status).toBe(403)

    const listInvitationsResponse = await app.request(`/api/boards/${board.id}/invitations`, {
      headers: { 'X-Inkly-Anonymous-Id': 'anon-stranger' }
    })
    expect(listInvitationsResponse.status).toBe(403)
    database.close()
  })

  test('updates board name for anonymous owner', async () => {
    const { app, database } = await createTestApiApp({ secret: TEST_API_SECRET })
    const anonymousId = 'anon-owner'
    const createResponse = await app.request('/api/boards', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Inkly-Anonymous-Id': anonymousId
      },
      body: JSON.stringify({ name: 'Old board name' })
    })
    expect(createResponse.status).toBe(201)
    const createdBoard = (await createResponse.json()) as { id: string }

    const updateResponse = await app.request(`/api/boards/${createdBoard.id}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'X-Inkly-Anonymous-Id': anonymousId
      },
      body: JSON.stringify({ name: 'New board name' })
    })

    expect(updateResponse.status).toBe(200)
    expect(await updateResponse.json()).toEqual(
      expect.objectContaining({
        id: createdBoard.id,
        name: 'New board name'
      })
    )

    const listResponse = await app.request('/api/boards', {
      headers: { 'X-Inkly-Anonymous-Id': anonymousId }
    })
    expect(listResponse.status).toBe(200)
    expect(await listResponse.json()).toEqual({
      boards: [expect.objectContaining({ id: createdBoard.id, name: 'New board name' })]
    })
    database.close()
  })

  test('rejects invalid board name updates', async () => {
    const { app, database } = await createTestApiApp({ secret: TEST_API_SECRET })
    const anonymousId = 'anon-owner'
    const createResponse = await app.request('/api/boards', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Inkly-Anonymous-Id': anonymousId
      },
      body: JSON.stringify({ name: 'Valid board' })
    })
    expect(createResponse.status).toBe(201)
    const createdBoard = (await createResponse.json()) as { id: string }

    const updateResponse = await app.request(`/api/boards/${createdBoard.id}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'X-Inkly-Anonymous-Id': anonymousId
      },
      body: JSON.stringify({ name: '   ' })
    })

    expect(updateResponse.status).toBe(400)
    expect(await updateResponse.json()).toEqual({
      error: {
        code: 'invalid_request_body',
        message: 'Too small: expected string to have >=1 characters'
      }
    })
    database.close()
  })

  test('lists invitations and accepted collaborators for the board owner', async () => {
    const ownerSession = createSession('owner-123', 'Owner User', 'owner@jfet.co.jp', 'google')
    const invitedSession = createSession('guest-123', 'Guest User', 'guest@gmail.com', 'credential')
    const auth = createHeaderAuth([ownerSession, invitedSession])
    const { app, database } = await createTestApiApp({
      auth,
      secret: TEST_API_SECRET
    })
    await seedUsers(database, [ownerSession, invitedSession])

    const createBoardResponse = await app.request('/api/boards', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        [TEST_USER_HEADER]: ownerSession.user.id
      },
      body: JSON.stringify({ name: 'Design system' })
    })
    const board = (await createBoardResponse.json()) as { id: string }

    const inviteResponse = await app.request('/api/invite', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        [TEST_USER_HEADER]: ownerSession.user.id
      },
      body: JSON.stringify({
        email: invitedSession.user.email,
        boardId: board.id,
        role: 'editor'
      })
    })
    expect(inviteResponse.status).toBe(201)
    const invite = (await inviteResponse.json()) as { invitationId: string; token: string }

    const acceptResponse = await app.request('/api/invite/accept', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        [TEST_USER_HEADER]: invitedSession.user.id,
        'X-Inkly-Anonymous-Id': 'anon-guest'
      },
      body: JSON.stringify({ token: invite.token })
    })
    expect(acceptResponse.status).toBe(200)

    const invitationsResponse = await app.request(`/api/boards/${board.id}/invitations`, {
      headers: { [TEST_USER_HEADER]: ownerSession.user.id }
    })
    expect(invitationsResponse.status).toBe(200)

    expect(await invitationsResponse.json()).toEqual({
      board: expect.objectContaining({
        id: board.id,
        collaborators: expect.arrayContaining([
          expect.objectContaining({
            anonymousId: 'anon-guest',
            role: 'editor',
            invitationId: invite.invitationId
          })
        ])
      }),
      invitations: [expect.objectContaining({ id: invite.invitationId, boardId: board.id })]
    })
    database.close()
  })

  test('lists only invited boards and rejects board creation for invited-only users', async () => {
    const ownerSession = createSession('owner-123', 'Owner User', 'owner@jfet.co.jp', 'google')
    const invitedSession = createSession('guest-123', 'Guest User', 'guest@gmail.com', 'credential')
    const strangerSession = createSession(
      'stranger-123',
      'Stranger User',
      'stranger@gmail.com',
      'credential'
    )
    const auth = createHeaderAuth([ownerSession, invitedSession, strangerSession])
    const { app, database } = await createTestApiApp({
      auth,
      secret: TEST_API_SECRET
    })
    await seedUsers(database, [ownerSession, invitedSession, strangerSession])

    const createBoardResponse = await app.request('/api/boards', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        [TEST_USER_HEADER]: ownerSession.user.id
      },
      body: JSON.stringify({ name: 'Shared board' })
    })
    expect(createBoardResponse.status).toBe(201)
    const board = (await createBoardResponse.json()) as { id: string }

    const inviteResponse = await app.request('/api/invite', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        [TEST_USER_HEADER]: ownerSession.user.id
      },
      body: JSON.stringify({
        email: invitedSession.user.email,
        boardId: board.id,
        role: 'editor'
      })
    })
    expect(inviteResponse.status).toBe(201)
    const invite = (await inviteResponse.json()) as { token: string }

    const acceptResponse = await app.request('/api/invite/accept', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        [TEST_USER_HEADER]: invitedSession.user.id,
        'X-Inkly-Anonymous-Id': 'anon-invited'
      },
      body: JSON.stringify({ token: invite.token })
    })
    expect(acceptResponse.status).toBe(200)

    const invitedListResponse = await app.request('/api/boards', {
      headers: {
        [TEST_USER_HEADER]: invitedSession.user.id
      }
    })
    expect(invitedListResponse.status).toBe(200)
    expect(await invitedListResponse.json()).toEqual({
      boards: [expect.objectContaining({ id: board.id, name: 'Shared board' })]
    })

    const strangerListResponse = await app.request('/api/boards', {
      headers: {
        [TEST_USER_HEADER]: strangerSession.user.id
      }
    })
    expect(strangerListResponse.status).toBe(200)
    expect(await strangerListResponse.json()).toEqual({ boards: [] })

    const invitedCreateResponse = await app.request('/api/boards', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        [TEST_USER_HEADER]: invitedSession.user.id
      },
      body: JSON.stringify({ name: 'Blocked board' })
    })
    expect(invitedCreateResponse.status).toBe(403)
    expect(await invitedCreateResponse.json()).toEqual({
      error: {
        code: 'forbidden_external_user_cannot_create',
        message: 'External users cannot create boards.'
      }
    })

    database.close()
  })
})
