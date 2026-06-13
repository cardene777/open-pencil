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

/**
 * 統一 chip 入力から内部 (jfet) / 外部 / 不正をまとめて振り分ける。
 * 1 入力 field 経由の chip 群を、 share API へ渡す前段で純粋関数として振り分ける。
 */
export interface PartitionShareChipsInput {
  chips: ShareEmailChip[]
}
export interface ShareChipBuckets {
  internal: string[]
  external: string[]
  invalid: string[]
}
export function partitionShareChips(input: PartitionShareChipsInput): ShareChipBuckets {
  const internal: string[] = []
  const external: string[] = []
  const invalid: string[] = []

  for (const chip of input.chips) {
    if (!chip.valid) {
      invalid.push(chip.value)
      continue
    }
    if (isJfetMember(chip.value)) internal.push(chip.value)
    else external.push(chip.value)
  }

  return {
    internal: dedupeEmails(internal),
    external: dedupeEmails(external),
    invalid
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
