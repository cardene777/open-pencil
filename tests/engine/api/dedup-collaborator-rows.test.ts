import { describe, expect, test } from 'bun:test'

import { dedupCollaboratorRows } from '#api/boardStore.js'
import type { collaborators } from '#api/db/schema.js'

type CollaboratorRow = typeof collaborators.$inferSelect

function makeRow(overrides: Partial<CollaboratorRow>): CollaboratorRow {
  return {
    boardId: 'board-1',
    anonymousId: overrides.anonymousId ?? 'anon-1',
    userId: overrides.userId ?? null,
    role: overrides.role ?? 'editor',
    addedAt: overrides.addedAt ?? 1_700_000_000_000,
    invitationId: overrides.invitationId ?? null
  }
}

describe('dedupCollaboratorRows', () => {
  test('同 userId が複数 row あれば最古 (= 先頭) のみ採用', () => {
    const rows = [
      makeRow({ anonymousId: 'anon-old', userId: 'user-A', addedAt: 1 }),
      makeRow({ anonymousId: 'anon-new', userId: 'user-A', addedAt: 2 })
    ]
    const out = dedupCollaboratorRows(rows)
    expect(out.length).toBe(1)
    expect(out[0].anonymousId).toBe('anon-old')
  })

  test('userId == null の anonymous は dedup しない (別人扱い)', () => {
    const rows = [
      makeRow({ anonymousId: 'anon-1', userId: null }),
      makeRow({ anonymousId: 'anon-2', userId: null })
    ]
    const out = dedupCollaboratorRows(rows)
    expect(out.length).toBe(2)
  })

  test('別 userId は両方残る', () => {
    const rows = [
      makeRow({ anonymousId: 'a1', userId: 'user-A' }),
      makeRow({ anonymousId: 'a2', userId: 'user-B' })
    ]
    const out = dedupCollaboratorRows(rows)
    expect(out.length).toBe(2)
  })

  test('同 userId 3 row でも最古 1 件のみ', () => {
    const rows = [
      makeRow({ anonymousId: 'a1', userId: 'user-A', addedAt: 1 }),
      makeRow({ anonymousId: 'a2', userId: 'user-A', addedAt: 2 }),
      makeRow({ anonymousId: 'a3', userId: 'user-A', addedAt: 3 })
    ]
    const out = dedupCollaboratorRows(rows)
    expect(out.length).toBe(1)
    expect(out[0].anonymousId).toBe('a1')
  })

  test('混在 ... 同 userId 重複 + 別 userId + anonymous は正しく dedup', () => {
    const rows = [
      makeRow({ anonymousId: 'a1', userId: 'user-A', addedAt: 1 }),
      makeRow({ anonymousId: 'a2', userId: null, addedAt: 2 }),
      makeRow({ anonymousId: 'a3', userId: 'user-B', addedAt: 3 }),
      makeRow({ anonymousId: 'a4', userId: 'user-A', addedAt: 4 }),
      makeRow({ anonymousId: 'a5', userId: null, addedAt: 5 })
    ]
    const out = dedupCollaboratorRows(rows)
    expect(out.length).toBe(4)
    expect(out.map((r) => r.anonymousId)).toEqual(['a1', 'a2', 'a3', 'a5'])
  })
})
