import {
  ANONYMOUS_ID_HEADER,
  apiRequest,
  clearAnonymousId,
  requestJson,
  type ApiErrorBody
} from '@/app/api/client'

const AUTH_API_BASE = '/api/auth'

export interface AuthSession {
  session: {
    id: string
    token: string
    userId: string
    expiresAt: string
    createdAt: string
    updatedAt: string
  }
  user: {
    id: string
    name: string
    email: string
    accessLevel: 'full' | 'invited-only'
    emailVerified: boolean
    image: string | null
    createdAt: string
    updatedAt: string
  }
}

interface SocialSignInResponse {
  redirect: boolean
  url?: string
  token?: string
  user?: AuthSession['user']
}

interface EmailAuthResponse {
  token?: string | null
  user?: AuthSession['user']
}

interface PasswordResetResponse {
  status: boolean
  message?: string
}

export interface MigrateAnonymousResponse {
  migrated: boolean
  migratedBoardCount: number
  removedOwnerCollaboratorCount: number
}

function currentCallbackURL() {
  if (typeof window === 'undefined') return '/account'
  return window.location.toString()
}

function getErrorMessage(data: ApiErrorBody | null, fallback: string) {
  const maybeMessage = (data as { message?: string } | null)?.message
  const topLevelMessage = typeof maybeMessage === 'string' ? maybeMessage : ''
  return data?.error?.message?.trim() || topLevelMessage.trim() || fallback
}

export async function getSession() {
  const { response, data } = await requestJson<AuthSession>(`${AUTH_API_BASE}/session`)

  if (response.status === 401) return null
  if (!response.ok) {
    throw new Error(getErrorMessage(data as ApiErrorBody | null, 'Failed to load session'))
  }

  return data as AuthSession
}

export async function loginWithGoogle(callbackURL = currentCallbackURL()) {
  const { response, data } = await requestJson<SocialSignInResponse>(
    `${AUTH_API_BASE}/sign-in/social`,
    {
      method: 'POST',
      body: JSON.stringify({
        provider: 'google',
        callbackURL,
        disableRedirect: true
      })
    }
  )

  if (!response.ok) {
    const message = getErrorMessage(data as ApiErrorBody | null, 'Failed to start Google login')
    if (response.status === 404 || response.status === 400) {
      throw new Error('Google login is not configured in this environment')
    }
    throw new Error(message)
  }

  const redirectUrl = (data as SocialSignInResponse | null)?.url?.trim()
  if (!redirectUrl) {
    throw new Error('Google login is not configured in this environment')
  }

  if (typeof window !== 'undefined') {
    window.location.assign(redirectUrl)
  }
}

export async function signInWithEmail(input: {
  email: string
  password: string
  callbackURL?: string
  rememberMe?: boolean
}) {
  const { response, data } = await requestJson<EmailAuthResponse>(`${AUTH_API_BASE}/sign-in/email`, {
    method: 'POST',
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      callbackURL: input.callbackURL,
      rememberMe: input.rememberMe ?? true
    })
  })

  if (!response.ok) {
    throw new Error(getErrorMessage(data as ApiErrorBody | null, 'Failed to sign in with email'))
  }

  return (data ?? null) as EmailAuthResponse | null
}

export async function signUpWithEmail(input: {
  email: string
  inviteToken: string
  name: string
  password: string
  callbackURL?: string
  rememberMe?: boolean
}) {
  const { response, data } = await requestJson<EmailAuthResponse>(`${AUTH_API_BASE}/sign-up/email`, {
    method: 'POST',
    body: JSON.stringify({
      name: input.name,
      email: input.email,
      password: input.password,
      callbackURL: input.callbackURL,
      rememberMe: input.rememberMe ?? true,
      inviteToken: input.inviteToken
    })
  })

  if (!response.ok) {
    throw new Error(getErrorMessage(data as ApiErrorBody | null, 'Failed to create account'))
  }

  return (data ?? null) as EmailAuthResponse | null
}

export async function requestPasswordReset(input: { email: string; redirectTo: string }) {
  const { response, data } = await requestJson<PasswordResetResponse>(
    `${AUTH_API_BASE}/request-password-reset`,
    {
      method: 'POST',
      body: JSON.stringify(input)
    }
  )

  if (!response.ok) {
    throw new Error(
      getErrorMessage(data as ApiErrorBody | null, 'Failed to send password reset email')
    )
  }

  return (data ?? { status: true }) as PasswordResetResponse
}

export async function resetPassword(input: { newPassword: string; token: string }) {
  const { response, data } = await requestJson<PasswordResetResponse>(`${AUTH_API_BASE}/reset-password`, {
    method: 'POST',
    body: JSON.stringify(input)
  })

  if (!response.ok) {
    throw new Error(getErrorMessage(data as ApiErrorBody | null, 'Failed to reset password'))
  }

  return (data ?? { status: true }) as PasswordResetResponse
}

export function logout() {
  return apiRequest<{ success: boolean }>(`${AUTH_API_BASE}/sign-out`, {
    method: 'POST'
  }).then((result) => {
    clearAnonymousId()
    return result
  })
}

export function migrateAnonymous(anonymousId: string) {
  return apiRequest<MigrateAnonymousResponse>(`${AUTH_API_BASE}/migrate-anonymous`, {
    method: 'POST',
    headers: {
      [ANONYMOUS_ID_HEADER]: anonymousId
    }
  })
}
