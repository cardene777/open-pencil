import { describe, expect, test } from 'bun:test'

import { calculateResizeRect, constrainToAspectRatio } from '#vue/shared/input/resize/rect'

const ORIG = { x: 100, y: 200, width: 80, height: 40 }

describe('calculateResizeRect', () => {
  test('drag east handle right grows width without changing position', () => {
    const r = calculateResizeRect('e', ORIG, 30, 0, false)
    expect(r).toEqual({ x: 100, y: 200, width: 110, height: 40 })
  })

  test('drag west handle left shifts x and grows width inversely', () => {
    const r = calculateResizeRect('w', ORIG, -20, 0, false)
    expect(r).toEqual({ x: 80, y: 200, width: 100, height: 40 })
  })

  test('drag south handle down grows height without changing y', () => {
    const r = calculateResizeRect('s', ORIG, 0, 15, false)
    expect(r).toEqual({ x: 100, y: 200, width: 80, height: 55 })
  })

  test('drag north handle up shifts y and grows height inversely', () => {
    const r = calculateResizeRect('n', ORIG, 0, -10, false)
    expect(r).toEqual({ x: 100, y: 190, width: 80, height: 50 })
  })

  test('corner se grows both width and height with no aspect constraint', () => {
    const r = calculateResizeRect('se', ORIG, 20, 30, false)
    expect(r).toEqual({ x: 100, y: 200, width: 100, height: 70 })
  })

  test('large negative width drag flips width to positive and shifts x', () => {
    const r = calculateResizeRect('e', ORIG, -1000, 0, false)
    expect(r.width).toBe(920)
    expect(r.x).toBe(-820)
    expect(r.height).toBe(40)
  })

  test('width is clamped to a minimum of 1 when drag exactly cancels width', () => {
    const r = calculateResizeRect('e', ORIG, -80, 0, false)
    expect(r.width).toBe(1)
    expect(r.height).toBe(40)
  })

  test('negative width flips x and reports positive width', () => {
    const r = calculateResizeRect('e', ORIG, -90, 0, false)
    expect(r.width).toBeGreaterThanOrEqual(1)
    expect(r.x).toBeGreaterThanOrEqual(0)
  })

  test('constrain mode locks aspect ratio for diagonal drag (se)', () => {
    const r = calculateResizeRect('se', ORIG, 40, 5, true)
    expect(r.width / r.height).toBeCloseTo(ORIG.width / ORIG.height, 0)
  })

  test('constrain mode is a no-op when origRect has zero width', () => {
    const ZERO = { x: 0, y: 0, width: 0, height: 10 }
    const r = calculateResizeRect('se', ZERO, 5, 5, true)
    expect(r.width).toBe(5)
    expect(r.height).toBe(15)
  })
})

describe('constrainToAspectRatio', () => {
  test('n handle scales width to match height by aspect', () => {
    const r = constrainToAspectRatio('n', ORIG, 80, 50, 0, -10)
    expect(r.width / r.height).toBeCloseTo(ORIG.width / ORIG.height, 5)
  })

  test('e handle scales height to match width by aspect', () => {
    const r = constrainToAspectRatio('e', ORIG, 100, 40, 20, 0)
    expect(r.width / r.height).toBeCloseTo(ORIG.width / ORIG.height, 5)
  })

  test('diagonal handle picks dx vs dy to scale the smaller axis', () => {
    const rXLarger = constrainToAspectRatio('se', ORIG, 100, 5, 50, 5)
    expect(rXLarger.width / rXLarger.height).toBeCloseTo(ORIG.width / ORIG.height, 5)

    const rYLarger = constrainToAspectRatio('se', ORIG, 5, 100, 5, 50)
    expect(rYLarger.width / rYLarger.height).toBeCloseTo(ORIG.width / ORIG.height, 5)
  })
})
