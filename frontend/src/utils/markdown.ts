/** Plain text from a markdown heading line (strips inline markup for stable slugs). */
export function headingTextFromMarkdown(line: string): string {
  const match = /^(#{1,3})\s+(.+)$/.exec(line.trim())
  if (!match) return ''
  let text = match[2].replace(/\s+#+\s*$/, '').trim()
  text = text.replace(/`([^`]+)`/g, '$1')
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1')
  text = text.replace(/\*([^*]+)\*/g, '$1')
  text = text.replace(/__([^_]+)__/g, '$1')
  text = text.replace(/_([^_]+)_/g, '$1')
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  return text
}

export function headingToId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
}
