export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

const JFET_DOMAIN = '@jfet.co.jp'

export function isJfetMember(email: string | null | undefined): boolean {
  if (!email) return false
  return email.toLowerCase().trim().endsWith(JFET_DOMAIN)
}

export function isGuestUser(email: string | null | undefined): boolean {
  if (!email) return false
  return !isJfetMember(email)
}

const GUEST_AVATAR_PALETTE = [
  '#C25569', // rose
  '#D67E6A', // coral
  '#D4A05A', // amber
  '#C7B86C', // yellow
  '#90B26A', // lime
  '#5BAA9F', // teal
  '#6E9DD1', // sky
  '#7A78D4', // indigo
  '#A87BD4', // violet
  '#D67BAE'  // pink
] as const

export type GuestAvatarColor = (typeof GUEST_AVATAR_PALETTE)[number]

export function guestAvatarColor(email: string | null | undefined): GuestAvatarColor {
  if (!email) return GUEST_AVATAR_PALETTE[0]
  let hash = 0
  const normalized = email.toLowerCase().trim()
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0
  }
  return GUEST_AVATAR_PALETTE[hash % GUEST_AVATAR_PALETTE.length]
}
