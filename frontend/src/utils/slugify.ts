import { sha256Hex8 } from './sha256Hex'

/** Stable 8-char id from display name (products). */
export function slugifyProductName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return ''
  return sha256Hex8(trimmed)
}

/** Stable 8-char id from display name (versions). */
export function slugifyVersionName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return ''
  return sha256Hex8(trimmed)
}
