import { vi } from 'vitest'

export function mockLocalStorage() {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() {
      return store.size
    },
  })
}

function encodeJwtSegment(value: object): string {
  return btoa(JSON.stringify(value))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/** Build a minimal JWT string for jwt.ts tests (signature not verified). */
export function makeJwt(payload: Record<string, unknown>): string {
  const header = encodeJwtSegment({ alg: 'HS256', typ: 'JWT' })
  const body = encodeJwtSegment(payload)
  return `${header}.${body}.sig`
}
