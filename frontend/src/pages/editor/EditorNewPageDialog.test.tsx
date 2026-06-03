import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import EditorNewPageDialog from './EditorNewPageDialog'

describe('EditorNewPageDialog', () => {
  it('creates page with selected parent', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    const onClose = vi.fn()

    render(
      <EditorNewPageDialog
        open
        flatDocs={[
          { id: 1, title: 'Guide', slug: 'guide', parent_id: null },
          { id: 2, title: 'Setup', slug: 'setup', parent_id: 1 },
        ]}
        newPageParentId={2}
        canEdit
        onClose={onClose}
        onParentChange={vi.fn()}
        onCreate={onCreate}
      />,
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '만들기' }))
    expect(onCreate).toHaveBeenCalled()
  })

  it('closes on cancel', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <EditorNewPageDialog
        open
        flatDocs={[]}
        newPageParentId=""
        canEdit
        onClose={onClose}
        onParentChange={vi.fn()}
        onCreate={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: '취소' }))
    expect(onClose).toHaveBeenCalled()
  })
})
