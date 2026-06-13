export const BOARD_API_ENDPOINTS = {
  boards: '/api/boards',
  board: (boardId: string) => `/api/boards/${boardId}`,
  startFrame: (boardId: string) => `/api/boards/${boardId}/start-frame`,
  document: (boardId: string) => `/api/boards/${boardId}/document`,
  documentVersions: (boardId: string) => `/api/boards/${boardId}/document-versions`,
  documentVersionRestore: (boardId: string, versionId: string) =>
    `/api/boards/${boardId}/document-versions/${versionId}/restore`,
  preview: (boardId: string) => `/api/boards/${boardId}/preview`,
  pins: '/api/board-pins',
  pin: (boardId: string) => `/api/boards/${boardId}/pin`,
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
