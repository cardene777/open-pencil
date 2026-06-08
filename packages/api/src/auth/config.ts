export const INKLY_API_AUTH_BASE_PATH = '/api/auth'

export interface GoogleOAuthConfig {
  clientId: string
  clientSecret: string
}

export interface InklyAuthConfig {
  basePath: string
  baseURL: string
  secret: string
  google: GoogleOAuthConfig | null
  allowedEmailDomains: string[]
  enableTestUtils: boolean
  trustedOrigins: string[]
  warnings: string[]
}

const DEFAULT_TRUSTED_ORIGINS = ['http://localhost:1420', 'http://127.0.0.1:1420']
const DEFAULT_BASE_URL = 'http://localhost:3001'

export interface ResolveInklyAuthConfigOptions {
  env?: NodeJS.ProcessEnv
  fallbackSecret: string
}

function readEnv(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : null
}

function readEnvFlag(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes'
}

function readCsvEnv(value: string | undefined): string[] {
  const trimmed = value?.trim()
  if (!trimmed) return []

  return trimmed
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0)
}

export function isAllowedEmailDomain(email: string, allowedEmailDomains: string[]) {
  const normalizedEmail = email.trim().toLowerCase()
  return allowedEmailDomains.some((domain) => normalizedEmail.endsWith(`@${domain}`))
}

export function resolveAccessLevelForEmail(
  email: string,
  allowedEmailDomains: string[]
): 'full' | 'invited-only' {
  if (allowedEmailDomains.length === 0) {
    return 'full'
  }

  return isAllowedEmailDomain(email, allowedEmailDomains) ? 'full' : 'invited-only'
}

export function resolveInklyAuthConfig(options: ResolveInklyAuthConfigOptions): InklyAuthConfig {
  const env = options.env ?? process.env
  const warnings: string[] = []
  const authSecret = readEnv(env.INKLY_API_AUTH_SECRET)
  const googleClientId = readEnv(env.INKLY_API_GOOGLE_CLIENT_ID)
  const googleClientSecret = readEnv(env.INKLY_API_GOOGLE_CLIENT_SECRET)
  const enableTestUtils = readEnvFlag(env.INKLY_API_AUTH_ENABLE_TEST_UTILS)
  const trustedOriginsEnv = readEnv(env.INKLY_API_TRUSTED_ORIGINS)
  const allowedEmailDomains = readCsvEnv(env.INKLY_API_ALLOWED_EMAIL_DOMAINS)
  const trustedOrigins = trustedOriginsEnv
    ? trustedOriginsEnv
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0)
    : DEFAULT_TRUSTED_ORIGINS
  const baseURL = readEnv(env.BETTER_AUTH_URL) ?? readEnv(env.INKLY_API_BASE_URL) ?? DEFAULT_BASE_URL

  if (!authSecret) {
    warnings.push(
      '[inkly-api] INKLY_API_AUTH_SECRET is not set; falling back to the API JWT secret for Better Auth.'
    )
  }

  let google: GoogleOAuthConfig | null = null

  if (googleClientId && googleClientSecret) {
    google = {
      clientId: googleClientId,
      clientSecret: googleClientSecret
    }
  } else if (googleClientId || googleClientSecret) {
    warnings.push(
      '[inkly-api] Google OAuth is disabled because INKLY_API_GOOGLE_CLIENT_ID and INKLY_API_GOOGLE_CLIENT_SECRET must both be set.'
    )
  } else {
    warnings.push(
      '[inkly-api] Google OAuth is disabled because Google client credentials are not configured. Anonymous routes remain available.'
    )
  }

  return {
    basePath: INKLY_API_AUTH_BASE_PATH,
    baseURL,
    secret: authSecret ?? options.fallbackSecret,
    google,
    allowedEmailDomains,
    enableTestUtils,
    trustedOrigins,
    warnings
  }
}
