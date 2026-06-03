/** FTS snippet is raw markdown — flatten for combobox preview (UiPath-style plain text). */
export function plainSearchExcerpt(text: string, maxLen = 200): string {
  const flat = text
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()

  if (flat.length <= maxLen) return flat
  return `${flat.slice(0, maxLen).trim()}…`
}
