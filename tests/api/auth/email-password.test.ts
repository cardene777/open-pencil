import { describe, expect, test } from 'bun:test'

import { TEST_API_SECRET, createTestApiApp } from '../../helpers/api.js'

function sessionCookie(response: Response) {
  return response.headers.get('set-cookie')?.split(';')[0] ?? ''
}

function authHeaders(extra: HeadersInit = {}, cookie = ''): HeadersInit {
  return {
    origin: 'http://localhost:1420',
    'content-type': 'application/json',
    ...(cookie ? { cookie } : {}),
    ...extra
  }
}

describe('email and password auth', () => {
  test('rejects email sign-up without an invite token', async () => {
    const { app, database } = await createTestApiApp({
      secret: TEST_API_SECRET
    })

    const response = await app.request('http://127.0.0.1:3001/api/auth/sign-up/email', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        name: 'Guest User',
        email: 'guest@example.com',
        password: 'password1234'
      })
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      error: {
        code: 'missing_invitation_token',
        message: 'Invitation token is required for email sign-up.'
      }
    })
    database.close()
  })

  test('signs up with email, accepts the invite, and can sign in later with the same password', async () => {
    const { app, database } = await createTestApiApp({
      secret: TEST_API_SECRET
    })

    const createBoardResponse = await app.request('/api/boards', {
      method: 'POST',
      headers: authHeaders({
        'X-Inkly-Anonymous-Id': 'anon-owner'
      }),
      body: JSON.stringify({ name: 'Partner board' })
    })
    const board = (await createBoardResponse.json()) as { id: string }

    const inviteResponse = await app.request('/api/invite', {
      method: 'POST',
      headers: authHeaders({
        'X-Inkly-Anonymous-Id': 'anon-owner'
      }),
      body: JSON.stringify({
        email: 'guest@example.com',
        boardId: board.id,
        role: 'editor'
      })
    })
    expect(inviteResponse.status).toBe(201)

    const invite = (await inviteResponse.json()) as { token: string }

    const signUpResponse = await app.request('http://127.0.0.1:3001/api/auth/sign-up/email', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        name: 'Guest User',
        email: 'guest@example.com',
        password: 'password1234',
        invitationToken: invite.token
      })
    })
    expect(signUpResponse.status).toBe(200)

    const signUpCookie = sessionCookie(signUpResponse)
    expect(signUpCookie).toBeTruthy()

    const acceptResponse = await app.request('/api/invite/accept', {
      method: 'POST',
      headers: authHeaders(
        {
          'X-Inkly-Anonymous-Id': 'anon-guest'
        },
        signUpCookie
      ),
      body: JSON.stringify({ token: invite.token })
    })
    expect(acceptResponse.status).toBe(200)

    const invitedBoardsResponse = await app.request('/api/boards', {
      headers: authHeaders({}, signUpCookie)
    })
    expect(invitedBoardsResponse.status).toBe(200)
    expect(await invitedBoardsResponse.json()).toEqual({
      boards: [expect.objectContaining({ id: board.id, name: 'Partner board' })]
    })

    const contentResponse = await app.request(`/api/boards/${board.id}/content`, {
      headers: authHeaders({}, signUpCookie)
    })
    expect(contentResponse.status).toBe(200)
    expect(await contentResponse.json()).toEqual({
      content: null,
      updatedAt: expect.any(Number)
    })

    const signInResponse = await app.request('http://127.0.0.1:3001/api/auth/sign-in/email', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        email: 'guest@example.com',
        password: 'password1234'
      })
    })
    expect(signInResponse.status).toBe(200)

    const signInCookie = sessionCookie(signInResponse)
    expect(signInCookie).toBeTruthy()

    const laterBoardsResponse = await app.request('/api/boards', {
      headers: authHeaders({}, signInCookie)
    })
    expect(laterBoardsResponse.status).toBe(200)
    expect(await laterBoardsResponse.json()).toEqual({
      boards: [expect.objectContaining({ id: board.id, name: 'Partner board' })]
    })

    const laterContentResponse = await app.request(`/api/boards/${board.id}/content`, {
      headers: authHeaders({}, signInCookie)
    })
    expect(laterContentResponse.status).toBe(200)
    expect(await laterContentResponse.json()).toEqual({
      content: null,
      updatedAt: expect.any(Number)
    })

    database.close()
  })
})
