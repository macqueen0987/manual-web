import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import EditorPageBar from './EditorPageBar'

describe('EditorPageBar', () => {
  it('switches locale via tabs', async () => {
    const user = userEvent.setup()
    const onSwitchLocale = vi.fn()

    render(
      <EditorPageBar
        uiLocale="ko"
        editLocale="ko"
        isNewDoc={false}
        selectedDocId={1}
        localeAvailable
        dirty={false}
        title="Guide"
        canEdit
        settingsOpen={false}
        flatDocs={[]}
        invalidParentIds={new Set()}
        parentId=""
        onSwitchLocale={onSwitchLocale}
        onTitleChange={vi.fn()}
        onToggleSettings={vi.fn()}
        onParentChange={vi.fn()}
        onMoveParent={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('tab', { name: 'English' }))
    expect(onSwitchLocale).toHaveBeenCalledWith('en')
  })

  it('shows unsaved indicator when dirty', () => {
    render(
      <EditorPageBar
        uiLocale="ko"
        editLocale="ko"
        isNewDoc
        selectedDocId={null}
        localeAvailable
        dirty
        title=""
        canEdit
        settingsOpen={false}
        flatDocs={[]}
        invalidParentIds={new Set()}
        parentId=""
        onSwitchLocale={vi.fn()}
        onTitleChange={vi.fn()}
        onToggleSettings={vi.fn()}
        onParentChange={vi.fn()}
        onMoveParent={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.getByText('저장되지 않음')).toBeInTheDocument()
  })
})
