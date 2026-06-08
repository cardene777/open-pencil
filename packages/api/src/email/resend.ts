import { Resend } from 'resend'

import type { InvitationRole } from '../types.js'
import { renderInvitationEmail, renderPasswordResetEmail } from './template.js'

const DEFAULT_FROM = 'Inkly <onboarding@resend.dev>'

export interface SendInvitationEmailInput {
  boardName: string
  invitationUrl: string
  inviterAnonymousId: string
  role: InvitationRole
  to: string
}

export interface SendPasswordResetEmailInput {
  resetUrl: string
  to: string
  userName: string
}

export interface InvitationEmailSender {
  sendInvitation(input: SendInvitationEmailInput): Promise<void>
  sendPasswordReset(input: SendPasswordResetEmailInput): Promise<void>
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
  const from = options.from ?? DEFAULT_FROM
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
      },
      async sendPasswordReset(input) {
        const message = renderPasswordResetEmail(input)
        log(
          [
            '[inkly-api] Dry-run password reset email',
            `to=${input.to}`,
            `subject=${message.subject}`,
            `url=${input.resetUrl}`,
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
    },
    async sendPasswordReset(input) {
      const message = renderPasswordResetEmail(input)
      const result = await resend.emails.send({
        from,
        to: input.to,
        subject: message.subject,
        html: message.html
      })

      if (result.error) {
        throw new Error(`Failed to send password reset email: ${result.error.message}`)
      }
    }
  }
}
