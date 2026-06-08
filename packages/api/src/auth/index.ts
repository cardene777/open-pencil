import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth'
import { customSession, testUtils } from 'better-auth/plugins'
import { asc, eq } from 'drizzle-orm'

import type { ApiDatabase } from '../db/client.js'
import { accounts, users } from '../db/schema.js'
import * as schema from '../db/schema.js'
import type { InvitationEmailSender } from '../email/resend.js'
import { INKLY_API_AUTH_BASE_PATH, resolveInklyAuthConfig } from './config.js'

export interface InklyAuthSession {
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
    providerId: string | null
    emailVerified: boolean
    image: string | null
    createdAt: string
    updatedAt: string
  }
}

export interface InklyAuthTestSessionInput {
  email?: string
  name?: string
  image?: string | null
}

export interface InklyAuthTestSession extends InklyAuthSession {
  setCookieHeaders: string[]
}

export interface InklyAuth {
  handler(request: Request): Promise<Response>
  getSession?(request: Request): Promise<InklyAuthSession | null>
  createTestSession?(input: InklyAuthTestSessionInput): Promise<InklyAuthTestSession>
}

export interface CreateInklyAuthOptions {
  database: ApiDatabase
  emailSender?: InvitationEmailSender
  env?: NodeJS.ProcessEnv
  fallbackSecret: string
  logger?: Pick<Console, 'warn'>
}

interface BetterAuthTestContext {
  test: {
    createUser(input: { email: string; name: string; image: string | null }): unknown
    saveUser(input: unknown): Promise<{ id: string }>
    login(input: { userId: string }): Promise<{
      session: {
        id: string
        token: string
        userId: string
        expiresAt: Date
        createdAt: Date
        updatedAt: Date
      }
      user: {
        id: string
        name: string
        email: string
        emailVerified: boolean
        image: string | null
        createdAt: Date
        updatedAt: Date
      }
      cookies: Array<{
        name: string
        value: string
        domain: string
        path: string
        httpOnly?: boolean
        secure?: boolean
        sameSite?: 'Lax' | 'Strict' | 'None'
        expires?: number
        maxAge?: number
      }>
    }>
  }
}

interface SessionUserInput {
  id: string
  name: string
  email: string
  providerId: string | null
  emailVerified: boolean
  image?: string | null
  createdAt: Date | string
  updatedAt: Date | string
}

function setSessionPathname(url: URL, basePath: string) {
  url.pathname = `${basePath.replace(/\/+$/, '')}/get-session`
}

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value
}

function mapSessionUser(user: SessionUserInput): InklyAuthSession['user'] {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    providerId: user.providerId,
    emailVerified: user.emailVerified,
    image: user.image ?? null,
    createdAt: toIsoString(user.createdAt),
    updatedAt: toIsoString(user.updatedAt)
  }
}

async function resolveUserProviderId(database: ApiDatabase, userId: string) {
  const account = await database.db
    .select({ providerId: accounts.providerId })
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .orderBy(asc(accounts.createdAt))
    .get()

  return account?.providerId ?? null
}

async function ensureUserAccount(
  database: ApiDatabase,
  input: {
    userId: string
    email: string
    providerId: string
  }
) {
  const existingAccount = await database.db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.userId, input.userId))
    .orderBy(asc(accounts.createdAt))
    .get()

  if (existingAccount) return

  const timestamp = new Date()

  await database.db
    .insert(accounts)
    .values({
      id: crypto.randomUUID(),
      accountId: input.email,
      providerId: input.providerId,
      userId: input.userId,
      createdAt: timestamp,
      updatedAt: timestamp
    })
    .run()
}

function serializeTestCookie(
  cookie: {
    name: string
    value: string
    domain: string
    path: string
    httpOnly?: boolean
    secure?: boolean
    sameSite?: 'Lax' | 'Strict' | 'None'
    expires?: number
    maxAge?: number
  },
  fallbackExpires?: number
) {
  const parts = [`${cookie.name}=${cookie.value}`, `Path=${cookie.path || '/'}`]

  if (cookie.domain) parts.push(`Domain=${cookie.domain}`)
  if (cookie.httpOnly) parts.push('HttpOnly')
  if (cookie.secure) parts.push('Secure')
  if (cookie.sameSite) parts.push(`SameSite=${cookie.sameSite}`)
  if (typeof cookie.maxAge === 'number') {
    parts.push(`Max-Age=${cookie.maxAge}`)
  }

  const expiresAt =
    typeof cookie.expires === 'number' && cookie.expires > Date.now()
      ? cookie.expires
      : fallbackExpires

  if (typeof expiresAt === 'number') {
    parts.push(`Expires=${new Date(expiresAt).toUTCString()}`)
  }

  return parts.join('; ')
}

