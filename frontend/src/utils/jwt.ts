export function getJwtExpiry(token: string): number | null {
  try {
    const segment = token.split('.')[1]
    if (!segment) return null
    const payload = JSON.parse(atob(segment.replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.exp === 'number' ? payload.exp : null
  } catch {
    return null
  }
}

export function isAccessTokenExpired(token: string, skewSeconds = 30): boolean {
  const exp = getJwtExpiry(token)
  if (exp === null) return true
  return Date.now() / 1000 >= exp - skewSeconds
}
