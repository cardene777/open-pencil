import type { InvitationEmailSender, SendInvitationEmailInput } from './resend.js'

export interface MockEmailSender {
  sent: SendInvitationEmailInput[]
  sender: InvitationEmailSender
}

export function createMockEmailSender(): MockEmailSender {
  const sent: SendInvitationEmailInput[] = []

  return {
    sent,
    sender: {
      async sendInvitation(input) {
        sent.push(structuredClone(input))
      }
    }
  }
}
