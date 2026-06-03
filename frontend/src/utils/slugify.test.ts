import { describe, expect, it } from 'vitest'
import { sha256Hex8 } from './sha256Hex'
import { slugifyProductName, slugifyVersionName } from './slugify'

describe('sha256Hex8', () => {
  it('matches Python hashlib for UTF-8', () => {
    expect(sha256Hex8('웹')).toBe('8779aca5')
  })
})

describe('slugifyProductName', () => {
  it('returns 8-char hex from name', () => {
    expect(slugifyProductName('웹')).toBe('8779aca5')
    expect(slugifyProductName('Blue Guard')).toBe(sha256Hex8('Blue Guard'))
  })
})

describe('slugifyVersionName', () => {
  it('returns 8-char hex from name', () => {
    expect(slugifyVersionName('작업 중')).toMatch(/^[a-f0-9]{8}$/)
  })
})
