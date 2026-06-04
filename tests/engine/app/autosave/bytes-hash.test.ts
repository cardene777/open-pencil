import { describe, expect, test } from 'bun:test'

import {
  fingerprint,
  fingerprintEquals,
  fnv1aHash32
} from '@/app/document/autosave/bytes-hash'

describe('bytes-hash', () => {
  test('FNV-1a 32 ハッシュは決定的', () => {
    const a = new Uint8Array([1, 2, 3, 4, 5])
    const b = new Uint8Array([1, 2, 3, 4, 5])
    expect(fnv1aHash32(a)).toBe(fnv1aHash32(b))
  })

  test('1 byte 異なれば hash が異なる', () => {
    const a = new Uint8Array([1, 2, 3, 4, 5])
    const b = new Uint8Array([1, 2, 3, 4, 6])
    expect(fnv1aHash32(a)).not.toBe(fnv1aHash32(b))
  })

  test('空 bytes も hash 可能', () => {
    expect(fnv1aHash32(new Uint8Array(0))).toBe(0x811c9dc5 >>> 0)
  })

  test('fingerprint は byteLength + hash を返す', () => {
    const bytes = new Uint8Array([0xa, 0xb, 0xc])
    const fp = fingerprint(bytes)
    expect(fp.byteLength).toBe(3)
    expect(fp.hash).toBe(fnv1aHash32(bytes))
  })

  test('fingerprintEquals は同値なら true', () => {
    const a = fingerprint(new Uint8Array([1, 2, 3]))
    const b = fingerprint(new Uint8Array([1, 2, 3]))
    expect(fingerprintEquals(a, b)).toBe(true)
  })

  test('fingerprintEquals は null を含むと false', () => {
    const a = fingerprint(new Uint8Array([1, 2, 3]))
    expect(fingerprintEquals(null, a)).toBe(false)
    expect(fingerprintEquals(a, null)).toBe(false)
    expect(fingerprintEquals(null, null)).toBe(false)
  })

  test('fingerprintEquals は byteLength 違いを false', () => {
    const a = fingerprint(new Uint8Array([1, 2, 3]))
    const b = fingerprint(new Uint8Array([1, 2, 3, 0]))
    expect(fingerprintEquals(a, b)).toBe(false)
  })

  test('1000 byte の同値判定が < 5ms', () => {
    const bytes = new Uint8Array(1000).fill(42)
    const start = performance.now()
    for (let i = 0; i < 100; i++) fingerprint(bytes)
    const elapsed = performance.now() - start
    expect(elapsed).toBeLessThan(50)
  })
})
