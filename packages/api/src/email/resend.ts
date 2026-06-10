import { Resend } from 'resend'

import type { InvitationRole } from '../types.js'
import { renderInvitationEmail } from './template.js'

const DEFAULT_FROM = 'Inkly <onboarding@resend.dev>'

export interface SendInvitationEmailInput {
  boardName: string
  invitationUrl: string
  inviterAnonymousId: string
  role: InvitationRole
  to: string
}

export interface InvitationEmailSender {
  sendInvitation(input: SendInvitationEmailInput): Promise<void>
}

export interface CreateResendEmailSenderOptions {
  apiKey?: string
  from?: string
  logger?: (message: string) => void
}

export function createResendEmailSender(
  options: CreateResendEmailSenderOptions = {}
): InvitationEmailSender {
  const apiKey = options.apiKey?.trim() || process.env.INKLY_API_RESEND_KEY?.trim() || ''
  // INKLY_API_RESEND_FROM で from を上書き可能。
  // Resend で独自ドメインを verify した後に fly secrets で切替えるだけで済む。
  // 例: `noreply@jfet.co.jp` / `Pencil Editor <invite@jfet.co.jp>` 等
  const from = options.from ?? (process.env.INKLY_API_RESEND_FROM?.trim() || DEFAULT_FROM)
  const log = options.logger ?? console.log

  if (!apiKey) {
    return {
      async sendInvitation(input) {
        const message = renderInvitationEmail(input)
        log(
          [
            '[inkly-api] Dry-run invitation email',
            `to=${input.to}`,
            `subject=${message.subject}`,
            `url=${input.invitationUrl}`,
            message.html
          ].join('\n')
        )
      }
    }
  }

  const resend = new Resend(apiKey)

  return {
    async sendInvitation(input) {
      const message = renderInvitationEmail(input)
      const result = await resend.emails.send({
        from,
        to: input.to,
        subject: message.subject,
        html: message.html
      })

      if (result.error) {
        throw new Error(`Failed to send invitation email: ${result.error.message}`)
      }
    }
  }
}
