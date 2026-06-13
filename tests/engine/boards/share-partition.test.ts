import { describe, expect, test } from 'bun:test'

import {
  parseShareEmailChips,
  partitionShareChips
} from '../../../src/app/boards/share'

describe('partitionShareChips', () => {
  test('routes jfet emails to internal and others to external', () => {
    const chips = parseShareEmailChips('a@jfet.co.jp b@example.com c@jfet.co.jp')
    const buckets = partitionShareChips({ chips })

    expect(buckets.internal).toEqual(['a@jfet.co.jp', 'c@jfet.co.jp'])
    expect(buckets.external).toEqual(['b@example.com'])
    expect(buckets.invalid).toEqual([])
  })

  test('captures malformed addresses as invalid', () => {
    const chips = parseShareEmailChips('valid@jfet.co.jp not-an-email')
    const buckets = partitionShareChips({ chips })

    expect(buckets.internal).toEqual(['valid@jfet.co.jp'])
    expect(buckets.external).toEqual([])
    expect(buckets.invalid).toEqual(['not-an-email'])
  })

  test('dedupes case-insensitively', () => {
    const chips = parseShareEmailChips('Alice@Jfet.co.jp alice@jfet.co.jp')
    const buckets = partitionShareChips({ chips })

    expect(buckets.internal).toEqual(['alice@jfet.co.jp'])
    expect(buckets.external).toEqual([])
    expect(buckets.invalid).toEqual([])
  })
})
