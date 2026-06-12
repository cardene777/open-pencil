import { describe, expect, test } from 'bun:test'

import {
  guestAvatarColor,
  isGuestUser,
  isJfetMember,
  isValidEmail
} from '@/app/auth/email'

describe('isValidEmail', () => {
  test('accepts standard addresses', () => {
    expect(isValidEmail('alice@example.com')).toBe(true)
    expect(isValidEmail('ren@jfet.co.jp')).toBe(true)
  })

  test('rejects malformed input', () => {
    expect(isValidEmail('no-at')).toBe(false)
    expect(isValidEmail('a@b')).toBe(false)
    expect(isValidEmail('')).toBe(false)
  })
})

describe('isJfetMember', () => {
  test('returns true for jfet.co.jp addresses', () => {
    expect(isJfetMember('ren@jfet.co.jp')).toBe(true)
    expect(isJfetMember('REN@JFET.CO.JP')).toBe(true)
    expect(isJfetMember('  ren@jfet.co.jp  ')).toBe(true)
  })

  test('returns false for external domains', () => {
    expect(isJfetMember('alice@example.com')).toBe(false)
    expect(isJfetMember('bob@gmail.com')).toBe(false)
    // Lookalike sub-domain must not match
    expect(isJfetMember('ren@jfet.co.jp.evil.com')).toBe(false)
  })

  test('returns false for empty / null input', () => {
    expect(isJfetMember(null)).toBe(false)
    expect(isJfetMember(undefined)).toBe(false)
    expect(isJfetMember('')).toBe(false)
  })
})

describe('isGuestUser', () => {
  test('treats external email as guest', () => {
    expect(isGuestUser('alice@example.com')).toBe(true)
    expect(isGuestUser('design@agency.example')).toBe(true)
  })

  test('treats jfet member as not a guest', () => {
    expect(isGuestUser('ren@jfet.co.jp')).toBe(false)
  })

  test('returns false for missing email (no user yet)', () => {
    expect(isGuestUser(null)).toBe(false)
    expect(isGuestUser('')).toBe(false)
  })
})

describe('guestAvatarColor', () => {
  test('returns a deterministic color from the palette', () => {
    const a = guestAvatarColor('alice@example.com')
    const aAgain = guestAvatarColor('alice@example.com')
    expect(a).toBe(aAgain)
  })

  test('is case-insensitive and trims whitespace', () => {
    expect(guestAvatarColor('Alice@Example.COM')).toBe(guestAvatarColor('alice@example.com'))
    expect(guestAvatarColor('  alice@example.com  ')).toBe(guestAvatarColor('alice@example.com'))
  })

  test('always returns a 7-char hex string', () => {
    const sample = guestAvatarColor('bob@example.com')
    expect(sample).toMatch(/^#[0-9A-F]{6}$/i)
  })

  test('different emails can map to different colors', () => {
    const colors = new Set<string>()
    for (let i = 0; i < 100; i += 1) {
      colors.add(guestAvatarColor(`u${i}@example.com`))
    }
    // 10-color palette → over 100 inputs we expect more than 1 distinct color.
    expect(colors.size).toBeGreaterThan(1)
  })

  test('returns a stable default for null email', () => {
    expect(guestAvatarColor(null)).toMatch(/^#[0-9A-F]{6}$/i)
  })
})
