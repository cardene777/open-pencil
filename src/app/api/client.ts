import { BOARD_API_ENDPOINTS } from '@/app/api/boards'

export type InvitationRole = 'editor' | 'viewer'

const ANONYMOUS_ID_STORAGE_KEY = 'inkly.anonymous-id'
export const ANONYMOUS_ID_HEADER = 'X-Inkly-Anonymous-Id'

export interface BoardCollaborator {
  anonymousId: string | null
  userId: string | null
  role: InvitationRole | 'owner'
  addedAt: number
  invitationId: string | null
}

export interface Board {
  id: string
  name: string
  creatorAnonymousId: string
  creatorUserId: string | null
  startFrameId: string | null
  createdAt: number
  updatedAt: number
  collaborators: BoardCollaborator[]
}

export interface Invitation {
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

export interface ApiErrorBody {
  error?: {
    code?: string
    message?: string
  }
}

export interface InviteUserInput {
  email: string
  boardId: string
  role: InvitationRole
}

export interface InviteUserResponse {
  invitationId: string
  token: string
  expiresAt: number
  url: string
}

export interface VerifyInvitationResponse {
  valid: boolean
  invitation?: {
    id: string
    boardId: string
    role: InvitationRole
    expiresAt: number
  }
  reason?: string
}

export interface BoardInvitationsResponse {
  board: Board
  invitations: Invitation[]
}

export interface ShareBoardInput {
  emails: string[]
  role: InvitationRole
}

export interface ShareBoardResponse {
  added: { email: string; userId: string }[]
  pending: { email: string }[]
  rejected: { email: string; reason: string }[]
}

export interface InternalUserSummary {
  id: string
  name: string
  email: string
}

export interface RedeemInvitationInput {
  token: string
  email: string
  password: string
  name?: string
  mode?: 'signUp' | 'signIn'
}

export interface RedeemInvitationResponse {
  ok: true
  user: { id: string; email: string; name: string }
  invitation: { id: string; boardId: string; role: InvitationRole }
}

export interface RedeemInvitationErrorResponse {
  error: { code: string; message: string }
}

function isRedeemInvitationSuccess(
  data: ApiErrorBody | RedeemInvitationResponse | RedeemInvitationErrorResponse | null
): data is RedeemInvitationResponse {
  return Boolean(data && typeof data === 'object' && 'ok' in data && data.ok === true)
}

function isRedeemInvitationError(
  data: ApiErrorBody | RedeemInvitationResponse | RedeemInvitationErrorResponse | null
): data is RedeemInvitationErrorResponse {
  return Boolean(
    data &&
    typeof data === 'object' &&
    'error' in data &&
    data.error &&
    typeof data.error === 'object' &&
    typeof data.error.code === 'string' &&
    typeof data.error.message === 'string'
  )
}

function readAnonymousId(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(ANONYMOUS_ID_STORAGE_KEY)
}

function writeAnonymousId(anonymousId: string | null) {
  if (typeof window === 'undefined' || !anonymousId) return
  window.localStorage.setItem(ANONYMOUS_ID_STORAGE_KEY, anonymousId)
}

function buildHeaders(init: RequestInit): Headers {
  const headers = new Headers(init.headers)
  const anonymousId = readAnonymousId()
  if (anonymousId) {
    headers.set(ANONYMOUS_ID_HEADER, anonymousId)
  }
  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }
  return headers
}

export async function requestJson<T>(input: string, init: RequestInit = {}) {
  const response = await fetch(input, {
    ...init,
    // credentials: 'include' は better-auth の OAuth state cookie を確実に
    // 送受信するため必須。 default 'same-origin' でも同一 origin の Set-Cookie は
    // 保存されるはずだが、 一部ブラウザ + Secure cookie + SameSite=Lax の組合せで
    // fetch が credentials default だと cookie を一切扱わない挙動を確認。
    // 'include' で OAuth flow / session 維持 / CSRF 検証すべてが安定動作する。
    credentials: init.credentials ?? 'include',
    headers: buildHeaders(init)
  })

  writeAnonymousId(response.headers.get(ANONYMOUS_ID_HEADER))
  const data = (await response.json().catch(() => null)) as T | ApiErrorBody | null
  return { response, data }
}

