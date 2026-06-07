import { describe, expect, test } from 'bun:test'

import { parsePhotoRequests } from '#core/tools/stock-photo/requests'

function expectRequestsArray(value: unknown): Array<{ id: string }> {
  if (!Array.isArray(value)) {
    throw new TypeError(`expected array, got ${JSON.stringify(value)}`)
  }
  return value as Array<{ id: string }>
}

describe('parsePhotoRequests', () => {
  test('parses a JSON array of requests', () => {
    const json = JSON.stringify([
      { id: 'a', query: 'cat' },
      { id: 'b', query: 'dog' }
    ])

    const result = expectRequestsArray(parsePhotoRequests(json))

    expect(result.length).toBe(2)
    expect(result[0].id).toBe('a')
    expect(result[1].id).toBe('b')
  })

  test('wraps a single object into a single-element array', () => {
    const json = JSON.stringify({ id: 'x', query: 'sunset' })

    const result = expectRequestsArray(parsePhotoRequests(json))

    expect(result.length).toBe(1)
    expect(result[0].id).toBe('x')
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

    expect(Array.isArray(result)).toBe(true)
    expect((result as number[])[0]).toBe(123)
    expect((result as number[]).length).toBe(1)
  })

  test('returns error when undefined stringifies to non-JSON token', () => {
    expect(parsePhotoRequests(undefined)).toEqual({ error: 'Invalid JSON in requests' })
  })

  test('wraps boolean and null values into single-element arrays', () => {
    const trueResult = parsePhotoRequests(true)
    expect(Array.isArray(trueResult)).toBe(true)
    expect((trueResult as boolean[])[0]).toBe(true)

    const nullResult = parsePhotoRequests(null)
    expect(Array.isArray(nullResult)).toBe(true)
    expect((nullResult as null[])[0]).toBe(null)
  })
})
