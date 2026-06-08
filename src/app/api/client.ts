import { BOARD_API_ENDPOINTS } from '@/app/api/boards'

export type InvitationRole = 'editor' | 'viewer'
export type TeamMemberRole = 'owner' | 'editor' | 'viewer'

const ANONYMOUS_ID_STORAGE_KEY = 'inkly.anonymous-id'
export const ANONYMOUS_ID_HEADER = 'X-Inkly-Anonymous-Id'
export const ANONYMOUS_ID_COOKIE = 'inkly_anonymous_id'

export interface BoardCollaborator {
  anonymousId: string
  role: InvitationRole | 'owner'
  addedAt: number
  invitationId: string | null
}

export interface Board {
  id: string
  name: string
  creatorAnonymousId: string
  creatorUserId: string | null
  teamId: string | null
  createdAt: number
  updatedAt: number
  collaborators: BoardCollaborator[]
  team: BoardTeamSummary | null
}

export interface BoardTeamSummary {
  id: string
  name: string
}

export interface Page {
  id: string
  boardId: string
  name: string
  content: string | null
  position: number
  createdAt: number
  updatedAt: number
}

export interface PageContentResponse {
  content: string | null
  updatedAt: number
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
    boardName: string
    role: InvitationRole
    expiresAt: number
  }
  reason?: string
}

export interface AcceptInvitationResponse {
  boardId: string
  role: InvitationRole
}

export interface BoardInvitationsResponse {
  board: Board
  invitations: Invitation[]
}

function readAnonymousId(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(ANONYMOUS_ID_STORAGE_KEY)
}

function writeAnonymousIdCookie(anonymousId: string | null) {
  if (typeof document === 'undefined' || typeof window === 'undefined') return

  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  if (!anonymousId) {
    document.cookie = `${ANONYMOUS_ID_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`
    return
  }

  document.cookie = `${ANONYMOUS_ID_COOKIE}=${encodeURIComponent(anonymousId)}; Path=/; SameSite=Lax${secure}`
}

function writeAnonymousId(anonymousId: string | null) {
  if (typeof window === 'undefined') return
  if (anonymousId) {
    window.localStorage.setItem(ANONYMOUS_ID_STORAGE_KEY, anonymousId)
  } else {
    window.localStorage.removeItem(ANONYMOUS_ID_STORAGE_KEY)
  }
  writeAnonymousIdCookie(anonymousId)
}

export function syncAnonymousIdCookie() {
  writeAnonymousIdCookie(readAnonymousId())
}

function buildHeaders(init: RequestInit): Headers {
  const headers = new Headers(init.headers)
  syncAnonymousIdCookie()
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
    credentials: 'include',
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

export function inviteUser(input: InviteUserInput) {
  return apiRequest<InviteUserResponse>(BOARD_API_ENDPOINTS.invite, {
    method: 'POST',
    body: JSON.stringify(input)
  })
}

export function verifyInvitation(token: string) {
  return requestJson<VerifyInvitationResponse>(BOARD_API_ENDPOINTS.verifyInvite, {
    method: 'POST',
    body: JSON.stringify({ token })
  }).then(({ data }) => (data ?? { valid: false, reason: 'malformed' }) as VerifyInvitationResponse)
}

export function acceptInvitation(token: string) {
  return apiRequest<AcceptInvitationResponse>(BOARD_API_ENDPOINTS.acceptInvite, {
    method: 'POST',
    body: JSON.stringify({ token })
  })
}

export function getAnonymousId() {
  return readAnonymousId()
}

export function setAnonymousId(anonymousId: string) {
  writeAnonymousId(anonymousId)
}

export function clearAnonymousId() {
  writeAnonymousId(null)
}

export function encodeBoardContentBytes(bytes: Uint8Array): string {
  if (typeof bytes.toBase64 === 'function') {
    return bytes.toBase64()
  }

  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

export function decodeBoardContentBytes(base64: string): Uint8Array {
  if (typeof Uint8Array.fromBase64 === 'function') {
    return Uint8Array.fromBase64(base64)
  }

  const binary = atob(base64)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

export function createBoardEditorLocation(board: Board) {
  const query: Record<string, string> = {
    name: board.name
  }

  if (board.team?.name) {
    query.teamName = board.team.name
  }

  return {
    path: `/board/${board.id}`,
    query
  }
}

export async function listBoards() {
  const response = await apiRequest<{ boards: Board[] }>(BOARD_API_ENDPOINTS.boards)
  return response.boards
}

export async function listBoardPages(boardId: string): Promise<Page[]> {
  const response = await apiRequest<{ pages: Page[] }>(BOARD_API_ENDPOINTS.pages(boardId))
  return response.pages
}

export async function createBoardPage(boardId: string, input: { name: string; position?: number }) {
  return apiRequest<Page>(BOARD_API_ENDPOINTS.pages(boardId), {
    method: 'POST',
    body: JSON.stringify(input)
  })
}

export async function updateBoardPage(
  boardId: string,
  pageId: string,
  input: { name?: string; position?: number }
) {
  return apiRequest<Page>(BOARD_API_ENDPOINTS.page(boardId, pageId), {
    method: 'PATCH',
    body: JSON.stringify(input)
  })
}

export async function deleteBoardPage(boardId: string, pageId: string): Promise<void> {
  await apiRequest<{ deleted: boolean }>(BOARD_API_ENDPOINTS.page(boardId, pageId), {
    method: 'DELETE'
  })
}

export async function fetchPageContent(
  boardId: string,
  pageId: string
): Promise<PageContentResponse | null> {
  const { response, data } = await requestJson<PageContentResponse>(
    BOARD_API_ENDPOINTS.pageContent(boardId, pageId)
  )

  if (response.status === 404) return null
  if (!response.ok) {
    const errorBody = data as ApiErrorBody | null
    throw new Error(errorBody?.error?.message ?? `Request failed with status ${response.status}`)
  }

  return data as PageContentResponse
}

export async function savePageContent(
  boardId: string,
  pageId: string,
  content: string
): Promise<void> {
  await apiRequest<{ saved: boolean }>(BOARD_API_ENDPOINTS.pageContent(boardId, pageId), {
    method: 'PUT',
    body: JSON.stringify({ content })
  })
}

export function createBoard(input: { name: string; teamId?: string | null } | string) {
  const payload = typeof input === 'string' ? { name: input } : input
  return apiRequest<Board>(BOARD_API_ENDPOINTS.boards, {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export function updateBoard(boardId: string, input: { name?: string; teamId?: string | null }) {
  return apiRequest<Board>(BOARD_API_ENDPOINTS.board(boardId), {
    method: 'PATCH',
    body: JSON.stringify(input)
  })
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
