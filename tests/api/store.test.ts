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

  test('createInvitation auto-revokes existing active invitation for same board + email', async () => {
    // 同じ board に同じ user (sentToEmailHash 一致) への招待を再発行した場合、
    // 古い招待は revoke され、 新しい招待のみが active になる。
    // これがないと dashboard に同 user の複数招待 entry が表示される事故になる。
    const database = await createTestApiDatabase()
    const store = await createInvitationStore({ database })
    const hash = 'c'.repeat(64)
    const future = Date.now() + 60_000

    const first = await store.createInvitation({
      boardId: 'board-dup',
      sentToEmailHash: hash,
      role: 'editor',
      expiresAt: future
    })
    expect(first.revoked).toBe(false)

    const second = await store.createInvitation({
      boardId: 'board-dup',
      sentToEmailHash: hash,
      role: 'editor',
      expiresAt: future
    })
    expect(second.revoked).toBe(false)
    expect(second.id).not.toBe(first.id)

    // 1 件目は revoke されている
    const refreshedFirst = await store.findInvitation(first.id)
    expect(refreshedFirst?.revoked).toBe(true)

    // active な招待は 2 件目だけ
    expect(await store.hasActiveInvitationForEmailHash(hash, Date.now())).toBe(true)

    // listInvitationsByBoardId は両方返す (revoked も含む、 表示側の判断に委ねる)
    const all = await store.listInvitationsByBoardId('board-dup')
    expect(all.length).toBe(2)
    expect(all.filter((i) => !i.revoked).length).toBe(1)
    expect(all.filter((i) => !i.revoked)[0]?.id).toBe(second.id)

    database.close()
  })

  test('createInvitation does not revoke invitations on other boards for same email', async () => {
    // board 跨ぎでは触らない。 board A に招待中の user に対して別 owner が board B
    // で再招待しても A の招待は active のまま。
    const database = await createTestApiDatabase()
    const store = await createInvitationStore({ database })
    const hash = 'd'.repeat(64)
    const future = Date.now() + 60_000

    const onBoardA = await store.createInvitation({
      boardId: 'board-A',
      sentToEmailHash: hash,
      role: 'editor',
      expiresAt: future
    })

    await store.createInvitation({
      boardId: 'board-B',
      sentToEmailHash: hash,
      role: 'editor',
      expiresAt: future
    })

    const refreshedA = await store.findInvitation(onBoardA.id)
    expect(refreshedA?.revoked).toBe(false)

    database.close()
  })

  test('createInvitation stores sentToEmail when provided and exposes it on read', async () => {
    const database = await createTestApiDatabase()
    const store = await createInvitationStore({ database })
    const hash = 'e'.repeat(64)
    const future = Date.now() + 60_000

    const created = await store.createInvitation({
      boardId: 'board-display-email',
      sentToEmailHash: hash,
      sentToEmail: 'alice@example.com',
      role: 'editor',
      expiresAt: future
    })

    expect(created.sentToEmail).toBe('alice@example.com')
    const refreshed = await store.findInvitation(created.id)
    expect(refreshed?.sentToEmail).toBe('alice@example.com')

    database.close()
  })

  test('createInvitation without sentToEmail keeps the column null (旧経路互換)', async () => {
    const database = await createTestApiDatabase()
    const store = await createInvitationStore({ database })
    const hash = 'f'.repeat(64)
    const future = Date.now() + 60_000

    const created = await store.createInvitation({
      boardId: 'board-legacy',
      sentToEmailHash: hash,
      role: 'editor',
      expiresAt: future
    })

    expect(created.sentToEmail).toBeNull()
    database.close()
  })

  test('createInvitation does not revoke invitations for different email on same board', async () => {
    // 同 board でも email hash が異なれば別 user、 旧招待を触らない。
    const database = await createTestApiDatabase()
    const store = await createInvitationStore({ database })
    const aliceHash = 'a'.repeat(64)
    const bobHash = 'b'.repeat(64)
    const future = Date.now() + 60_000

    const aliceInvite = await store.createInvitation({
      boardId: 'board-shared',
      sentToEmailHash: aliceHash,
      role: 'editor',
      expiresAt: future
    })

    await store.createInvitation({
      boardId: 'board-shared',
      sentToEmailHash: bobHash,
      role: 'editor',
      expiresAt: future
    })

    const refreshedAlice = await store.findInvitation(aliceInvite.id)
    expect(refreshedAlice?.revoked).toBe(false)

    database.close()
  })
})
