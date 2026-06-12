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
  return data?.error?.message?.trim() || fallback
}

export async function getSession() {
  try {
    const { response, data } = await requestJson<AuthSession>(`${AUTH_API_BASE}/session`)

    // 401 (未ログイン) と server エラー (5xx 等) は同じく null 返却し、 上位で「未認証」扱いにする。
    // 5xx を throw すると refreshSession 経由で unhandled rejection → toast 誤表示になるため抑制する。
    if (!response.ok) {
      if (response.status !== 401) {
        console.warn('[auth.getSession]', response.status, getErrorMessage(data as ApiErrorBody | null, 'session load failed'))
      }
      return null
    }

    return data as AuthSession
  } catch (error) {
    // network error (fetch reject) も同様に null 扱い、 toast 誤表示を抑制
    console.warn('[auth.getSession]', error)
    return null
  }
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

export interface EmailSignInInput {
  email: string
  password: string
  callbackURL?: string
}

export interface EmailSignUpInput {
  email: string
  password: string
  name: string
  callbackURL?: string
}

export async function signInWithEmail(input: EmailSignInInput) {
  const { response, data } = await requestJson<AuthSession>(
    `${AUTH_API_BASE}/sign-in/email`,
    {
      method: 'POST',
      body: JSON.stringify({
        email: input.email.trim(),
        password: input.password,
        callbackURL: input.callbackURL ?? currentCallbackURL()
      })
    }
  )

  if (!response.ok) {
    const flatMessage = (data as { message?: string } | null)?.message?.trim() || ''
    const message = flatMessage || getErrorMessage(data as ApiErrorBody | null, 'メールログインに失敗しました')
    throw new Error(message)
  }

  return data as AuthSession
}

export class EmailAlreadyExistsError extends Error {
  readonly code = 'USER_ALREADY_EXISTS' as const
  constructor() {
    super('アカウントが既に存在します。 ログイン tab を使ってください。')
    this.name = 'EmailAlreadyExistsError'
  }
}

export async function signUpWithEmail(input: EmailSignUpInput) {
  const { response, data } = await requestJson<AuthSession>(
    `${AUTH_API_BASE}/sign-up/email`,
    {
      method: 'POST',
      body: JSON.stringify({
        email: input.email.trim(),
        password: input.password,
        name: input.name.trim(),
        callbackURL: input.callbackURL ?? currentCallbackURL()
      })
    }
  )

  if (!response.ok) {
    const body = data as ApiErrorBody | null
    // better-auth は `{message, code}` の flat 形式でエラーを返す。 一般 API の `{error:{code,message}}` 形式も
    // 互換的に拾うため両方の経路で code を取得する。
    const flatCode = (data as { code?: string } | null)?.code?.toUpperCase() ?? ''
    const nestedCode = body?.error?.code?.toUpperCase() ?? ''
    const code = nestedCode || flatCode
    if (code.includes('USER_ALREADY_EXISTS') || code.includes('USER_EXISTS') || code === 'EMAIL_TAKEN') {
      throw new EmailAlreadyExistsError()
    }
    const flatMessage = (data as { message?: string } | null)?.message?.trim() || ''
    const message = flatMessage || getErrorMessage(body, '新規登録に失敗しました')
    throw new Error(message)
  }

  return data as AuthSession
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
