import { describe, expect, it, beforeEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { readStoredEditorMode, useEditorMode } from './useEditorMode'
import { mockLocalStorage } from '../test/helpers'

function mockLocalStorageForEditor() {
  mockLocalStorage()
  localStorage.clear()
}

describe('readStoredEditorMode', () => {
  beforeEach(() => {
    mockLocalStorageForEditor()
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

describe('useEditorMode', () => {
  beforeEach(() => {
    mockLocalStorageForEditor()
  })

  it('persists mode changes', () => {
    const { result } = renderHook(() => useEditorMode())
    expect(result.current.mode).toBe('markdown')

    act(() => {
      expect(result.current.setMode('wysiwyg')).toBe(true)
    })
    expect(result.current.mode).toBe('wysiwyg')
    expect(localStorage.getItem('manual-web-editor-mode')).toBe('wysiwyg')
  })

  it('blocks mode change when dirty without force', () => {
    const { result } = renderHook(() => useEditorMode())
    act(() => {
      expect(result.current.setMode('wysiwyg', { dirty: true })).toBe(false)
    })
    expect(result.current.mode).toBe('markdown')
  })

  it('uses confirm dialog for dirty requestModeChange', () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(false)
    const { result } = renderHook(() => useEditorMode())

    act(() => {
      expect(result.current.requestModeChange('wysiwyg', true, 'Discard?')).toBe(false)
    })
    expect(result.current.mode).toBe('markdown')
  })
})
