import { describe, expect, test } from 'bun:test'

import { createThrottleScheduler } from '@/app/document/autosave/throttle-scheduler'

type FakeTimer = {
  id: number
  fireAt: number
  cb: () => void
}

type FakeTimerHandle = { readonly __fakeTimerId: number }

function createTimerHarness() {
  let nowMs = 1_000_000
  let nextId = 1
  const timers: FakeTimer[] = []

  function setTimeoutFn(cb: () => void, ms: number): FakeTimerHandle {
    const id = nextId++
    timers.push({ id, fireAt: nowMs + ms, cb })
    return { __fakeTimerId: id }
  }

  function clearTimeoutFn(handle: FakeTimerHandle) {
    const idx = timers.findIndex((t) => t.id === handle.__fakeTimerId)
    if (idx !== -1) timers.splice(idx, 1)
  }

  async function advance(deltaMs: number): Promise<void> {
    const target = nowMs + deltaMs
    while (true) {
      timers.sort((a, b) => a.fireAt - b.fireAt)
      const next = timers[0]
      if (!next || next.fireAt > target) break
      nowMs = next.fireAt
      timers.shift()
      next.cb()
      await Promise.resolve()
    }
    nowMs = target
    await Promise.resolve()
  }

  return {
    now: () => nowMs,
    setTimeout: setTimeoutFn,
    clearTimeout: clearTimeoutFn,
    advance,
    pendingTimerCount: () => timers.length
  }
}

describe('createThrottleScheduler', () => {
  test('debounceMs 経過後に 1 回だけ flush する', async () => {
    const harness = createTimerHarness()
    const flushed: number[] = []
    const scheduler = createThrottleScheduler<number>(
      async (token) => {
        flushed.push(token)
      },
      {
        debounceMs: 1000,
        minIntervalMs: 0,
        maxDelayMs: 60_000,
        now: harness.now,
        setTimeout: harness.setTimeout,
        clearTimeout: harness.clearTimeout
      }
    )

    scheduler.schedule(1)
    expect(flushed).toEqual([])
    await harness.advance(999)
    expect(flushed).toEqual([])
    await harness.advance(1)
    expect(flushed).toEqual([1])
  })

  test('連続 schedule は debounce で coalesce され最新 token だけが flush される', async () => {
    const harness = createTimerHarness()
    const flushed: number[] = []
    const scheduler = createThrottleScheduler<number>(
      async (token) => {
        flushed.push(token)
      },
      {
        debounceMs: 1000,
        minIntervalMs: 0,
        maxDelayMs: 60_000,
        now: harness.now,
        setTimeout: harness.setTimeout,
        clearTimeout: harness.clearTimeout
      }
    )

    scheduler.schedule(1)
    await harness.advance(500)
    scheduler.schedule(2)
    await harness.advance(500)
    scheduler.schedule(3)
    await harness.advance(1000)
    expect(flushed).toEqual([3])
  })

  test('minIntervalMs 未満では再 flush しない (連続編集中の throttle)', async () => {
    const harness = createTimerHarness()
    const flushed: number[] = []
    const scheduler = createThrottleScheduler<number>(
      async (token) => {
        flushed.push(token)
      },
      {
        debounceMs: 1000,
        minIntervalMs: 5000,
        maxDelayMs: 60_000,
        now: harness.now,
        setTimeout: harness.setTimeout,
        clearTimeout: harness.clearTimeout
      }
    )

    scheduler.schedule(1)
    await harness.advance(1000)
    expect(flushed).toEqual([1])

    scheduler.schedule(2)
    await harness.advance(1000)
    expect(flushed).toEqual([1])

    await harness.advance(3000)
    expect(flushed).toEqual([1])

    await harness.advance(1000)
    expect(flushed).toEqual([1, 2])
  })

  test('maxDelayMs を超えると debounce / minInterval を打ち切って強制 flush', async () => {
    const harness = createTimerHarness()
    const flushed: number[] = []
    const scheduler = createThrottleScheduler<number>(
      async (token) => {
        flushed.push(token)
      },
      {
        debounceMs: 1000,
        minIntervalMs: 10_000,
        maxDelayMs: 5_000,
        now: harness.now,
        setTimeout: harness.setTimeout,
        clearTimeout: harness.clearTimeout
      }
    )

    for (let i = 0; i < 10; i++) {
      scheduler.schedule(i)
      await harness.advance(500)
    }
    expect(flushed.length).toBe(1)
    expect(flushed[0]).toBeGreaterThanOrEqual(8)
  })

  test('in-flight 中の schedule は merge され、終了後に再 flush される', async () => {
    const harness = createTimerHarness()
    const flushed: number[] = []
    let resolveFirst: (() => void) | null = null
    const scheduler = createThrottleScheduler<number>(
      (token) =>
        new Promise<void>((resolve) => {
          flushed.push(token)
          if (token === 1) {
            resolveFirst = resolve
          } else {
            resolve()
          }
        }),
      {
        debounceMs: 100,
        minIntervalMs: 0,
        maxDelayMs: 60_000,
        now: harness.now,
        setTimeout: harness.setTimeout,
        clearTimeout: harness.clearTimeout
      }
    )

    scheduler.schedule(1)
    await harness.advance(100)
    expect(flushed).toEqual([1])
    expect(scheduler.isInFlight()).toBe(true)

    scheduler.schedule(2)
    scheduler.schedule(3)
    expect(scheduler.pendingToken()).toBe(3)
    expect(flushed).toEqual([1])

    const resolver = resolveFirst
    if (resolver === null) throw new Error('first flush did not register a resolver')
    resolver()
    await Promise.resolve()
    await Promise.resolve()
    await harness.advance(100)
    expect(flushed).toEqual([1, 3])
  })

  test('cancel は timer を停止し pending を破棄する', async () => {
    const harness = createTimerHarness()
    const flushed: number[] = []
    const scheduler = createThrottleScheduler<number>(
      async (token) => {
        flushed.push(token)
      },
      {
        debounceMs: 1000,
        minIntervalMs: 0,
        maxDelayMs: 60_000,
        now: harness.now,
        setTimeout: harness.setTimeout,
        clearTimeout: harness.clearTimeout
      }
    )

    scheduler.schedule(1)
    scheduler.cancel()
    await harness.advance(10_000)
    expect(flushed).toEqual([])
    expect(harness.pendingTimerCount()).toBe(0)
  })

  test('flush() は同期的に runFlush を起動する', async () => {
    const harness = createTimerHarness()
    const flushed: number[] = []
    const scheduler = createThrottleScheduler<number>(
      async (token) => {
        flushed.push(token)
      },
      {
        debounceMs: 1000,
        minIntervalMs: 0,
        maxDelayMs: 60_000,
        now: harness.now,
        setTimeout: harness.setTimeout,
        clearTimeout: harness.clearTimeout
      }
    )

    scheduler.schedule(7)
    await scheduler.flush()
    expect(flushed).toEqual([7])
  })
})
