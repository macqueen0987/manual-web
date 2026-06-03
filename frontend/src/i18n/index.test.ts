import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  isLocale,
  localeToHrefLang,
  translate,
  withLocalePath,
} from '../i18n'

describe('translate', () => {
  it('returns localized strings and interpolates params', () => {
    expect(translate('ko', 'lang.ko')).toContain('한국어')
    expect(translate('en', 'search.resultCount', { count: 3 })).toContain('3')
  })

  it('falls back to key path when missing', () => {
    expect(translate('en', 'missing.key' as 'lang.en')).toBe('missing.key')
  })
})

describe('isLocale', () => {
  it('validates supported locales', () => {
    expect(isLocale('ko')).toBe(true)
    expect(isLocale('fr')).toBe(false)
  })
})

describe('withLocalePath', () => {
  it('returns path unchanged', () => {
    expect(withLocalePath('/docs/guide', 'ko')).toBe('/docs/guide')
  })
})

describe('localeToHrefLang', () => {
  it('maps locale codes', () => {
    expect(localeToHrefLang('ko')).toBe('ko')
    expect(localeToHrefLang('en')).toBe('en')
  })
})
