import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Toast from './Toast'

describe('Toast', () => {
  it('renders success message and dismisses on click', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()

    render(
      <Toast toast={{ text: 'Saved', variant: 'success' }} onDismiss={onDismiss} />,
    )

    expect(screen.getByRole('status')).toHaveTextContent('Saved')
    await user.click(screen.getByRole('button', { name: 'Dismiss notification' }))
    expect(onDismiss).toHaveBeenCalled()
  })

  it('returns null when toast is absent', () => {
    const { container } = render(<Toast toast={null} onDismiss={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })
})
