const URL_RE =
  /^(?:https?:\/\/)?(?:[\w-]+\.)+[\w-]+(?:\/[^\s]*)?$/i

export function getEditorTextarea(container: HTMLElement): HTMLTextAreaElement | null {
  return container.querySelector('textarea')
}

function dataUrlToFile(dataUrl: string): File | null {
  const match = dataUrl.match(/^data:([\w/+.-]+);base64,(.+)$/s)
  if (!match) return null
  const [, mime, b64] = match
  if (!mime.startsWith('image/')) return null
  try {
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
    const ext = mime.split('/')[1]?.replace('jpeg', 'jpg') || 'png'
    return new File([bytes], `pasted-image-${Date.now()}.${ext}`, { type: mime })
  } catch {
    return null
  }
}

function fileFromClipboardItem(item: DataTransferItem): File | null {
  if (item.kind !== 'file' || !item.type.startsWith('image/')) return null
  const blob = item.getAsFile()
  if (!blob) return null
  const ext = item.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png'
  return new File([blob], `pasted-image-${Date.now()}.${ext}`, { type: item.type })
}

export function getImageFromClipboard(event: ClipboardEvent): File | null {
  const data = event.clipboardData
  if (!data) return null

  for (const file of Array.from(data.files)) {
    if (file.type.startsWith('image/')) return file
  }

  for (const item of Array.from(data.items)) {
    const file = fileFromClipboardItem(item)
    if (file) return file
  }

  const html = data.getData('text/html')
  if (html) {
    const srcMatch = html.match(/<img[^>]+src=["'](data:image\/[^"']+)["']/i)
    if (srcMatch?.[1]) {
      const file = dataUrlToFile(srcMatch[1])
      if (file) return file
    }
  }

  return null
}

export function isPasteableUrl(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed || /\s/.test(trimmed)) return false
  return URL_RE.test(trimmed)
}

export function normalizePasteUrl(text: string): string {
  const trimmed = text.trim()
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

export function insertAtSelection(
  content: string,
  snippet: string,
  start: number,
  end: number,
): string {
  return content.slice(0, start) + snippet + content.slice(end)
}

export function markdownLink(label: string, url: string): string {
  const safeLabel = label.replace(/[\[\]]/g, '')
  return `[${safeLabel}](${normalizePasteUrl(url)})`
}

export function focusTextareaAt(textarea: HTMLTextAreaElement, position: number) {
  requestAnimationFrame(() => {
    textarea.focus()
    textarea.selectionStart = position
    textarea.selectionEnd = position
  })
}
