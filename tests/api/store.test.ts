import { describe, expect, test } from 'bun:test'

import { createInvitationStore } from '../../packages/api/src/store.js'
import { createTestApiDatabase } from '../helpers/api.js'

describe('invitation store', () => {
  test('creates, finds, and revokes invitations', async () => {
    const database = await createTestApiDatabase()
    const store = await createInvitationStore({ database })
    const invitation = await store.createInvitation({
      boardId: 'board-123',
      sentToEmailHash: 'a'.repeat(64),
      role: 'editor',
      expiresAt: Date.now() + 60_000
    })

    expect(invitation.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
    expect(invitation.jti).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
    expect(await store.findInvitation(invitation.id)).toEqual(invitation)

    const revoked = await store.revokeInvitation(invitation.id)

    expect(revoked?.revoked).toBe(true)
    expect((await store.findInvitation(invitation.id))?.revoked).toBe(true)
    expect(await store.revokeInvitation('missing-id')).toBeNull()
    expect(await store.findInvitation('missing-id')).toBeNull()
    database.close()
  })

  test('hasActiveInvitationForEmailHash returns true only for active invitations', async () => {
    const database = await createTestApiDatabase()
    const store = await createInvitationStore({ database })
    const hash = 'a'.repeat(64)
    const future = Date.now() + 60_000

    // 招待が無い状態は false
    expect(await store.hasActiveInvitationForEmailHash(hash, Date.now())).toBe(false)

    // 有効期限内 + 未 revoke の招待は true
    const invitation = await store.createInvitation({
      boardId: 'board-active',
      sentToEmailHash: hash,
      role: 'editor',
      expiresAt: future
    })
    expect(await store.hasActiveInvitationForEmailHash(hash, Date.now())).toBe(true)

    // 別 email hash では false
    expect(await store.hasActiveInvitationForEmailHash('b'.repeat(64), Date.now())).toBe(false)

    // revoke 後は false
    await store.revokeInvitation(invitation.id)
    expect(await store.hasActiveInvitationForEmailHash(hash, Date.now())).toBe(false)

    // 期限切れも false
    const expiringSoon = await store.createInvitation({
      boardId: 'board-expired',
      sentToEmailHash: hash,
      role: 'editor',
      expiresAt: Date.now() + 1000
    })
    expect(await store.hasActiveInvitationForEmailHash(hash, expiringSoon.expiresAt + 1)).toBe(false)
    database.close()
  })
})
