import { isJfetMember, isValidEmail } from '@/app/auth/email'

export interface ShareEmailBuckets {
  internal: string[]
  external: string[]
}

export interface PartitionShareEmailsInput {
  internalEmails: string[]
  externalEmail: string
}

export interface ShareEmailChip {
  value: string
  valid: boolean
}

const EMAIL_SEPARATOR_PATTERN = /[\s,]+/

export function normalizeShareEmail(email: string) {
  return email.trim().toLowerCase()
}

export function parseShareEmailChips(input: string): ShareEmailChip[] {
  const seen = new Set<string>()
  const chips: ShareEmailChip[] = []

  for (const token of input.split(EMAIL_SEPARATOR_PATTERN)) {
    const value = normalizeShareEmail(token)
    if (!value || seen.has(value)) continue
    seen.add(value)
    chips.push({
      value,
      valid: isValidEmail(value)
    })
  }

  return chips
}

export function partitionShareEmails(input: PartitionShareEmailsInput): ShareEmailBuckets {
  const internal = dedupeEmails(input.internalEmails)
  const externalEmail = normalizeShareEmail(input.externalEmail)

  if (externalEmail && isValidEmail(externalEmail)) {
    if (isJfetMember(externalEmail)) internal.push(externalEmail)
  }

  return {
    internal: dedupeEmails(internal),
    external:
      externalEmail && isValidEmail(externalEmail) && !isJfetMember(externalEmail)
        ? [externalEmail]
        : []
  }
}

function dedupeEmails(emails: string[]) {
  const seen = new Set<string>()
  const normalized: string[] = []

  for (const email of emails) {
    const value = normalizeShareEmail(email)
    if (!value || seen.has(value)) continue
    seen.add(value)
    normalized.push(value)
  }

  return normalized
}
