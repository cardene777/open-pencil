import { describe, expect, test } from 'bun:test'

import { TEST_API_SECRET, createTestApiApp } from '../helpers/api.js'

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

  test('lists invitations and accepted collaborators for the board owner', async () => {
    const { app, database } = await createTestApiApp({ secret: TEST_API_SECRET })
    const ownerId = 'anon-owner'
    const createBoardResponse = await app.request('/api/boards', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Inkly-Anonymous-Id': ownerId
      },
      body: JSON.stringify({ name: 'Design system' })
    })
    const board = (await createBoardResponse.json()) as { id: string }

    const inviteResponse = await app.request('/api/invite', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Inkly-Anonymous-Id': ownerId
      },
      body: JSON.stringify({
        email: 'guest@example.com',
        boardId: board.id,
        role: 'editor'
      })
    })
    expect(inviteResponse.status).toBe(201)
    const invite = (await inviteResponse.json()) as { invitationId: string; token: string }

    const verifyResponse = await app.request('/api/invite/verify', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Inkly-Anonymous-Id': 'anon-guest'
      },
      body: JSON.stringify({ token: invite.token })
    })
    expect(verifyResponse.status).toBe(200)
    // 仕様変更後 verify は token 検証のみで collaborator 化しない (PR #201)。
    // 招待された人の collaborator 化は redeem 経路で userId 付きで行うため、
    // verify 直後の board.collaborators は owner だけ含む状態であることを確認する。

    const invitationsResponse = await app.request(`/api/boards/${board.id}/invitations`, {
      headers: { 'X-Inkly-Anonymous-Id': ownerId }
    })
    expect(invitationsResponse.status).toBe(200)

    expect(await invitationsResponse.json()).toEqual({
      board: expect.objectContaining({
        id: board.id,
        collaborators: expect.arrayContaining([
          expect.objectContaining({ anonymousId: ownerId, role: 'owner' })
        ])
      }),
      invitations: [expect.objectContaining({ id: invite.invitationId, boardId: board.id })]
    })
    database.close()
  })

  test('invited collaborator cannot DELETE the board (403, board persists)', async () => {
    const { app, database } = await createTestApiApp({ secret: TEST_API_SECRET })
    const ownerId = 'anon-owner-only'

    // owner が board 作成
    const createBoardResponse = await app.request('/api/boards', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Inkly-Anonymous-Id': ownerId
      },
      body: JSON.stringify({ name: 'Owner-only board' })
    })
    const board = (await createBoardResponse.json()) as { id: string }

    // collaborator (anon-guest) を招待経路で追加
    const inviteResponse = await app.request('/api/invite', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Inkly-Anonymous-Id': ownerId
      },
      body: JSON.stringify({
        email: 'guest@example.com',
        boardId: board.id,
        role: 'editor'
      })
    })
    const invite = (await inviteResponse.json()) as { token: string }
    await app.request('/api/invite/verify', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Inkly-Anonymous-Id': 'anon-collaborator'
      },
      body: JSON.stringify({ token: invite.token })
    })

    // collaborator が board 削除を試みる → 403
    const deleteResponse = await app.request(`/api/boards/${board.id}`, {
      method: 'DELETE',
      headers: { 'X-Inkly-Anonymous-Id': 'anon-collaborator' }
    })
    expect(deleteResponse.status).toBe(403)

    // board は残っていることを GET で確認
    const stillExistsResponse = await app.request(`/api/boards/${board.id}/invitations`, {
      headers: { 'X-Inkly-Anonymous-Id': ownerId }
    })
    expect(stillExistsResponse.status).toBe(200)
    const stillExistsBody = (await stillExistsResponse.json()) as { board: { id: string } }
    expect(stillExistsBody.board.id).toBe(board.id)

    database.close()
  })
})
