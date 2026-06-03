import { createRef } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import MarkdownEditorPane from './MarkdownEditorPane'

vi.mock('@uiw/react-md-editor', () => ({
  default: ({
    value,
    onChange,
  }: {
    value: string
    onChange: (value: string | undefined) => void
  }) => (
    <textarea
      data-testid="md-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}))

describe('MarkdownEditorPane', () => {
  it('forwards markdown changes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const wrapRef = createRef<HTMLDivElement>()

    render(
      <MarkdownEditorPane
        wrapRef={wrapRef}
        value="# Hello"
        onChange={onChange}
        readOnly={false}
      />,
    )

    await user.clear(screen.getByTestId('md-editor'))
    await user.type(screen.getByTestId('md-editor'), 'Updated')
    expect(onChange).toHaveBeenCalled()
  })
})
