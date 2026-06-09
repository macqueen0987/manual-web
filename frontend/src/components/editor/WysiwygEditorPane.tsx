import { useEffect, useRef } from 'react'
import { Editor } from '@toast-ui/react-editor'
import '@toast-ui/editor/dist/toastui-editor.css'
import { docHtmlSanitizer } from '../../utils/docHtmlSanitizer'

export interface WysiwygEditorHandle {
  getMarkdown: () => string
  insertText: (text: string) => void
}

interface WysiwygEditorPaneProps {
  editorKey: string
  initialMarkdown: string
  readOnly: boolean
  onChange: () => void
  onUploadImage: (file: File, callback: (url: string) => void) => void
  editorRef: React.MutableRefObject<WysiwygEditorHandle | null>
}

export default function WysiwygEditorPane({
  editorKey,
  initialMarkdown,
  readOnly,
  onChange,
  onUploadImage,
  editorRef,
}: WysiwygEditorPaneProps) {
  const innerRef = useRef<Editor>(null)

  useEffect(() => {
    const instance = innerRef.current?.getInstance()
    if (!instance) return
    editorRef.current = {
      getMarkdown: () => instance.getMarkdown(),
      insertText: (text: string) => {
        instance.insertText(text)
      },
    }
    return () => {
      editorRef.current = null
    }
  }, [editorKey, editorRef])

  useEffect(() => {
    const instance = innerRef.current?.getInstance()
    if (!instance) return
    const current = instance.getMarkdown()
    if (current !== initialMarkdown) {
      instance.setMarkdown(initialMarkdown, false)
    }
  }, [editorKey, initialMarkdown])

  return (
    <div className="min-h-[420px] flex-1 rounded-lg border border-stone-200 bg-white">
      <Editor
        key={editorKey}
        ref={innerRef}
        initialValue={initialMarkdown}
        previewStyle="vertical"
        height="520px"
        initialEditType="wysiwyg"
        useCommandShortcut={!readOnly}
        hideModeSwitch
        toolbarItems={
          readOnly
            ? []
            : [
                ['heading', 'bold', 'italic', 'strike'],
                ['hr', 'quote'],
                ['ul', 'ol', 'indent', 'outdent'],
                ['table', 'link'],
                ['code', 'codeblock'],
              ]
        }
        hooks={{
          addImageBlobHook: (blob, callback) => {
            const file = blob instanceof File ? blob : new File([blob], 'paste.png', { type: blob.type })
            onUploadImage(file, (url) => callback(url, 'image'))
          },
        }}
        onChange={onChange}
        readOnly={readOnly}
        customHTMLSanitizer={docHtmlSanitizer}
      />
    </div>
  )
}
