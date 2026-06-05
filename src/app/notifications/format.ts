import type { NotificationRecord } from '@/app/api/notifications'

export function isNotificationUnread(notification: NotificationRecord) {
  return notification.readAt === null
}

export function getNotificationTitle(notification: NotificationRecord) {
  switch (notification.type) {
    case 'invitation':
      return `${notification.payload.inviterDisplayName} invited you to ${notification.payload.boardName}`
    case 'team_invite':
      return `${notification.payload.inviterDisplayName} added you to ${notification.payload.teamName}`
    case 'mention':
      return `${notification.payload.mentionedByDisplayName} mentioned you in ${notification.payload.boardName}`
  }
}

export function getNotificationBody(notification: NotificationRecord) {
  switch (notification.type) {
    case 'invitation':
      return `Board invitation as ${notification.payload.role}.`
    case 'team_invite':
      return `Workspace access as ${notification.payload.role}.`
    case 'mention':
      return notification.payload.message
  }
}

export function getNotificationTarget(notification: NotificationRecord) {
  return notification.payload.url
}

export function formatNotificationTime(notification: NotificationRecord) {
  return new Date(notification.createdAt).toLocaleString()
}
