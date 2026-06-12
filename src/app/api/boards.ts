export const BOARD_API_ENDPOINTS = {
  boards: '/api/boards',
  board: (boardId: string) => `/api/boards/${boardId}`,
  share: (boardId: string) => `/api/boards/${boardId}/share`,
  invitations: (boardId: string) => `/api/boards/${boardId}/invitations`,
  invitation: (boardId: string, invitationId: string) =>
    `/api/boards/${boardId}/invitations/${invitationId}`,
  internalUsers: '/api/internal-users',
  invite: '/api/invite',
  verifyInvite: '/api/invite/verify',
  redeemInvite: '/api/invite/redeem',
  checkInvited: '/api/invite/check'
} as const
