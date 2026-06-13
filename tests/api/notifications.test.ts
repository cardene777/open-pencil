import { describe, expect, test } from 'bun:test'

import { TEST_API_SECRET, createTestApiApp } from '../helpers/api.js'
import { TEST_USER_HEADER, createHeaderAuth, createSession, seedUsers } from '../helpers/api-auth.js'

describe('notification routes', () => {
  test('supports CRUD and creates notifications from invite side effects', async () => {
    const owner = createSession('user-owner', 'Owner User', 'owner@example.com')
    const invitee = createSession('user-invitee', 'Invitee User', 'invitee@example.com')
    const outsider = createSession('user-outsider', 'Outsider User', 'outsider@example.com')

    const { app, boardStore, database, notificationStore } = await createTestApiApp({
      auth: createHeaderAuth([owner, invitee, outsider]),
      secret: TEST_API_SECRET
    })
    await seedUsers(database, [owner, invitee, outsider])

    const createBoardResponse = await app.request('/api/boards', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        [TEST_USER_HEADER]: owner.user.id
      },
      body: JSON.stringify({ name: 'Release plan' })
    })
    expect(createBoardResponse.status).toBe(201)
    const board = (await createBoardResponse.json()) as { id: string }

    const inviteResponse = await app.request('/api/invite', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        [TEST_USER_HEADER]: owner.user.id
      },
      body: JSON.stringify({
        email: invitee.user.email,
        boardId: board.id,
        role: 'editor'
      })
    })
    expect(inviteResponse.status).toBe(201)

    await notificationStore.createNotification({
      userId: invitee.user.id,
      type: 'mention',
      payload: {
        boardId: board.id,
        boardName: 'Release plan',
        mentionedByDisplayName: owner.user.name,
        message: 'Please review the launch checklist',
        url: `/?board=${board.id}`
      }
    })

    const inviteeListResponse = await app.request('/api/notifications', {
      headers: { [TEST_USER_HEADER]: invitee.user.id }
    })
    expect(inviteeListResponse.status).toBe(200)
    const inviteeList = (await inviteeListResponse.json()) as {
      notifications: Array<{
        id: string
        type: string
        readAt: number | null
        payload: Record<string, unknown>
      }>
    }
    expect(inviteeList.notifications).toHaveLength(2)
    expect(inviteeList.notifications.map((notification) => notification.type).sort()).toEqual([
      'invitation',
      'mention'
    ])

    const mentionNotification = inviteeList.notifications.find(
      (notification) => notification.type === 'mention'
    )
    const invitationNotification = inviteeList.notifications.find(
      (notification) => notification.type === 'invitation'
    )

    expect(mentionNotification?.payload).toEqual(
      expect.objectContaining({
        boardName: 'Release plan',
        mentionedByDisplayName: owner.user.name
      })
    )
    expect(invitationNotification?.payload).toEqual(
      expect.objectContaining({
        boardId: board.id,
        boardName: 'Release plan',
        inviterDisplayName: owner.user.name,
        inviteeEmail: invitee.user.email
      })
    )

    const readMentionResponse = await app.request(`/api/notifications/${mentionNotification?.id}/read`, {
      method: 'POST',
      headers: { [TEST_USER_HEADER]: invitee.user.id }
    })
    expect(readMentionResponse.status).toBe(200)
    expect(await readMentionResponse.json()).toEqual({
      notification: expect.objectContaining({
        id: mentionNotification?.id,
        readAt: expect.any(Number)
      })
    })

    const reorderedResponse = await app.request('/api/notifications', {
      headers: { [TEST_USER_HEADER]: invitee.user.id }
    })
    expect(reorderedResponse.status).toBe(200)
    const reordered = (await reorderedResponse.json()) as {
      notifications: Array<{ id: string; type: string; readAt: number | null }>
    }
    expect(reordered.notifications.map((notification) => notification.id)).toEqual([
      invitationNotification?.id,
      mentionNotification?.id
    ])
    expect(reordered.notifications[0]?.readAt).toBeNull()
    expect(reordered.notifications[1]?.readAt).toEqual(expect.any(Number))

    const outsiderDeleteResponse = await app.request(
      `/api/notifications/${invitationNotification?.id}`,
      {
        method: 'DELETE',
        headers: { [TEST_USER_HEADER]: outsider.user.id }
      }
    )
    expect(outsiderDeleteResponse.status).toBe(404)

    const readAllResponse = await app.request('/api/notifications/read-all', {
      method: 'POST',
      headers: { [TEST_USER_HEADER]: invitee.user.id }
    })
    expect(readAllResponse.status).toBe(200)
    expect(await readAllResponse.json()).toEqual({
      updatedCount: 2
    })

    const deleteResponse = await app.request(`/api/notifications/${invitationNotification?.id}`, {
      method: 'DELETE',
      headers: { [TEST_USER_HEADER]: invitee.user.id }
    })
    expect(deleteResponse.status).toBe(200)
    expect(await deleteResponse.json()).toEqual({
      deleted: true,
      notification: expect.objectContaining({
        id: invitationNotification?.id,
        type: 'invitation'
      })
    })

    const finalListResponse = await app.request('/api/notifications', {
      headers: { [TEST_USER_HEADER]: invitee.user.id }
    })
    expect(finalListResponse.status).toBe(200)
    expect(await finalListResponse.json()).toEqual({
      notifications: [expect.objectContaining({ id: mentionNotification?.id, readAt: expect.any(Number) })]
    })

    expect(await boardStore.findBoard(board.id)).toEqual(expect.objectContaining({ id: board.id }))

    database.close()
  })
})
