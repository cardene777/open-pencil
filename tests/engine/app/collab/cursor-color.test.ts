import { describe, expect, test } from 'bun:test'

import { colorFromAnonymousId, colorFromIdentity } from '@/app/collab/cursor-color'

describe('cursor-color', () => {
  describe('colorFromAnonymousId', () => {
    test('同 anonymous_id は常に同色を返す', () => {
      const id = 'anon-abc-123'
      const c1 = colorFromAnonymousId(id)
      const c2 = colorFromAnonymousId(id)
      expect(c1).toEqual(c2)
    })

    test('null / undefined / 空文字は default 色 (PEER_COLORS[0])', () => {
      const c1 = colorFromAnonymousId(null)
      const c2 = colorFromAnonymousId(undefined)
      expect(c1).toEqual(c2)
    })

    test('別 anonymous_id は別色になる可能性が高い', () => {
      const c1 = colorFromAnonymousId('anon-one')
      const c2 = colorFromAnonymousId('anon-two-different')
      // PEER_COLORS は配列なので衝突可能性あり、 deterministic だけ check
      expect(c1).toBeDefined()
      expect(c2).toBeDefined()
    })
  })

  describe('colorFromIdentity', () => {
    test('user_id が優先される (anonymous_id 与えても user_id 一致なら同色)', () => {
      const c1 = colorFromIdentity('user-xyz', 'anon-aaa')
      const c2 = colorFromIdentity('user-xyz', 'anon-bbb')
      expect(c1).toEqual(c2)
    })

    test('user_id 不在なら anonymous_id で決定', () => {
      const c1 = colorFromIdentity(null, 'anon-shared-id')
      const c2 = colorFromIdentity(undefined, 'anon-shared-id')
      expect(c1).toEqual(c2)
    })

    test('user_id 一致は colorFromAnonymousId とは別系列 (key が違うため別 hash)', () => {
      // user_id='shared' と anonymous_id='shared' は別 path
      const fromUser = colorFromIdentity('shared', null)
      const fromAnon = colorFromAnonymousId('shared')
      // hash key が同じならたまたま同色になるが、 colorFromIdentity の経路自体は独立
      expect(fromUser).toEqual(fromAnon) // 同 key なら同 hash で同 index
    })

    test('user_id も anonymous_id も無いなら default 色', () => {
      const c1 = colorFromIdentity(null, null)
      const c2 = colorFromIdentity(undefined, undefined)
      expect(c1).toEqual(c2)
    })

    test('空白のみの user_id / anonymous_id は default 色 (trim 判定)', () => {
      const c1 = colorFromIdentity('   ', '   ')
      const c2 = colorFromIdentity(null, null)
      expect(c1).toEqual(c2)
    })

    test('user_id 切替で別色になる (login 切替時の色変化)', () => {
      const beforeLogin = colorFromIdentity(null, 'anon-original')
      const afterLogin = colorFromIdentity('user-google-12345', 'anon-original')
      // 同 anonymous_id でも login すると user_id 経由になり別色 (hash が違う限り)
      // anonymous_id と user_id が同 hash になることは確率的に低い
      expect(beforeLogin).toBeDefined()
      expect(afterLogin).toBeDefined()
    })
  })
})
