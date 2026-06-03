import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { getJwtExpiry, isAccessTokenExpired } from './jwt'
import { makeJwt } from '../test/helpers'

describe('getJwtExpiry', () => {
  it('reads exp from payload', () => {
    expect(getJwtExpiry(makeJwt({ exp: 1_700_000_000 }))).toBe(1_700_000_000)
  })

  it('returns null for invalid tokens', () => {
    expect(getJwtExpiry('not-a-jwt')).toBeNull()
    expect(getJwtExpiry(makeJwt({ sub: 'user' }))).toBeNull()
  })
})

describe('isAccessTokenExpired', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('treats missing exp as expired', () => {
    expect(isAccessTokenExpired(makeJwt({ sub: 'x' }))).toBe(true)
  })

  it('applies skew before expiry', () => {
    const now = Math.floor(Date.now() / 1000)
    const token = makeJwt({ exp: now + 60 })
    expect(isAccessTokenExpired(token, 30)).toBe(false)

    vi.setSystemTime(new Date((now + 31) * 1000))
    expect(isAccessTokenExpired(token, 30)).toBe(true)
  })
})
