import MDEditor from '@uiw/react-md-editor'
import type { RefObject } from 'react'

interface MarkdownEditorPaneProps {
  wrapRef: RefObject<HTMLDivElement | null>
  value: string
  onChange: (value: string) => void
  readOnly: boolean
}

export default function MarkdownEditorPane({
  wrapRef,
  value,
  onChange,
  readOnly,
}: MarkdownEditorPaneProps) {
  return (
    <div ref={wrapRef} className="min-h-[420px] flex-1">
      <MDEditor
        value={value}
        onChange={(v) => onChange(v ?? '')}
        preview={readOnly ? 'preview' : 'live'}
        hideToolbar={readOnly}
        height={520}
        visibleDragbar={!readOnly}
        textareaProps={{ readOnly }}
      />
    </div>
  )
}
