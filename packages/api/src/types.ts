export const INVITATION_ISSUER = 'inkly' as const

export const INVITATION_ROLES = ['editor', 'viewer'] as const

export type InvitationRole = (typeof INVITATION_ROLES)[number]

export const NOTIFICATION_TYPES = ['invitation', 'mention'] as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

export interface InvitationPayload {
  iss: typeof INVITATION_ISSUER
  sub: string
  board_id: string
  role: InvitationRole
  email_hash: string
  exp: number
  iat: number
  jti: string
}

export interface InvitationRecord {
  id: string
  boardId: string
  sentToEmailHash: string
  role: InvitationRole
  createdAt: number
  expiresAt: number
  revoked: boolean
  jti: string
  token: string | null
}

export interface CreateInvitationInput {
  boardId: string
  sentToEmailHash: string
  role: InvitationRole
  expiresAt: number
}

export interface InvitationStore {
  createInvitation(input: CreateInvitationInput): Promise<InvitationRecord>
  findInvitation(id: string): Promise<InvitationRecord | null>
  listInvitationsByBoardId(boardId: string): Promise<InvitationRecord[]>
  attachInvitationToken(id: string, token: string): Promise<InvitationRecord | null>
  revokeInvitation(id: string): Promise<InvitationRecord | null>
  /**
   * email hash で「現在有効な (未 revoke + 未 expire) 招待が 1 件以上存在するか」を判定する。
   * guest sign-up 時の招待チェック用、 hits 数まで返す必要はないので boolean。
   */
  hasActiveInvitationForEmailHash(emailHash: string, now: number): Promise<boolean>
}

export type InvitationVerifyFailureReason =
  | 'expired'
  | 'revoked'
  | 'invalid_signature'
  | 'malformed'

export interface BoardCollaboratorRecord {
  anonymousId: string
  userId: string | null
  role: InvitationRole | 'owner'
  addedAt: number
  invitationId: string | null
}

export interface BoardRecord {
  id: string
  name: string
  creatorAnonymousId: string
  creatorUserId: string | null
  startFrameId: string | null
  createdAt: number
  updatedAt: number
  collaborators: BoardCollaboratorRecord[]
}

export interface CreateBoardInput {
  name: string
  creatorAnonymousId?: string | null
  creatorUserId?: string | null
}

export interface AddBoardCollaboratorInput {
  anonymousId: string
  userId?: string | null
  role: InvitationRole
  /**
   * 招待 token redeem 経由の場合は対応する invitations.id を渡す。
   * jfet 内部 user の直接追加 (directAdd / pending 転記) では null を渡す
   * (本 PR Phase 2 で導入された経路)。
   */
  invitationId: string | null
}

export interface UpdateBoardStartFrameInput {
  startFrameId: string | null
}

export interface BoardStore {
  createBoard(input: CreateBoardInput): Promise<BoardRecord>
  findBoard(id: string): Promise<BoardRecord | null>
  listBoardsForAnonymous(anonymousId: string): Promise<BoardRecord[]>
  listBoardsForUser(userId: string): Promise<BoardRecord[]>
  deleteBoard(id: string): Promise<BoardRecord | null>
  addCollaborator(boardId: string, input: AddBoardCollaboratorInput): Promise<BoardRecord | null>
  updateBoardStartFrame(id: string, startFrameId: string | null): Promise<BoardRecord | null>
}

export interface UserRecord {
  id: string
  name: string
  email: string
  image: string | null
}

export interface InvitationNotificationPayload {
  invitationId: string
  boardId: string
  boardName: string
  role: InvitationRole
  inviterDisplayName: string
  inviteeEmail: string
  url: string
}

export interface MentionNotificationPayload {
  boardId: string
  boardName: string
  mentionedByDisplayName: string
  message: string
  url: string
}

export type NotificationPayload = InvitationNotificationPayload | MentionNotificationPayload

export interface NotificationRecord {
  id: string
  userId: string
  type: NotificationType
  payload: NotificationPayload
  readAt: number | null
  createdAt: number
}

export interface CreateNotificationInput {
  userId: string
  type: NotificationType
  payload: NotificationPayload
}

