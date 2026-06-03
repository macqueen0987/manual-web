import { useCallback, useState } from 'react'

export type EditorMode = 'markdown' | 'wysiwyg'

const STORAGE_KEY = 'manual-web-editor-mode'

export function readStoredEditorMode(): EditorMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'wysiwyg' || raw === 'markdown') return raw
  } catch {
    /* ignore */
  }
  return 'markdown'
}

export function useEditorMode() {
  const [mode, setModeState] = useState<EditorMode>(readStoredEditorMode)

  const setMode = useCallback((next: EditorMode, options?: { force?: boolean; dirty?: boolean }) => {
    if (mode === next) return true
    if (options?.dirty && !options?.force) {
      return false
    }
    setModeState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
    return true
  }, [mode])

  const requestModeChange = useCallback(
    (next: EditorMode, dirty: boolean, confirmMessage: string): boolean => {
      if (mode === next) return true
      if (dirty && !window.confirm(confirmMessage)) {
        return false
      }
      setModeState(next)
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        /* ignore */
      }
      return true
    },
    [mode],
  )

  return { mode, setMode, requestModeChange }
}
