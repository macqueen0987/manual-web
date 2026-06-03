import { describe, expect, it, beforeEach, vi } from 'vitest'
import { readStoredEditorMode } from './useEditorMode'

function mockLocalStorage() {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  })
}

describe('readStoredEditorMode', () => {
  beforeEach(() => {
    mockLocalStorage()
    localStorage.clear()
  })

  it('defaults to markdown when unset', () => {
    expect(readStoredEditorMode()).toBe('markdown')
  })

  it('reads wysiwyg from localStorage', () => {
    localStorage.setItem('manual-web-editor-mode', 'wysiwyg')
    expect(readStoredEditorMode()).toBe('wysiwyg')
  })

  it('ignores invalid values', () => {
    localStorage.setItem('manual-web-editor-mode', 'invalid')
    expect(readStoredEditorMode()).toBe('markdown')
  })
})
