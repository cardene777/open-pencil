export const BOARD_API_ENDPOINTS = {
  boards: '/api/boards',
  board: (boardId: string) => `/api/boards/${boardId}`,
  content: (boardId: string) => `/api/boards/${boardId}/content`,
  invitations: (boardId: string) => `/api/boards/${boardId}/invitations`,
  invitation: (boardId: string, invitationId: string) =>
    `/api/boards/${boardId}/invitations/${invitationId}`,
  invite: '/api/invite',
  verifyInvite: '/api/invite/verify',
  acceptInvite: '/api/invite/accept'
} as const