async function getSessionFromHandler(
  auth: Pick<InklyAuth, 'handler'>,
  request: Request,
  basePath = INKLY_API_AUTH_BASE_PATH
): Promise<InklyAuthSession | null> {
  const url = new URL(request.url)
  setSessionPathname(url, basePath)

  const response = await auth.handler(
    new Request(url, {
      method: 'GET',
      headers: request.headers
    })
  )

  if (!response.ok) return null
  const payload = (await response.json().catch(() => null)) as InklyAuthSession | null

  if (!payload?.session?.userId || !payload.user?.id) return null
  return payload
}

export function getAuthSession(auth: InklyAuth, request: Request) {
  if (auth.getSession) {
    return auth.getSession(request)
  }

  return getSessionFromHandler(auth, request)
}

export function createInklyAuth(options: CreateInklyAuthOptions): InklyAuth {
  const config = resolveInklyAuthConfig({
    env: options.env,
    fallbackSecret: options.fallbackSecret
  })

  for (const warning of config.warnings) {
    options.logger?.warn(warning)
  }

  const auth = betterAuth({
    basePath: config.basePath,
    baseURL: config.baseURL,
    secret: config.secret,
    trustedOrigins: config.trustedOrigins,
    database: drizzleAdapter(options.database.db, {
      provider: 'sqlite',
      schema,
      usePlural: true
    }),
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      requireEmailVerification: false,
      minPasswordLength: 8,
      sendResetPassword: async ({ user, url }) => {
        if (!options.emailSender) {
          options.logger?.warn(
            `[inkly-api] Password reset requested for ${user.email}, but no email sender is configured.`
          )
          return
        }

        await options.emailSender.sendPasswordReset({
          to: user.email,
          resetUrl: url,
          userName: user.name
        })
      }
    },
    plugins: [
      customSession(async ({ session, user }) => {
        const providerId = await resolveUserProviderId(options.database, session.userId)

        return {
          session,
          user: {
            ...user,
            providerId
          }
        }
      }),
      ...(config.enableTestUtils ? [testUtils()] : [])
    ],
    socialProviders: config.google
      ? {
          google: {
            clientId: config.google.clientId,
            clientSecret: config.google.clientSecret,
            // Google OAuth の profile レスポンスから picture URL を image にマッピング
            mapProfileToUser: (profile) => ({
              name: profile.name,
              email: profile.email,
              image: profile.picture ?? null,
              emailVerified: profile.email_verified ?? false
            })
          }
        }
      : undefined
  })

  const inklyAuth: InklyAuth = {
    handler(request) {
      return auth.handler(request)
    },
    getSession(request) {
      return getSessionFromHandler(
        {
          handler: (sessionRequest) => auth.handler(sessionRequest)
        },
        request,
        config.basePath
      )
    }
  }

  if (!config.enableTestUtils) {
    return inklyAuth
  }

  return {
    ...inklyAuth,
    async createTestSession(input) {
      const email = input.email?.trim() || 'mock-user@inkly.test'
      const name = input.name?.trim() || 'Mock Inkly User'
      const image = input.image ?? null
      const context = (await auth.$context) as typeof auth.$context extends Promise<infer T>
        ? T & BetterAuthTestContext
        : BetterAuthTestContext

      const existingUser = await options.database.db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .get()
      const savedUser =
        existingUser ??
        (await context.test.saveUser(
          context.test.createUser({
            email,
            name,
            image
          })
        ))
      await ensureUserAccount(options.database, {
        userId: savedUser.id,
        email,
        providerId: 'google'
      })

      const login = await context.test.login({ userId: savedUser.id })
      const providerId = await resolveUserProviderId(options.database, login.user.id)

      return {
        session: {
          id: login.session.id,
          token: login.session.token,
          userId: login.session.userId,
          expiresAt: login.session.expiresAt.toISOString(),
          createdAt: login.session.createdAt.toISOString(),
          updatedAt: login.session.updatedAt.toISOString()
        },
        user: mapSessionUser({
          ...login.user,
          providerId
        }),
        setCookieHeaders: login.cookies.map((cookie: (typeof login.cookies)[number]) =>
          serializeTestCookie(cookie, login.session.expiresAt.getTime())
        )
      }
    }
  }
}
