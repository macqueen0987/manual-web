import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import AdminDialog from './AdminDialog'

describe('AdminDialog', () => {
  it('renders title, body, and footer when open', () => {
    render(
      <AdminDialog
        open
        title="Test dialog"
        onClose={vi.fn()}
        footer={<button type="button">OK</button>}
      >
        <p>Dialog body</p>
      </AdminDialog>,
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Test dialog')).toBeInTheDocument()
    expect(screen.getByText('Dialog body')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument()
  })

  it('calls onClose from cancel button in footer', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <AdminDialog
        open
        title="Close me"
        onClose={onClose}
        footer={
          <button type="button" onClick={onClose}>
            Cancel
          </button>
        }
      >
        Content
      </AdminDialog>,
    )

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalled()
  })
})
