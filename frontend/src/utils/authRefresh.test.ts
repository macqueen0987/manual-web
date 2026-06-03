import { describe, expect, it } from 'vitest'
import { getStoredTokens, refresh, refreshAccessToken } from './authRefresh'

describe('authRefresh re-exports', () => {
  it('re-exports sessionService helpers', () => {
    expect(refresh).toBeTypeOf('function')
    expect(refreshAccessToken).toBe(refresh)
    expect(getStoredTokens).toBeTypeOf('function')
  })
})
