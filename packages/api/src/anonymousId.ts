import type { Context } from 'hono'

export const INKLY_ANONYMOUS_ID_HEADER = 'X-Inkly-Anonymous-Id'
export const INKLY_ANONYMOUS_ID_COOKIE = 'inkly_anonymous_id'

function parseCookieHeader(cookieHeader: string | null): Map<string, string> {
  const cookies = new Map<string, string>()
  if (!cookieHeader) return cookies

  for (const part of cookieHeader.split(';')) {
    const separatorIndex = part.indexOf('=')
    if (separatorIndex <= 0) continue

    const name = part.slice(0, separatorIndex).trim()
    const value = part.slice(separatorIndex + 1).trim()
    if (!name || !value) continue
    cookies.set(name, decodeURIComponent(value))
  }

  return cookies
}

export function resolveAnonymousIdFromRequest(request: Request): string | null {
  const headerValue = request.headers.get(INKLY_ANONYMOUS_ID_HEADER)?.trim()
  if (headerValue) return headerValue

  const cookieValue = parseCookieHeader(request.headers.get('cookie')).get(
    INKLY_ANONYMOUS_ID_COOKIE
  )
  return cookieValue?.trim() || null
}

export function resolveAnonymousId(c: Context): string {
  const existing = resolveAnonymousIdFromRequest(c.req.raw)
  const anonymousId = existing && existing.length > 0 ? existing : crypto.randomUUID()
  c.header(INKLY_ANONYMOUS_ID_HEADER, anonymousId)
  return anonymousId
}
