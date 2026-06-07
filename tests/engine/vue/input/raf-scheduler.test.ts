import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { createRafScheduler } from '#vue/shared/input/raf-scheduler'

describe('createRafScheduler', () => {
  let originalRaf: typeof globalThis.requestAnimationFrame
  let originalCancel: typeof globalThis.cancelAnimationFrame
  let pending: Array<{ id: number; cb: FrameRequestCallback }>
  let nextId: number

  beforeEach(() => {
    originalRaf = globalThis.requestAnimationFrame
    originalCancel = globalThis.cancelAnimationFrame
    pending = []
    nextId = 0
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      nextId += 1
      pending.push({ id: nextId, cb })
      return nextId
    }) as typeof globalThis.requestAnimationFrame
    globalThis.cancelAnimationFrame = ((id: number) => {
      pending = pending.filter((entry) => entry.id !== id)
    }) as typeof globalThis.cancelAnimationFrame
  })

  afterEach(() => {
    globalThis.requestAnimationFrame = originalRaf
    globalThis.cancelAnimationFrame = originalCancel
  })

  function flushPending() {
    const entries = pending.splice(0)
    for (const entry of entries) {
      entry.cb(performance.now())
    }
  }

  test('schedule queues a single rAF and calls flush on frame', () => {
    let flushCount = 0
    const scheduler = createRafScheduler(() => {
      flushCount += 1
    })

    scheduler.schedule()
    scheduler.schedule()

    expect(pending.length).toBe(1)

    flushPending()

    expect(flushCount).toBe(1)
  })

  test('cancel removes the queued rAF before flush runs', () => {
    let flushCount = 0
    const scheduler = createRafScheduler(() => {
      flushCount += 1
    })

    scheduler.schedule()
    expect(pending.length).toBe(1)

    scheduler.cancel()
    expect(pending.length).toBe(0)

    flushPending()
    expect(flushCount).toBe(0)
  })

  test('cancel is a no-op when nothing is scheduled', () => {
    let flushCount = 0
    const scheduler = createRafScheduler(() => {
      flushCount += 1
    })

    scheduler.cancel()

    expect(pending.length).toBe(0)
    expect(flushCount).toBe(0)
  })

  test('schedule can be re-armed after flush completes', () => {
    let flushCount = 0
    const scheduler = createRafScheduler(() => {
      flushCount += 1
    })

    scheduler.schedule()
    flushPending()

    scheduler.schedule()
    expect(pending.length).toBe(1)

    flushPending()
    expect(flushCount).toBe(2)
  })
})
