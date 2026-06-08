import type { InvitationRole } from '../types.js'

export interface InvitationEmailTemplateInput {
  boardName: string
  invitationUrl: string
  inviterAnonymousId: string
  role: InvitationRole
}

export interface PasswordResetEmailTemplateInput {
  resetUrl: string
  userName: string
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function getInviterAnonymousLabel(anonymousId: string) {
  return anonymousId.slice(0, 8) || 'anonymous'
}

export function renderInvitationEmail(input: InvitationEmailTemplateInput) {
  const inviterLabel = getInviterAnonymousLabel(input.inviterAnonymousId)
  const boardName = escapeHtml(input.boardName)
  const invitationUrl = escapeHtml(input.invitationUrl)
  const role = escapeHtml(input.role)

  return {
    subject: `${inviterLabel} invited you to ${input.boardName} on Inkly`,
    html: [
      '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', sans-serif; line-height: 1.5; color: #111827;">',
      `<p><strong>${escapeHtml(inviterLabel)}</strong> invited you to collaborate on <strong>${boardName}</strong> as <strong>${role}</strong>.</p>`,
      `<p><a href="${invitationUrl}">Open invitation</a></p>`,
      `<p style="word-break: break-all;">${invitationUrl}</p>`,
      '</div>'
    ].join(''),
    inviterLabel
  }
}

export function renderPasswordResetEmail(input: PasswordResetEmailTemplateInput) {
  const userName = escapeHtml(input.userName.trim() || 'there')
  const resetUrl = escapeHtml(input.resetUrl)

  return {
    subject: 'Reset your Inkly password',
    html: [
      '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', sans-serif; line-height: 1.5; color: #111827;">',
      `<p>Hello ${userName},</p>`,
      '<p>Use the link below to reset your Inkly password.</p>',
      `<p><a href="${resetUrl}">Reset password</a></p>`,
      `<p style="word-break: break-all;">${resetUrl}</p>`,
      '<p>If you did not request this, you can ignore this email.</p>',
      '</div>'
    ].join('')
  }
}
