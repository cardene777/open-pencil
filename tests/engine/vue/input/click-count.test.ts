import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { createClickCounter } from '#vue/shared/input/click-count'

describe('createClickCounter', () => {
  let originalNow: typeof performance.now
  let mockNow: number

  beforeEach(() => {
    originalNow = performance.now
    mockNow = 0
    performance.now = () => mockNow
  })

  afterEach(() => {
    performance.now = originalNow
  })

  test('first click sets clickCount to 1', () => {
    const counter = createClickCounter()
    mockNow = 1000

    const count = counter.recordClick(100, 100)

    expect(count).toBe(1)
    expect(counter.getClickCount()).toBe(1)
  })

  test('rapid click within delay + radius increments clickCount', () => {
    const counter = createClickCounter()

    mockNow = 1000
    counter.recordClick(100, 100)

    mockNow = 1300
    const count2 = counter.recordClick(102, 103)

    expect(count2).toBe(2)
  })

  test('click after delay resets clickCount to 1', () => {
    const counter = createClickCounter()

    mockNow = 1000
    counter.recordClick(100, 100)

    mockNow = 1600
    const count2 = counter.recordClick(100, 100)

    expect(count2).toBe(1)
  })

  test('click outside radius resets clickCount to 1', () => {
    const counter = createClickCounter()

    mockNow = 1000
    counter.recordClick(100, 100)

    mockNow = 1200
    const count2 = counter.recordClick(120, 100)

    expect(count2).toBe(1)
  })

  test('triple click within delay + radius reaches clickCount 3', () => {
    const counter = createClickCounter()

    mockNow = 1000
    counter.recordClick(100, 100)

    mockNow = 1200
    counter.recordClick(101, 101)

    mockNow = 1400
    const count3 = counter.recordClick(102, 102)

    expect(count3).toBe(3)
  })

  test('getClickCount reflects the latest recordClick result', () => {
    const counter = createClickCounter()

    expect(counter.getClickCount()).toBe(0)

    mockNow = 1000
    counter.recordClick(0, 0)
    expect(counter.getClickCount()).toBe(1)
  })
})
