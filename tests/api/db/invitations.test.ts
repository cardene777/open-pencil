import { afterEach, describe, expect, test } from 'bun:test'

import { createBoardStore } from '../../../packages/api/src/boardStore.js'
import { createInvitationStore } from '../../../packages/api/src/store.js'
import { createTestApiDatabase } from '../../helpers/api.js'

const databases: Array<{ close: () => void }> = []

afterEach(() => {
  for (const database of databases.splice(0)) {
    database.close()
  }
})

describe('db-backed invitation store', () => {
  test('persists invitation lifecycle in memory sqlite', () => {
    const database = createTestApiDatabase()
    databases.push(database)
    const boardStore = createBoardStore({ database, now: () => 100 })
    const store = createInvitationStore({ database, now: () => 200 })
    const board = boardStore.createBoard({
      name: 'Invite board',
      creatorAnonymousId: 'anon-owner'
    })

    const invitation = store.createInvitation({
      boardId: board.id,
      sentToEmailHash: 'f'.repeat(64),
      role: 'viewer',
      expiresAt: 999_999
    })

    expect(store.findInvitation(invitation.id)).toEqual(invitation)
    expect(store.listInvitationsByBoardId(board.id)).toEqual([invitation])

    const attached = store.attachInvitationToken(invitation.id, 'signed-token')
    expect(attached?.token).toBe('signed-token')

    const revoked = store.revokeInvitation(invitation.id)
    expect(revoked?.revoked).toBe(true)
    expect(store.findInvitation(invitation.id)?.revoked).toBe(true)
    expect(store.listInvitationsByBoardId(board.id)).toEqual([
      expect.objectContaining({
        id: invitation.id,
        token: 'signed-token',
        revoked: true
      })
    ])
  })
})
