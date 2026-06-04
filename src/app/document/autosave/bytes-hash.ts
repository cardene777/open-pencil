export function fnv1aHash32(bytes: Uint8Array): number {
  let hash = 0x811c9dc5
  for (const byte of bytes) {
    hash ^= byte
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

export type BytesFingerprint = {
  byteLength: number
  hash: number
}

export function fingerprint(bytes: Uint8Array): BytesFingerprint {
  return { byteLength: bytes.byteLength, hash: fnv1aHash32(bytes) }
}

export function fingerprintEquals(
  a: BytesFingerprint | null,
  b: BytesFingerprint | null
): boolean {
  if (!a || !b) return false
  return a.byteLength === b.byteLength && a.hash === b.hash
}
