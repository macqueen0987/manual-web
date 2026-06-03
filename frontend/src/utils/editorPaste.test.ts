import { describe, expect, it, vi } from 'vitest'
import {
  getEditorTextarea,
  getImageFromClipboard,
  insertAtSelection,
  isPasteableUrl,
  markdownLink,
  normalizePasteUrl,
} from './editorPaste'

describe('isPasteableUrl', () => {
  it('accepts bare domains and rejects whitespace', () => {
    expect(isPasteableUrl('example.com/docs')).toBe(true)
    expect(isPasteableUrl('https://example.com')).toBe(true)
    expect(isPasteableUrl('not a url')).toBe(false)
    expect(isPasteableUrl('')).toBe(false)
  })
})

describe('normalizePasteUrl', () => {
  it('adds https when scheme missing', () => {
    expect(normalizePasteUrl('example.com')).toBe('https://example.com')
    expect(normalizePasteUrl('http://example.com')).toBe('http://example.com')
  })
})

describe('insertAtSelection', () => {
  it('splices snippet into content', () => {
    expect(insertAtSelection('hello world', '!', 5, 5)).toBe('hello! world')
    expect(insertAtSelection('abc', 'Z', 1, 3)).toBe('aZ')
  })
})

describe('markdownLink', () => {
  it('escapes brackets in label and normalizes url', () => {
    expect(markdownLink('[label]', 'example.com')).toBe('[label](https://example.com)')
  })
})

describe('getEditorTextarea', () => {
  it('finds textarea inside container', () => {
    const container = document.createElement('div')
    const textarea = document.createElement('textarea')
    container.appendChild(textarea)
    expect(getEditorTextarea(container)).toBe(textarea)
    expect(getEditorTextarea(document.createElement('div'))).toBeNull()
  })
})

describe('getImageFromClipboard', () => {
  it('returns image file from clipboard files', () => {
    const file = new File(['x'], 'photo.png', { type: 'image/png' })
    const event = {
      clipboardData: {
        files: [file],
        items: [],
        getData: () => '',
      },
    } as unknown as ClipboardEvent
    expect(getImageFromClipboard(event)).toBe(file)
  })

  it('parses data URL from pasted HTML', () => {
    const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    const dataUrl = `data:image/png;base64,${png}`
    const event = {
      clipboardData: {
        files: [],
        items: [],
        getData: (type: string) =>
          type === 'text/html' ? `<img src="${dataUrl}" />` : '',
      },
    } as unknown as ClipboardEvent
    const result = getImageFromClipboard(event)
    expect(result).toBeInstanceOf(File)
    expect(result?.type).toBe('image/png')
  })

  it('returns null when clipboard is empty', () => {
    expect(getImageFromClipboard({ clipboardData: null } as ClipboardEvent)).toBeNull()
  })
})

describe('focusTextareaAt', () => {
  it('focuses textarea on next animation frame', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
    const { focusTextareaAt } = await import('./editorPaste')
    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
    const focusSpy = vi.spyOn(textarea, 'focus')

    focusTextareaAt(textarea, 3)
    expect(focusSpy).not.toHaveBeenCalled()

    await vi.runAllTimersAsync()
    expect(focusSpy).toHaveBeenCalled()

    textarea.remove()
    vi.useRealTimers()
  })
})