export async function apiRequest<T>(input: string, init: RequestInit = {}): Promise<T> {
  const { response, data } = await requestJson<T>(input, init)

  if (!response.ok) {
    const errorBody = data as ApiErrorBody | null
    throw new Error(errorBody?.error?.message ?? `Request failed with status ${response.status}`)
  }

  return data as T
}

/**
 * board の document blob を server DB から取得する。 404 = 未保存 (新規 board) なので null を返す。
 */
export async function fetchBoardDocument(boardId: string): Promise<{
  bytes: Uint8Array
  updatedAt: number
} | null> {
  const response = await fetch(BOARD_API_ENDPOINTS.document(boardId), {
    credentials: 'include',
    headers: buildHeaders({})
  })

  if (response.status === 404) return null
  if (!response.ok) {
    throw new Error(`Failed to fetch board document (HTTP ${response.status})`)
  }

  const updatedAt = Number(response.headers.get('x-document-updated-at')) || Date.now()
  const buffer = await response.arrayBuffer()
  return { bytes: new Uint8Array(buffer), updatedAt }
}

/**
 * board の document blob を server DB に保存する。 owner / collaborator の autosave 経路から呼ぶ。
 */
export async function uploadBoardDocument(boardId: string, bytes: Uint8Array): Promise<void> {
  const response = await fetch(BOARD_API_ENDPOINTS.document(boardId), {
    method: 'PUT',
    credentials: 'include',
    headers: buildHeaders({
      headers: { 'content-type': 'application/octet-stream' }
    }),
    body: bytes
  })

  if (!response.ok) {
    throw new Error(`Failed to upload board document (HTTP ${response.status})`)
  }
}

/**
 * server DB に保存された board preview (data URL) を取得する。 未保存 (404) は null。
 */
export async function fetchBoardPreview(boardId: string): Promise<{
  dataUrl: string
  updatedAt: number
} | null> {
  const response = await fetch(BOARD_API_ENDPOINTS.preview(boardId), {
    credentials: 'include',
    headers: buildHeaders({})
  })

  if (response.status === 404) return null
  if (!response.ok) {
    throw new Error(`Failed to fetch board preview (HTTP ${response.status})`)
  }

  const data = (await response.json().catch(() => null)) as {
    dataUrl?: string
    updatedAt?: number
  } | null
  if (!data?.dataUrl) return null
  return {
    dataUrl: data.dataUrl,
    updatedAt: Number(data.updatedAt) || Date.now()
  }
}

/**
 * server DB に board preview (data URL) を保存する。 owner / collaborator 全員に共通の
 * thumbnail が見えるよう一元化、 localStorage 経路は廃止。
 */
export async function uploadBoardPreview(boardId: string, dataUrl: string): Promise<void> {
  const response = await fetch(BOARD_API_ENDPOINTS.preview(boardId), {
    method: 'PUT',
    credentials: 'include',
    headers: buildHeaders({
      headers: { 'content-type': 'application/json' }
    }),
    body: JSON.stringify({ dataUrl })
  })
  if (!response.ok) {
    throw new Error(`Failed to upload board preview (HTTP ${response.status})`)
  }
}

/**
 * sign-in user の pinned board id 一覧を server から取得する。 未 sign-in は 401 → 空 array。
 */
export async function fetchPinnedBoardIds(): Promise<string[]> {
  const { response, data } = await requestJson<{ boardIds: string[] }>(BOARD_API_ENDPOINTS.pins)
  if (response.status === 401) return []
  if (!response.ok) {
    throw new Error(`Failed to fetch pinned boards (HTTP ${response.status})`)
  }
  return (data as { boardIds?: string[] } | null)?.boardIds ?? []
}

/**
 * board を pin する (server DB 側、 user-board pair PK)。
 */
export async function pinBoard(boardId: string): Promise<void> {
  await apiRequest<{ pinned: true; created: boolean }>(BOARD_API_ENDPOINTS.pin(boardId), {
    method: 'POST'
  })
}

/**
 * board を unpin する。 該当 user の該当 board 行を削除する。
 */
export async function unpinBoard(boardId: string): Promise<void> {
  await apiRequest<{ pinned: false; removed: boolean }>(BOARD_API_ENDPOINTS.pin(boardId), {
    method: 'DELETE'
  })
}

export function inviteUser(input: InviteUserInput) {
  return apiRequest<InviteUserResponse>(BOARD_API_ENDPOINTS.invite, {
    method: 'POST',
    body: JSON.stringify(input)
  })
}

