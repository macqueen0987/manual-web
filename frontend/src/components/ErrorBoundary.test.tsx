import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import ErrorBoundary from './ErrorBoundary'

vi.mock('../stores/localeStore', () => ({
  useLocaleStore: {
    getState: () => ({ locale: 'ko' as const }),
  },
}))

function BrokenChild() {
  throw new Error('boom')
}

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Safe content</div>
      </ErrorBoundary>,
    )
    expect(screen.getByText('Safe content')).toBeInTheDocument()
  })

  it('renders fallback UI when child throws', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <MemoryRouter>
        <ErrorBoundary>
          <BrokenChild />
        </ErrorBoundary>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: '문제가 발생했습니다' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '홈' })).toBeInTheDocument()
    errorSpy.mockRestore()
  })
})
