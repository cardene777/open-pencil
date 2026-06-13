import { describe, expect, test } from 'bun:test'

import {
  buildRemotePeers,
  createPeerActivityTracker,
  PEER_IDLE_THRESHOLD_MS
} from '@/app/collab/awareness'

const color = (r: number, g: number, b: number) => ({ r, g, b, a: 1 })

describe('buildRemotePeers dedup + idle', () => {
  test('local clientId is excluded', () => {
    const states = new Map<number, Record<string, unknown>>()
    states.set(1, { user: { name: 'me', color: color(0.1, 0.2, 0.3) } })
    states.set(2, { user: { name: 'alice', color: color(0.4, 0.5, 0.6) } })
    const peers = buildRemotePeers(states, 1)
    expect(peers).toHaveLength(1)
    expect(peers[0]?.name).toBe('alice')
  })

  test('same name + color across two clientIds is deduped to one peer', () => {
    // 同 user が別タブ / 端末で接続したケース。 awareness は別 clientId だが、
    // user.name / user.color は session 単位で固定なので、 dedup して 1 件にする。
    const states = new Map<number, Record<string, unknown>>()
    states.set(10, { user: { name: 'alice', color: color(0.4, 0.5, 0.6) } })
    states.set(11, { user: { name: 'alice', color: color(0.4, 0.5, 0.6) } })
    states.set(12, { user: { name: 'bob', color: color(0.7, 0.2, 0.1) } })
    const peers = buildRemotePeers(states, 0)
    expect(peers.length).toBe(2)
    const names = peers.map((p) => p.name).sort()
    expect(names).toEqual(['alice', 'bob'])
  })

  test('Anonymous peers are not deduped (匿名同士は別人扱い)', () => {
    const states = new Map<number, Record<string, unknown>>()
    states.set(10, { user: { name: '', color: color(0.1, 0.1, 0.1) } })
    states.set(11, { user: { name: 'Anonymous', color: color(0.1, 0.1, 0.1) } })
    states.set(12, { user: { name: 'Anonymous', color: color(0.1, 0.1, 0.1) } })
    const peers = buildRemotePeers(states, 0)
    // 'Anonymous' は 2 件、 空文字も Anonymous に昇格して計 3 件残るはず
    expect(peers.length).toBe(3)
  })

  test('dedup keeps the peer with most recent activity (when tracker provided)', () => {
    const states = new Map<number, Record<string, unknown>>()
    states.set(10, { user: { name: 'alice', color: color(0.4, 0.5, 0.6) } })
    states.set(11, { user: { name: 'alice', color: color(0.4, 0.5, 0.6) } })

    let nowTs = 1000
    const tracker = createPeerActivityTracker(() => nowTs)
    tracker.recordActivity(10)
    nowTs = 2000
    tracker.recordActivity(11)

    const peers = buildRemotePeers(states, 0, { activityTracker: tracker, now: () => nowTs })
    expect(peers).toHaveLength(1)
    expect(peers[0]?.clientId).toBe(11)
  })

  test('isIdle=false for fresh activity', () => {
    const states = new Map<number, Record<string, unknown>>()
    states.set(10, { user: { name: 'alice', color: color(0.4, 0.5, 0.6) } })

    let nowTs = 1000
    const tracker = createPeerActivityTracker(() => nowTs)
    tracker.recordActivity(10)
    nowTs = 1000 + PEER_IDLE_THRESHOLD_MS - 1

    const peers = buildRemotePeers(states, 0, { activityTracker: tracker, now: () => nowTs })
    expect(peers[0]?.isIdle).toBe(false)
  })

  test('isIdle=true after threshold passes without activity', () => {
    const states = new Map<number, Record<string, unknown>>()
    states.set(10, { user: { name: 'alice', color: color(0.4, 0.5, 0.6) } })

    let nowTs = 1000
    const tracker = createPeerActivityTracker(() => nowTs)
    tracker.recordActivity(10)
    nowTs = 1000 + PEER_IDLE_THRESHOLD_MS + 1

    const peers = buildRemotePeers(states, 0, { activityTracker: tracker, now: () => nowTs })
    expect(peers[0]?.isIdle).toBe(true)
  })

  test('isIdle=true for peer with no tracker entry (= never seen activity)', () => {
    const states = new Map<number, Record<string, unknown>>()
    states.set(10, { user: { name: 'alice', color: color(0.4, 0.5, 0.6) } })

    const tracker = createPeerActivityTracker()
    // 一切 recordActivity しない
    const peers = buildRemotePeers(states, 0, { activityTracker: tracker })
    expect(peers[0]?.isIdle).toBe(true)
  })

  test('fallback (no tracker): peer without cursor is idle', () => {
    const states = new Map<number, Record<string, unknown>>()
    states.set(10, { user: { name: 'alice', color: color(0.4, 0.5, 0.6) } })
    states.set(11, {
      user: { name: 'bob', color: color(0.7, 0.2, 0.1) },
      cursor: { x: 0, y: 0, pageId: 'p1' }
    })

    const peers = buildRemotePeers(states, 0)
    const alice = peers.find((p) => p.name === 'alice')
    const bob = peers.find((p) => p.name === 'bob')
    expect(alice?.isIdle).toBe(true)
    expect(bob?.isIdle).toBe(false)
  })

  test('tracker.prune removes clientIds no longer active', () => {
    let nowTs = 1000
    const tracker = createPeerActivityTracker(() => nowTs)
    tracker.recordActivity(10)
    tracker.recordActivity(11)
    expect(tracker.getLastActivity(10)).toBe(1000)
    expect(tracker.getLastActivity(11)).toBe(1000)

    tracker.prune(new Set([11]))
    expect(tracker.getLastActivity(10)).toBeNull()
    expect(tracker.getLastActivity(11)).toBe(1000)
  })

  test('tracker.reset clears all entries', () => {
    const tracker = createPeerActivityTracker(() => 1000)
    tracker.recordActivity(10)
    tracker.recordActivity(11)
    tracker.reset()
    expect(tracker.getLastActivity(10)).toBeNull()
    expect(tracker.getLastActivity(11)).toBeNull()
  })
})
