import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import EditorToolbar from './EditorToolbar'

describe('EditorToolbar', () => {
  const fileInputRef = createRef<HTMLInputElement>()

  it('switches editor mode and triggers save', async () => {
    const user = userEvent.setup()
    const onEditorModeChange = vi.fn()
    const onSave = vi.fn()

    render(
      <EditorToolbar
        uiLocale="ko"
        editorMode="markdown"
        onEditorModeChange={onEditorModeChange}
        readOnly={false}
        saving={false}
        dirty
        canSave
        onSave={onSave}
        fileInputRef={fileInputRef}
        onFilePick={vi.fn()}
        onImageUploadClick={vi.fn()}
        onVideoEmbed={vi.fn()}
        uploading={false}
      />,
    )

    await user.click(screen.getByRole('button', { name: '시각 편집' }))
    expect(onEditorModeChange).toHaveBeenCalledWith('wysiwyg')

    await user.click(screen.getByRole('button', { name: /저장/ }))
    expect(onSave).toHaveBeenCalled()
  })

  it('calls video embed action', async () => {
    const user = userEvent.setup()
    const onVideoEmbed = vi.fn()

    render(
      <EditorToolbar
        uiLocale="ko"
        editorMode="wysiwyg"
        onEditorModeChange={vi.fn()}
        readOnly={false}
        saving={false}
        dirty={false}
        canSave={false}
        onSave={vi.fn()}
        fileInputRef={fileInputRef}
        onFilePick={vi.fn()}
        onImageUploadClick={vi.fn()}
        onVideoEmbed={onVideoEmbed}
        uploading={false}
      />,
    )

    await user.click(screen.getByTitle('YouTube / Vimeo embed'))
    expect(onVideoEmbed).toHaveBeenCalled()
  })
})
