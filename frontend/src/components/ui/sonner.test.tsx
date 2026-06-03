import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('sonner', () => ({
  Toaster: ({ className }: { className?: string }) => (
    <div data-testid="sonner-root" className={className} />
  ),
}))

import { Toaster } from './sonner'

describe('Toaster', () => {
  it('renders sonner wrapper with className', () => {
    render(<Toaster />)
    expect(screen.getByTestId('sonner-root')).toHaveClass('toaster')
  })
})
