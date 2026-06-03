import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useEnsureUser } from './useEnsureUser'

const fetchUserProfile = vi.fn()

vi.mock('../../stores/authStore', () => ({
  useAuthStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      user: null,
      hasSession: true,
      sessionReady: true,
      fetchUserProfile,
    }),
}))

function Probe() {
  useEnsureUser()
  return null
}

describe('useEnsureUser', () => {
  it('fetches profile when session exists without user', () => {
    fetchUserProfile.mockClear()
    render(<Probe />)
    expect(fetchUserProfile).toHaveBeenCalled()
  })
})
