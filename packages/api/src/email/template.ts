import type { InvitationRole } from '../types.js'

export interface InvitationEmailTemplateInput {
  boardName: string
  invitationUrl: string
  inviterAnonymousId: string
  role: InvitationRole
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
