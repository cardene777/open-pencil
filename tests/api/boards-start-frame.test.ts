import { afterEach, describe, expect, test } from 'bun:test'

import { TEST_API_SECRET, createTestApiApp } from '../helpers/api.js'

const closers: Array<{ close: () => void }> = []

afterEach(() => {
  for (const closer of closers.splice(0)) {
    closer.close()
  }
})

describe('board start frame routes', () => {
  test('owner can set board startFrameId via PATCH route', async () => {
    const { app, boardStore, database } = await createTestApiApp({ secret: TEST_API_SECRET })
    closers.push(database)

    const createResponse = await app.request('/api/boards', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Inkly-Anonymous-Id': 'anon-owner'
      },
      body: JSON.stringify({ name: 'Prototype board' })
    })
    const createdBoard = (await createResponse.json()) as { id: string }

    const patchResponse = await app.request(`/api/boards/${createdBoard.id}/start-frame`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'X-Inkly-Anonymous-Id': 'anon-owner'
      },
      body: JSON.stringify({ startFrameId: 'frame-start' })
    })

    expect(patchResponse.status).toBe(200)
    expect(await patchResponse.json()).toEqual({
      board: expect.objectContaining({
        id: createdBoard.id,
        startFrameId: 'frame-start'
      })
    })
    expect(await boardStore.findBoard(createdBoard.id)).toEqual(
      expect.objectContaining({
        id: createdBoard.id,
        startFrameId: 'frame-start'
      })
    )
  })

  test('non-owner gets 403 when updating board startFrameId', async () => {
    const { app, database } = await createTestApiApp({ secret: TEST_API_SECRET })
    closers.push(database)

    const createResponse = await app.request('/api/boards', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Inkly-Anonymous-Id': 'anon-owner'
      },
      body: JSON.stringify({ name: 'Private prototype board' })
    })
    const createdBoard = (await createResponse.json()) as { id: string }

    const patchResponse = await app.request(`/api/boards/${createdBoard.id}/start-frame`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'X-Inkly-Anonymous-Id': 'anon-stranger'
      },
      body: JSON.stringify({ startFrameId: 'frame-start' })
    })

    expect(patchResponse.status).toBe(403)
  })

  test('returns 404 when updating a missing board startFrameId', async () => {
    const { app, database } = await createTestApiApp({ secret: TEST_API_SECRET })
    closers.push(database)

    const patchResponse = await app.request('/api/boards/missing-board/start-frame', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'X-Inkly-Anonymous-Id': 'anon-owner'
      },
      body: JSON.stringify({ startFrameId: 'frame-start' })
    })

    expect(patchResponse.status).toBe(404)
  })

  test('returns 400 when startFrameId body is invalid', async () => {
    const { app, database } = await createTestApiApp({ secret: TEST_API_SECRET })
    closers.push(database)

    const createResponse = await app.request('/api/boards', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Inkly-Anonymous-Id': 'anon-owner'
      },
      body: JSON.stringify({ name: 'Prototype board' })
    })
    const createdBoard = (await createResponse.json()) as { id: string }

    const patchResponse = await app.request(`/api/boards/${createdBoard.id}/start-frame`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        'X-Inkly-Anonymous-Id': 'anon-owner'
      },
      body: JSON.stringify({ startFrameId: 123 })
    })

    expect(patchResponse.status).toBe(400)
  })
})

describe('boardStore.updateBoardStartFrame', () => {
  test('supports both string and null startFrameId values', async () => {
    const { boardStore, database } = await createTestApiApp({
      secret: TEST_API_SECRET,
      now: () => 1_700_000_000
    })
    closers.push(database)

    const board = await boardStore.createBoard({
      name: 'Store prototype board',
      creatorAnonymousId: 'anon-owner'
    })

    const withStartFrame = await boardStore.updateBoardStartFrame(board.id, 'frame-start')
    expect(withStartFrame).toEqual(
      expect.objectContaining({
        id: board.id,
        startFrameId: 'frame-start'
      })
    )

    const clearedStartFrame = await boardStore.updateBoardStartFrame(board.id, null)
    expect(clearedStartFrame).toEqual(
      expect.objectContaining({
        id: board.id,
        startFrameId: null
      })
    )
  })
})
