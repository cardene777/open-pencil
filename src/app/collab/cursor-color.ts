import type { Color } from '@inkly/core/types'

import { PEER_COLORS } from '@/constants'

function hashString(input: string): number {
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function colorFromAnonymousId(anonymousId: string | null | undefined): Color {
  if (!anonymousId) return PEER_COLORS[0]
  return structuredClone(PEER_COLORS[hashString(anonymousId) % PEER_COLORS.length])
}

// user.id (login 済み) または anonymous_id (未 login) から deterministic に cursor color を解決する。
// 同 user は常に同色、 別 device からの login でも user.id 一致なら同色で識別できる。
export function colorFromIdentity(
  userId: string | null | undefined,
  anonymousId: string | null | undefined
): Color {
  const key = userId?.trim() || anonymousId?.trim()
  if (!key) return PEER_COLORS[0]
  return structuredClone(PEER_COLORS[hashString(key) % PEER_COLORS.length])
}
