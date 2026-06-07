import { describe, expect, test } from 'bun:test'

import { parsePhotoRequests } from '#core/tools/stock-photo/requests'

describe('parsePhotoRequests', () => {
  test('parses a JSON array of requests', () => {
    const json = JSON.stringify([
      { id: 'a', query: 'cat' },
      { id: 'b', query: 'dog' }
    ])

    const result = parsePhotoRequests(json)

    expect(Array.isArray(result)).toBe(true)
    expect((result as { id: string }[]).length).toBe(2)
    expect((result as { id: string }[])[0].id).toBe('a')
    expect((result as { id: string }[])[1].id).toBe('b')
  })

  test('wraps a single object into a single-element array', () => {
    const json = JSON.stringify({ id: 'x', query: 'sunset' })

    const result = parsePhotoRequests(json)

    expect(Array.isArray(result)).toBe(true)
    expect((result as { id: string }[]).length).toBe(1)
    expect((result as { id: string }[])[0].id).toBe('x')
  })

  test('returns error when JSON is invalid', () => {
    const result = parsePhotoRequests('not json')

    expect(result).toEqual({ error: 'Invalid JSON in requests' })
  })

  test('returns error when empty array is provided', () => {
    const result = parsePhotoRequests(JSON.stringify([]))

    expect(result).toEqual({ error: 'Empty requests array' })
  })

  test('coerces non-string input via String() before JSON.parse', () => {
    const result = parsePhotoRequests(123)

    expect(result).toEqual([123] as unknown as { id: string }[])
  })

  test('returns error for undefined / null / boolean which stringify to non-JSON tokens', () => {
    expect(parsePhotoRequests(undefined)).toEqual({ error: 'Invalid JSON in requests' })

    expect(parsePhotoRequests(true)).toEqual([true] as unknown as { id: string }[])
    expect(parsePhotoRequests(null)).toEqual([null] as unknown as { id: string }[])
  })
})