export interface NotificationStore {
  createNotification(input: CreateNotificationInput): Promise<NotificationRecord>
  findNotification(id: string): Promise<NotificationRecord | null>
  findUserByEmail(email: string): Promise<UserRecord | null>
  findUserById(id: string): Promise<UserRecord | null>
  listUsersByIds(ids: string[]): Promise<UserRecord[]>
  listNotificationsForUser(userId: string): Promise<NotificationRecord[]>
  markNotificationRead(id: string, userId: string): Promise<NotificationRecord | null>
  markAllNotificationsRead(userId: string): Promise<number>
  deleteNotification(id: string, userId: string): Promise<NotificationRecord | null>
  sweepOldNotifications(olderThanMs?: number): Promise<number>
}

export const INTERNAL_USER_DOMAIN = 'jfet.co.jp' as const

export interface InternalUserRecord {
  id: string
  email: string
  userId: string | null
  addedAt: number
}

export interface InternalUserSearchResult {
  id: string
  name: string
  email: string
}

export interface UpsertInternalUserInput {
  email: string
  userId?: string | null
}

export interface InternalUserStore {
  /**
   * jfet.co.jp ドメインの user を upsert する。
   * 既存 record があれば userId を更新、 無ければ新規作成。
   * 非 jfet ドメインの email は null を返し、 record は作らない (caller 側で domain チェック済が前提だがガードで二重防御)。
   */
  upsertInternalUser(input: UpsertInternalUserInput): Promise<InternalUserRecord | null>
  findInternalUserByEmail(email: string): Promise<InternalUserRecord | null>
  findInternalUserByUserId(userId: string): Promise<InternalUserRecord | null>
  listInternalUsers(): Promise<InternalUserRecord[]>
  searchInternalUsersByPrefix(query: string, limit?: number): Promise<InternalUserSearchResult[]>
}

export interface PendingInternalInvitationRecord {
  id: string
  boardId: string
  email: string
  role: InvitationRole
  invitedByUserId: string
  createdAt: number
}

export interface CreatePendingInternalInvitationInput {
  boardId: string
  email: string
  role: InvitationRole
  invitedByUserId: string
}

export interface PendingInternalInvitationStore {
  createPendingInvitation(
    input: CreatePendingInternalInvitationInput
  ): Promise<PendingInternalInvitationRecord>
  listPendingByEmail(email: string): Promise<PendingInternalInvitationRecord[]>
  deletePendingByEmail(email: string): Promise<number>
}

/**
 * board document を SSOT として DB に持つ store。 owner / collaborator 双方が
 * 同じ source を読み書きするため API + DB に集約する。
 */
export interface BoardDocumentRecord {
  boardId: string
  bytes: Uint8Array
  size: number
  updatedAt: number
  updatedByUserId: string | null
}

export interface UpsertBoardDocumentInput {
  boardId: string
  bytes: Uint8Array
  updatedByUserId: string | null
}

export interface BoardDocumentStore {
  findDocument(boardId: string): Promise<BoardDocumentRecord | null>
  upsertDocument(input: UpsertBoardDocumentInput): Promise<BoardDocumentRecord>
  deleteDocument(boardId: string): Promise<void>
}

/**
 * user ごとの board pin (ダッシュボード「ピン留め」を server 側 SSOT で保持)。
 * 旧 localStorage 経路は廃止し全ブラウザで同じ pin が見える。
 */
export interface BoardPinRecord {
  userId: string
  boardId: string
  pinnedAt: number
}

export interface BoardPinStore {
  listPinnedBoardIdsForUser(userId: string): Promise<string[]>
  pinBoard(userId: string, boardId: string): Promise<boolean>
  unpinBoard(userId: string, boardId: string): Promise<boolean>
  isPinned(userId: string, boardId: string): Promise<boolean>
}

/**
 * board ごとの preview (ダッシュボード一覧で出すサムネイル) を server 側 SSOT で保持。
 * 旧 localStorage 経路は廃止し owner / collaborator 全員で同じ preview を共有する。
 */
export interface BoardPreviewRecord {
  boardId: string
  dataUrl: string
  size: number
  updatedAt: number
  updatedByUserId: string | null
}

export interface UpsertBoardPreviewInput {
  boardId: string
  dataUrl: string
  updatedByUserId: string | null
}

export interface BoardPreviewStore {
  findPreview(boardId: string): Promise<BoardPreviewRecord | null>
  listPreviewsForBoardIds(boardIds: string[]): Promise<BoardPreviewRecord[]>
  upsertPreview(input: UpsertBoardPreviewInput): Promise<BoardPreviewRecord>
  deletePreview(boardId: string): Promise<void>
}

/**
 * domain 判定ヘルパー (caller 側で利用)
 */
export function isInternalDomainEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${INTERNAL_USER_DOMAIN}`)
}
