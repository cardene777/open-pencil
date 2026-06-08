type LocationLike = Pick<Location, 'pathname' | 'search'>

function normalizeLocation(locationLike?: LocationLike | URL | string | null): LocationLike | null {
  if (!locationLike) return null

  if (typeof locationLike === 'string') {
    const url = new URL(locationLike, 'https://inkly.local')
    return {
      pathname: url.pathname,
      search: url.search
    }
  }

  return {
    pathname: locationLike.pathname,
    search: locationLike.search
  }
}

function decodeSegment(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function resolveBoardIdFromLocation(
  locationLike?: LocationLike | URL | string | null
): string | null {
  const location = normalizeLocation(locationLike)
  if (!location) return null

  const boardMatch = location.pathname.match(/^\/board\/([^/]+)/)
  if (boardMatch?.[1]) return decodeSegment(boardMatch[1])

  const queryBoardId = new URLSearchParams(location.search).get('board')?.trim()
  return queryBoardId && queryBoardId.length > 0 ? queryBoardId : null
}

export function resolveBoardNameFromLocation(
  locationLike?: LocationLike | URL | string | null
): string | null {
  const location = normalizeLocation(locationLike)
  if (!location) return null

  const boardName = new URLSearchParams(location.search).get('name')?.trim()
  return boardName && boardName.length > 0 ? boardName : null
}
