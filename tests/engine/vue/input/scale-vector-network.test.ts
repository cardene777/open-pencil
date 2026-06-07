import { describe, expect, test } from 'bun:test'

import { scaleVectorNetworkForResize } from '#vue/shared/input/resize/vector'

function vn() {
  return {
    vertices: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 50 }
    ],
    segments: [
      {
        start: 0,
        end: 1,
        tangentStart: { x: 10, y: 0 },
        tangentEnd: { x: -10, y: 0 }
      },
      {
        start: 1,
        end: 2,
        tangentStart: { x: 0, y: 10 },
        tangentEnd: { x: 0, y: -10 }
      }
    ],
    regions: [
      {
        windingRule: 'NONZERO' as const,
        loops: [[0, 1]]
      }
    ]
  }
}

describe('scaleVectorNetworkForResize', () => {
  test('returns null when vectorNetwork is null', () => {
    expect(scaleVectorNetworkForResize(null, 100, 50, 200, 100)).toBeNull()
  })

  test('returns null when origWidth is 0', () => {
    expect(scaleVectorNetworkForResize(vn(), 0, 50, 200, 100)).toBeNull()
  })

  test('returns null when origHeight is negative', () => {
    expect(scaleVectorNetworkForResize(vn(), 100, -1, 200, 100)).toBeNull()
  })

  test('returns null when scale is identity (sx===1 && sy===1)', () => {
    expect(scaleVectorNetworkForResize(vn(), 100, 50, 100, 50)).toBeNull()
  })

  test('scales vertices by sx/sy when width/height differ from orig', () => {
    const scaled = scaleVectorNetworkForResize(vn(), 100, 50, 200, 100)

    expect(scaled).not.toBeNull()
    expect(scaled?.vertices[0]).toEqual({ x: 0, y: 0 })
    expect(scaled?.vertices[1]).toEqual({ x: 200, y: 0 })
    expect(scaled?.vertices[2]).toEqual({ x: 200, y: 100 })
  })

  test('scales segment tangents by sx/sy independently', () => {
    const scaled = scaleVectorNetworkForResize(vn(), 100, 50, 200, 100)

    expect(scaled?.segments[0].tangentStart).toEqual({ x: 20, y: 0 })
    expect(scaled?.segments[0].tangentEnd).toEqual({ x: -20, y: 0 })
    expect(scaled?.segments[1].tangentStart).toEqual({ x: 0, y: 20 })
    expect(scaled?.segments[1].tangentEnd).toEqual({ x: 0, y: -20 })
  })

  test('preserves regions array reference (no clone)', () => {
    const original = vn()
    const scaled = scaleVectorNetworkForResize(original, 100, 50, 200, 100)

    expect(scaled?.regions).toBe(original.regions)
  })

  test('handles non-uniform scale (sx=2, sy=0.5)', () => {
    const scaled = scaleVectorNetworkForResize(vn(), 100, 50, 200, 25)

    expect(scaled?.vertices[1]).toEqual({ x: 200, y: 0 })
    expect(scaled?.vertices[2]).toEqual({ x: 200, y: 25 })
    expect(scaled?.segments[1].tangentStart).toEqual({ x: 0, y: 5 })
  })
})
