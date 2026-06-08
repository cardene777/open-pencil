import type {
  InvitationEmailSender,
  SendInvitationEmailInput,
  SendPasswordResetEmailInput
} from './resend.js'

export interface MockEmailSender {
  sent: SendInvitationEmailInput[]
  passwordResets: SendPasswordResetEmailInput[]
  sender: InvitationEmailSender
}

export function createMockEmailSender(): MockEmailSender {
  const sent: SendInvitationEmailInput[] = []
  const passwordResets: SendPasswordResetEmailInput[] = []

  return {
    sent,
    passwordResets,
    sender: {
      async sendInvitation(input) {
        sent.push(structuredClone(input))
      },
      async sendPasswordReset(input) {
        passwordResets.push(structuredClone(input))
      }
    }
  }
}