export function shareBoard(boardId: string, input: ShareBoardInput) {
  return apiRequest<ShareBoardResponse>(BOARD_API_ENDPOINTS.share(boardId), {
    method: 'POST',
    body: JSON.stringify(input)
  })
}

export function searchInternalUsers(query: string, limit?: number) {
  // 空 query も許容 = ShareModal 初期表示で sign-up 済み jfet user の上位 N 名を取得する経路。
  const normalizedQuery = query.trim()
  const params = new URLSearchParams()
  if (normalizedQuery) params.set('q', normalizedQuery)
  if (typeof limit === 'number') params.set('limit', String(limit))

  const queryString = params.toString()
  const endpoint = queryString
    ? `${BOARD_API_ENDPOINTS.internalUsers}?${queryString}`
    : BOARD_API_ENDPOINTS.internalUsers

  return apiRequest<{ users: InternalUserSummary[] }>(endpoint)
}

export function verifyInvitation(token: string) {
  return requestJson<VerifyInvitationResponse>(BOARD_API_ENDPOINTS.verifyInvite, {
    method: 'POST',
    body: JSON.stringify({ token })
  }).then(({ data }) => (data ?? { valid: false, reason: 'malformed' }) as VerifyInvitationResponse)
}

export async function checkInvited(email: string): Promise<boolean> {
  const { response, data } = await requestJson<{ invited: boolean }>(
    BOARD_API_ENDPOINTS.checkInvited,
    {
      method: 'POST',
      body: JSON.stringify({ email })
    }
  )

  if (!response.ok) {
    // 400/500 等は「招待判定不能」扱い、 sign-up は拒否側に倒す
    return false
  }
  const successBody = data as { invited?: boolean } | null
  return Boolean(successBody?.invited)
}

export async function redeemInvitation(
  input: RedeemInvitationInput
): Promise<RedeemInvitationResponse | RedeemInvitationErrorResponse> {
  const { response, data } = await requestJson<
    RedeemInvitationResponse | RedeemInvitationErrorResponse
  >(BOARD_API_ENDPOINTS.redeemInvite, {
    method: 'POST',
    body: JSON.stringify(input)
  })
  if (isRedeemInvitationSuccess(data) || isRedeemInvitationError(data)) return data
  return {
    error: {
      code: 'unexpected_response',
      message: `Unexpected response (HTTP ${response.status})`
    }
  }
}

export function getAnonymousId() {
  return readAnonymousId()
}

export function setAnonymousId(anonymousId: string) {
  writeAnonymousId(anonymousId)
}

export function clearAnonymousId() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(ANONYMOUS_ID_STORAGE_KEY)
}

export function createBoardEditorLocation(board: Board) {
  return {
    path: `/board/${board.id}`,
    query: {
      name: board.name
    }
  }
}

export function createBoardPreviewLocation(boardId: string, startFrameId?: string | null) {
  return {
    path: `/board/${boardId}/preview`,
    query: startFrameId ? { startFrame: startFrameId } : {}
  }
}

export async function listBoards() {
  const response = await apiRequest<{ boards: Board[] }>(BOARD_API_ENDPOINTS.boards)
  return response.boards
}

export function createBoard(input: { name: string } | string) {
  const payload = typeof input === 'string' ? { name: input } : input
  return apiRequest<Board>(BOARD_API_ENDPOINTS.boards, {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function updateBoardStartFrame(boardId: string, startFrameId: string | null) {
  const response = await apiRequest<{ board: Board }>(BOARD_API_ENDPOINTS.startFrame(boardId), {
    method: 'PATCH',
    body: JSON.stringify({ startFrameId })
  })
  return response.board
}

export function deleteBoard(boardId: string) {
  return apiRequest<{ deleted: boolean }>(BOARD_API_ENDPOINTS.board(boardId), {
    method: 'DELETE'
  })
}

export function listInvitations(boardId: string) {
  return apiRequest<BoardInvitationsResponse>(BOARD_API_ENDPOINTS.invitations(boardId))
}

export function revokeInvitation(boardId: string, invitationId: string) {
  return apiRequest<{ invitation: Invitation | null }>(
    BOARD_API_ENDPOINTS.invitation(boardId, invitationId),
    {
      method: 'DELETE'
    }
  )
}
