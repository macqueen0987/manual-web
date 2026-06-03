import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import EditorWorkspace from './EditorWorkspace'

vi.mock('../../components/editor/EditorToolbar', () => ({
  default: () => <div>Toolbar</div>,
}))

vi.mock('../../components/editor/MarkdownEditorPane', () => ({
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea aria-label="markdown" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}))

vi.mock('../../components/editor/WysiwygEditorPane', () => ({
  default: () => <div>WYSIWYG</div>,
}))

describe('EditorWorkspace', () => {
  const baseProps = {
    isNewDoc: false,
    selectedDocSlug: '',
    selectedDocId: null,
    canEdit: true,
    openNewPageModal: vi.fn(),
    imageInputRef: createRef(),
    fileInputRef: createRef(),
    editorWrapRef: createRef(),
    wysiwygEditorRef: createRef(),
    uiLocale: 'ko' as const,
    editorMode: 'markdown' as const,
    onEditorModeChange: vi.fn(),
    saving: false,
    dirty: false,
    onSave: vi.fn(),
    onMediaUpload: vi.fn(),
    onVideoEmbed: vi.fn(),
    uploading: false,
    selectedProduct: 'alpha',
    selectedVersion: 'latest',
    editorPaneKey: 'key',
    content: '# Hello',
    onContentChange: vi.fn(),
    onDirty: vi.fn(),
    setUploading: vi.fn(),
  }

  it('shows empty selection prompt', async () => {
    const user = userEvent.setup()
    const openNewPageModal = vi.fn()

    render(<EditorWorkspace {...baseProps} openNewPageModal={openNewPageModal} />)

    expect(screen.getByText('편집할 페이지를 선택하세요')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '새 페이지 만들기' }))
    expect(openNewPageModal).toHaveBeenCalled()
  })

  it('renders markdown editor when doc selected', () => {
    render(
      <EditorWorkspace
        {...baseProps}
        selectedDocSlug="guide"
        selectedDocId={1}
      />,
    )

    expect(screen.getByLabelText('markdown')).toHaveValue('# Hello')
    expect(screen.getByText('Toolbar')).toBeInTheDocument()
  })
})
