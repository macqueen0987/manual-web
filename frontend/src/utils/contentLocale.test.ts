import { describe, expect, it } from 'vitest'
import {
  isSecondaryContentLocale,
  localeDisplayLabel,
  localeToApiParam,
  secondaryContentLocale,
} from './contentLocale'
import { DEFAULT_LOCALE } from '../i18n'

describe('secondaryContentLocale', () => {
  it('returns the non-default supported locale', () => {
    const secondary = secondaryContentLocale()
    expect(secondary).not.toBe(DEFAULT_LOCALE)
    expect(['en', 'ko']).toContain(secondary)
  })
})

describe('isSecondaryContentLocale', () => {
  it('flags locales other than default', () => {
    expect(isSecondaryContentLocale(DEFAULT_LOCALE)).toBe(false)
    expect(isSecondaryContentLocale(secondaryContentLocale())).toBe(true)
  })
})

describe('localeToApiParam', () => {
  it('omits default locale for API calls', () => {
    expect(localeToApiParam(DEFAULT_LOCALE)).toBeUndefined()
    expect(localeToApiParam(secondaryContentLocale())).toBe(secondaryContentLocale())
  })
})

describe('localeDisplayLabel', () => {
  it('returns translated language names', () => {
    expect(localeDisplayLabel('ko', 'ko')).toContain('한국어')
    expect(localeDisplayLabel('en', 'en')).toContain('English')
  })
})
