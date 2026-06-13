import { describe, expect, test } from 'bun:test'

import { createPendingInternalInvitationStore } from '../../packages/api/src/pendingInternalInvitationStore.js'
import { createTestApiDatabase } from '../helpers/api.js'
import { seedUserAndBoard } from '../helpers/seed-board-and-user.js'

describe('pending internal invitation store', () => {
  test('creates pending invitation and lists by email', async () => {
    const database = await createTestApiDatabase()
    const { userId, boardId } = await seedUserAndBoard(database, {
      userEmail: 'owner@jfet.co.jp'
    })
    const store = await createPendingInternalInvitationStore({ database })

    const record = await store.createPendingInvitation({
      boardId,
      email: 'bob@jfet.co.jp',
      role: 'editor',
      invitedByUserId: userId
    })
    expect(record.email).toBe('bob@jfet.co.jp')
    expect(record.boardId).toBe(boardId)
    expect(record.role).toBe('editor')

    const list = await store.listPendingByEmail('bob@jfet.co.jp')
    expect(list).toHaveLength(1)
    const [firstPending] = list
    expect(firstPending?.id).toBe(record.id)
    database.close()
  })

  test('deletePendingByEmail removes all pending for that email and returns count', async () => {
    const database = await createTestApiDatabase()
    const { userId, boardId } = await seedUserAndBoard(database, {
      userEmail: 'owner2@jfet.co.jp'
    })
    const store = await createPendingInternalInvitationStore({ database })

    await store.createPendingInvitation({
      boardId,
      email: 'carol@jfet.co.jp',
      role: 'editor',
      invitedByUserId: userId
    })
    await store.createPendingInvitation({
      boardId,
      email: 'carol@jfet.co.jp',
      role: 'viewer',
      invitedByUserId: userId
    })
    await store.createPendingInvitation({
      boardId,
      email: 'dave@jfet.co.jp',
      role: 'editor',
      invitedByUserId: userId
    })

    const deletedCount = await store.deletePendingByEmail('carol@jfet.co.jp')
    expect(deletedCount).toBe(2)
    expect(await store.listPendingByEmail('carol@jfet.co.jp')).toHaveLength(0)
    expect(await store.listPendingByEmail('dave@jfet.co.jp')).toHaveLength(1)
    database.close()
  })
})
