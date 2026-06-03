import { createRef, forwardRef, useImperativeHandle } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import WysiwygEditorPane, { type WysiwygEditorHandle } from './WysiwygEditorPane'

vi.mock('@toast-ui/react-editor', () => ({
  Editor: forwardRef(function MockEditor(_props, ref) {
    useImperativeHandle(ref, () => ({
      getInstance: () => ({
        getMarkdown: () => '# hello',
        setMarkdown: vi.fn(),
        insertText: vi.fn(),
      }),
    }))
    return <div data-testid="wysiwyg-editor" />
  }),
}))

describe('WysiwygEditorPane', () => {
  it('renders editor and exposes handle ref', () => {
    const editorRef = createRef<WysiwygEditorHandle | null>()

    render(
      <WysiwygEditorPane
        editorKey="doc-1"
        initialMarkdown="# hello"
        readOnly={false}
        onChange={vi.fn()}
        onUploadImage={vi.fn()}
        editorRef={editorRef}
      />,
    )

    expect(screen.getByTestId('wysiwyg-editor')).toBeInTheDocument()
    expect(editorRef.current?.getMarkdown()).toBe('# hello')
  })
})
