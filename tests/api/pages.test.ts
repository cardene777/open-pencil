import { describe, expect, test } from 'bun:test'

import { TEST_API_SECRET, createTestApiApp } from '../helpers/api.js'
import { TEST_USER_HEADER, createHeaderAuth, createSession, seedUsers } from '../helpers/api-auth.js'

describe('page routes', () => {
  test('lists the default page for a new board', async () => {
    const { app, database } = await createTestApiApp({ secret: TEST_API_SECRET })
    const createBoardResponse = await app.request('/api/boards', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Inkly-Anonymous-Id': 'anon-owner'
      },
      body: JSON.stringify({ name: 'Planning board' })
    })
    const board = (await createBoardResponse.json()) as { id: string }

    const response = await app.request(`/api/boards/${board.id}/pages`, {
      headers: { 'X-Inkly-Anonymous-Id': 'anon-owner' }
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      pages: [
        expect.objectContaining({
          boardId: board.id,
          name: 'Page 1',
          position: 0,
          content: null
        })
      ]
    })
    database.close()
  })

  test('creates, renames, and deletes pages', async () => {
    const { app, database } = await createTestApiApp({ secret: TEST_API_SECRET })
    const createBoardResponse = await app.request('/api/boards', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Inkly-Anonymous-Id': 'anon-owner'
      },
      body: JSON.stringify({ name: 'Roadmap' })
    })
    const board = (await createBoardResponse.json()) as { id: string }

    const createPageResponse = await app.request(`/api/boards/${board.id}/pages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Inkly-Anonymous-Id': 'anon-owner'
      },
      body: JSON.stringify({ name: 'Page 2' })
    })
    expect(createPageResponse.status).toBe(201)
    const createdPage = (await createPageResponse.json()) as { id: string; name: string }
    expect(createdPage.name).toBe('Page 2')

    const renamePageResponse = await app.request(`/api/boards/${board.id}/pages/${createdPage.id}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'X-Inkly-Anonymous-Id': 'anon-owner'
      },
      body: JSON.stringify({ name: 'Forecast' })
    })
    expect(renamePageResponse.status).toBe(200)
    expect(await renamePageResponse.json()).toEqual(
      expect.objectContaining({
        id: createdPage.id,
        name: 'Forecast'
      })
    )

    const deletePageResponse = await app.request(`/api/boards/${board.id}/pages/${createdPage.id}`, {
      method: 'DELETE',
      headers: { 'X-Inkly-Anonymous-Id': 'anon-owner' }
    })
    expect(deletePageResponse.status).toBe(200)
    expect(await deletePageResponse.json()).toEqual({ deleted: true })
    database.close()
  })

  test('denies deleting the last remaining page', async () => {
    const { app, database } = await createTestApiApp({ secret: TEST_API_SECRET })
    const createBoardResponse = await app.request('/api/boards', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Inkly-Anonymous-Id': 'anon-owner'
      },
      body: JSON.stringify({ name: 'Single page board' })
    })
    const board = (await createBoardResponse.json()) as { id: string }

    const listPagesResponse = await app.request(`/api/boards/${board.id}/pages`, {
      headers: { 'X-Inkly-Anonymous-Id': 'anon-owner' }
    })
    const page = ((await listPagesResponse.json()) as { pages: Array<{ id: string }> }).pages[0]

    const deletePageResponse = await app.request(`/api/boards/${board.id}/pages/${page.id}`, {
      method: 'DELETE',
      headers: { 'X-Inkly-Anonymous-Id': 'anon-owner' }
    })

    expect(deletePageResponse.status).toBe(400)
    expect(await deletePageResponse.json()).toEqual({
      error: {
        code: 'last_page_delete_denied',
        message: 'A board must keep at least one page'
      }
    })
    database.close()
  })

  test('fetches and saves page content', async () => {
    const { app, database } = await createTestApiApp({ secret: TEST_API_SECRET })
    const createBoardResponse = await app.request('/api/boards', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Inkly-Anonymous-Id': 'anon-owner'
      },
      body: JSON.stringify({ name: 'Content board' })
    })
    const board = (await createBoardResponse.json()) as { id: string }

    const listPagesResponse = await app.request(`/api/boards/${board.id}/pages`, {
      headers: { 'X-Inkly-Anonymous-Id': 'anon-owner' }
    })
    const page = ((await listPagesResponse.json()) as { pages: Array<{ id: string }> }).pages[0]

    const initialContentResponse = await app.request(
      `/api/boards/${board.id}/pages/${page.id}/content`,
      {
        headers: { 'X-Inkly-Anonymous-Id': 'anon-owner' }
      }
    )
    expect(initialContentResponse.status).toBe(200)
    expect(await initialContentResponse.json()).toEqual({
      content: null,
      updatedAt: expect.any(Number)
    })

    const saveContentResponse = await app.request(`/api/boards/${board.id}/pages/${page.id}/content`, {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'X-Inkly-Anonymous-Id': 'anon-owner'
      },
      body: JSON.stringify({ content: 'Zm9v' })
    })
    expect(saveContentResponse.status).toBe(200)
    expect(await saveContentResponse.json()).toEqual({ saved: true })

    const laterContentResponse = await app.request(`/api/boards/${board.id}/pages/${page.id}/content`, {
      headers: { 'X-Inkly-Anonymous-Id': 'anon-owner' }
    })
    expect(laterContentResponse.status).toBe(200)
    expect(await laterContentResponse.json()).toEqual({
      content: 'Zm9v',
      updatedAt: expect.any(Number)
    })
    database.close()
  })

  test('forbids non-collaborators from accessing pages', async () => {
    const { app, database } = await createTestApiApp({ secret: TEST_API_SECRET })
    const createBoardResponse = await app.request('/api/boards', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Inkly-Anonymous-Id': 'anon-owner'
      },
      body: JSON.stringify({ name: 'Private board' })
    })
    const board = (await createBoardResponse.json()) as { id: string }

    const response = await app.request(`/api/boards/${board.id}/pages`, {
      headers: { 'X-Inkly-Anonymous-Id': 'anon-stranger' }
    })

    expect(response.status).toBe(403)
    database.close()
  })

  test('allows accepted invited users to access pages and content', async () => {
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
      body: JSON.stringify({ name: 'Shared board' })
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
    const invite = (await inviteResponse.json()) as { token: string }

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

    const pagesResponse = await app.request(`/api/boards/${board.id}/pages`, {
      headers: {
        [TEST_USER_HEADER]: invitedSession.user.id
      }
    })
    expect(pagesResponse.status).toBe(200)
    const pages = ((await pagesResponse.json()) as { pages: Array<{ id: string; name: string }> }).pages
    expect(pages).toEqual([expect.objectContaining({ name: 'Page 1' })])

    const contentResponse = await app.request(`/api/boards/${board.id}/pages/${pages[0].id}/content`, {
      headers: {
        [TEST_USER_HEADER]: invitedSession.user.id
      }
    })
    expect(contentResponse.status).toBe(200)
    expect(await contentResponse.json()).toEqual({
      content: null,
      updatedAt: expect.any(Number)
    })
    database.close()
  })
})
